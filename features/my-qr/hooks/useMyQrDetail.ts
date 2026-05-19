import { useState, useCallback, useRef, useEffect } from "react";
import { Alert, Platform } from "react-native";
import * as Haptics from "@/lib/haptics";
import * as Clipboard from "expo-clipboard";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { captureQrImage } from "@/lib/utils/capture-qr";
import { useAuth } from "@/contexts/AuthContext";
import {
  getGeneratedQrById, setQrActiveState,
  getQrFollowersList, getQrFollowCount,
  updateSavedQrFormValues,
  type GeneratedQrItem, type FollowerInfo,
} from "@/lib/firestore-service";
import { useQrDesign } from "./useQrDesign";
import { useQrDestination } from "./useQrDestination";
import { useOwnerComments } from "./useOwnerComments";

export { LOGO_POSITIONS } from "./useQrDesign";
export type { LogoPosition } from "./useQrDesign";

export function useMyQrDetail(id: string) {
  const { user } = useAuth();
  const svgRef = useRef<any>(null);
  const scrollRef = useRef<any>(null);

  const [qrItem, setQrItem] = useState<GeneratedQrItem | null>(null);
  const [loading, setLoading] = useState(true);

  const [togglingActive, setTogglingActive] = useState(false);

  const [followersList, setFollowersList] = useState<FollowerInfo[]>([]);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followCount, setFollowCount] = useState(0);

  const [sharingQr, setSharingQr] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);
  const [savingStructured, setSavingStructured] = useState(false);

  const design = useQrDesign(qrItem);
  const destination = useQrDestination(qrItem, setQrItem as any);
  const ownerComments = useOwnerComments(qrItem?.qrCodeId);

  const loadQr = useCallback(async () => {
    if (!user?.id) return;
    setLoading(true);
    try {
      const found = await getGeneratedQrById(user.id, id);
      if (found) {
        setQrItem(found);
        design.initDesignFromQrItem(found);
      }
    } catch {}
    setLoading(false);
  }, [user?.id, id]);

  useEffect(() => { loadQr(); }, [loadQr]);

  useEffect(() => {
    if (!qrItem?.qrCodeId) return;
    getQrFollowCount(qrItem.qrCodeId).then(setFollowCount).catch(() => {});
  }, [qrItem?.qrCodeId]);

  async function handleLoadFollowers() {
    if (!qrItem?.qrCodeId) return;
    setFollowersLoading(true);
    try {
      const list = await getQrFollowersList(qrItem.qrCodeId);
      setFollowersList(list);
    } catch {}
    setFollowersLoading(false);
  }

  function openFollowers() {
    handleLoadFollowers();
    setFollowersModalOpen(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleToggleActive(newState: boolean, deactivationMessage: string | null = null) {
    if (!user || !qrItem?.qrCodeId) return;
    if (qrItem.qrType === "government") {
      Alert.alert("Permanent QR", "Government QR codes cannot be deactivated.");
      return;
    }
    setTogglingActive(true);
    try {
      await setQrActiveState(qrItem.qrCodeId, user.id, newState, newState ? null : deactivationMessage);
      setQrItem({ ...qrItem, isActive: newState, deactivationMessage: newState ? null : deactivationMessage });
      if (newState) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      }
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not update QR code.");
    } finally {
      setTogglingActive(false);
    }
  }

  async function handleCopyContent() {
    if (qrItem?.content) {
      await Clipboard.setStringAsync(qrItem.content);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Copied!", "QR content copied to clipboard.");
    }
  }

  async function handleShare() {
    if (sharingQr) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "web") {
      Alert.alert("Not supported", "Sharing is not available on web. Long-press the QR image to save it.");
      return;
    }
    setSharingQr(true);
    try {
      const rawBase64 = await captureQrImage(svgRef);
      const fileName = `qrguard_${Date.now()}.png`;
      const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? "";
      const fileUri = dir + fileName;
      await FileSystem.writeAsStringAsync(fileUri, rawBase64, { encoding: "base64" });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        Alert.alert("Not available", "Sharing is not supported on this device.");
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        return;
      }
      await Sharing.shareAsync(fileUri, { mimeType: "image/png", dialogTitle: "Share QR Code", UTI: "public.png" });
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    } catch (e: any) {
      Alert.alert("Share Failed", e?.message || "Could not share the QR code. Please try again.");
    } finally {
      setSharingQr(false);
    }
  }

  async function saveAndroidPdf(pdfUri: string, fileName: string) {
    const SAF = FileSystem.StorageAccessFramework;
    return new Promise<void>((resolve) => {
      Alert.alert(
        "Save PDF to Downloads",
        "Do you want to save this QR code PDF to your Downloads folder?",
        [
          { text: "Cancel", style: "cancel", onPress: () => resolve() },
          {
            text: "Save",
            onPress: async () => {
              try {
                const cachedDirUri = await AsyncStorage.getItem("qrguard_downloads_dir_uri");
                if (cachedDirUri) {
                  try {
                    const base64 = await FileSystem.readAsStringAsync(pdfUri, { encoding: "base64" });
                    const destUri = await SAF.createFileAsync(cachedDirUri, fileName, "application/pdf");
                    await FileSystem.writeAsStringAsync(destUri, base64, { encoding: "base64" });
                    const { ToastAndroid } = await import("react-native");
                    ToastAndroid.show("PDF saved to Downloads ✓", ToastAndroid.LONG);
                    resolve();
                    return;
                  } catch {
                    await AsyncStorage.removeItem("qrguard_downloads_dir_uri");
                  }
                }
                const permissions = await SAF.requestDirectoryPermissionsAsync();
                if (!permissions.granted) { resolve(); return; }
                await AsyncStorage.setItem("qrguard_downloads_dir_uri", permissions.directoryUri);
                const base64 = await FileSystem.readAsStringAsync(pdfUri, { encoding: "base64" });
                const destUri = await SAF.createFileAsync(permissions.directoryUri, fileName, "application/pdf");
                await FileSystem.writeAsStringAsync(destUri, base64, { encoding: "base64" });
                const { ToastAndroid } = await import("react-native");
                ToastAndroid.show("PDF saved to Downloads ✓", ToastAndroid.LONG);
              } catch (err: any) {
                Alert.alert("Save Failed", err?.message || "Could not save the PDF.");
              }
              resolve();
            },
          },
        ],
        { cancelable: true }
      );
    });
  }

  async function handleDownloadPdf() {
    if (downloadingPdf) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "web") {
      Alert.alert("Not supported", "PDF download is not available on web.");
      return;
    }
    setDownloadingPdf(true);
    try {
      const rawBase64 = await captureQrImage(svgRef);
      const htmlContent = `<!DOCTYPE html><html><head><meta charset="utf-8"><style>body{margin:0;display:flex;align-items:center;justify-content:center;min-height:100vh;background:#fff}img{max-width:80vmin;max-height:80vmin}</style></head><body><img src="data:image/png;base64,${rawBase64}" /></body></html>`;
      const { uri: pdfUri } = await Print.printToFileAsync({ html: htmlContent, base64: false });
      const fileName = `qrguard_${Date.now()}.pdf`;
      if (Platform.OS === "android") {
        await saveAndroidPdf(pdfUri, fileName);
        await FileSystem.deleteAsync(pdfUri, { idempotent: true });
      } else {
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(pdfUri, { mimeType: "application/pdf", dialogTitle: "Save QR Code PDF", UTI: "com.adobe.pdf" });
        } else {
          Alert.alert("Not available", "PDF sharing is not supported on this device.");
        }
        await FileSystem.deleteAsync(pdfUri, { idempotent: true });
      }
    } catch (e: any) {
      Alert.alert("PDF Failed", e?.message || "Could not generate the PDF. Please try again.");
    } finally {
      setDownloadingPdf(false);
    }
  }

  async function handleUpdateFormValues(
    newContent: string,
    newFormValues: { value: string; extra: Record<string, string> }
  ) {
    if (!user?.id || !id) return;
    setSavingStructured(true);
    try {
      await updateSavedQrFormValues(user.id, id, newContent, newFormValues);
      setQrItem(prev =>
        prev ? { ...prev, content: newContent, formValues: newFormValues } as any : null
      );
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not save changes.");
      throw e;
    } finally {
      setSavingStructured(false);
    }
  }

  return {
    user, svgRef, scrollRef, qrItem, loading,
    ...design,
    togglingActive,
    followersList, followersModalOpen, setFollowersModalOpen,
    followersLoading, followCount, openFollowers,
    sharingQr, downloadingPdf,
    ...destination,
    ...ownerComments,
    handleToggleActive,
    handleCopyContent, handleShare, handleDownloadPdf,
    savingStructured, handleUpdateFormValues,
  };
}
