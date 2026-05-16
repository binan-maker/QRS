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
  type GeneratedQrItem, type FollowerInfo,
} from "@/lib/firestore-service";
import { useQrDesign } from "./useQrDesign";
import { useQrDestination } from "./useQrDestination";
import { useOwnerComments } from "./useOwnerComments";

export { FG_COLORS, BG_COLORS, LOGO_POSITIONS } from "./useQrDesign";
export type { LogoPosition } from "./useQrDesign";

export function useMyQrDetail(id: string) {
  const { user } = useAuth();
  const svgRef = useRef<any>(null);
  const scrollRef = useRef<any>(null);

  const [qrItem, setQrItem] = useState<GeneratedQrItem | null>(null);
  const [loading, setLoading] = useState(true);

  const [togglingActive, setTogglingActive] = useState(false);
  const [deactivateModalOpen, setDeactivateModalOpen] = useState(false);
  const [deactivationMsgInput, setDeactivationMsgInput] = useState("");

  const [followersList, setFollowersList] = useState<FollowerInfo[]>([]);
  const [followersModalOpen, setFollowersModalOpen] = useState(false);
  const [followersLoading, setFollowersLoading] = useState(false);
  const [followCount, setFollowCount] = useState(0);

  const [sharingQr, setSharingQr] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

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

  async function handleToggleActive(newState: boolean) {
    if (!user || !qrItem?.qrCodeId) return;
    if (qrItem.qrType === "government") {
      Alert.alert("Permanent QR", "Government QR codes cannot be deactivated.");
      return;
    }
    if (!newState) {
      setDeactivationMsgInput(qrItem.deactivationMessage || "");
      setDeactivateModalOpen(true);
      return;
    }
    setTogglingActive(true);
    try {
      await setQrActiveState(qrItem.qrCodeId, user.id, true, null);
      setQrItem({ ...qrItem, isActive: true, deactivationMessage: null });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      Alert.alert("Error", e?.message || "Could not update QR code.");
    } finally {
      setTogglingActive(false);
    }
  }

  async function handleConfirmDeactivate() {
    if (!user || !qrItem?.qrCodeId) return;
    setDeactivateModalOpen(false);
    setTogglingActive(true);
    try {
      await setQrActiveState(qrItem.qrCodeId, user.id, false, deactivationMsgInput.trim() || null);
      setQrItem({ ...qrItem, isActive: false, deactivationMessage: deactivationMsgInput.trim() || null });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
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
                const downloadsUri = SAF.getUriForDirectoryInRoot("Download");
                const permissions = await SAF.requestDirectoryPermissionsAsync(downloadsUri);
                if (!permissions.granted) {
                  Alert.alert("Permission denied", "PDF was not saved. Please try again and allow access to Downloads.");
                  resolve();
                  return;
                }
                await AsyncStorage.setItem("qrguard_downloads_dir_uri", permissions.directoryUri);
                const base64 = await FileSystem.readAsStringAsync(pdfUri, { encoding: "base64" });
                const destUri = await SAF.createFileAsync(permissions.directoryUri, fileName, "application/pdf");
                await FileSystem.writeAsStringAsync(destUri, base64, { encoding: "base64" });
                const { ToastAndroid } = await import("react-native");
                ToastAndroid.show("PDF saved to Downloads ✓", ToastAndroid.LONG);
                resolve();
              } catch (e: any) {
                Alert.alert("Save Failed", e?.message || "Could not save PDF to Downloads. Please try again.");
                resolve();
              }
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
      Alert.alert("Not supported", "PDF download is not available on web. Long-press the QR image to save it.");
      return;
    }
    setDownloadingPdf(true);
    let pdfUri: string | null = null;
    try {
      const rawBase64 = await captureQrImage(svgRef);
      const dataUrl = rawBase64;
      const imgSrc = dataUrl.startsWith("data:") ? dataUrl : `data:image/png;base64,${dataUrl}`;
      const rawLabel = (() => {
        const item = qrItem as any;
        if (item?.businessName) return item.businessName;
        if (item?.label) return item.label;
        if (item?.displayDestination) return item.displayDestination;
        const c = item?.content || "";
        try {
          const u = new URL(c);
          const h = u.hostname.replace(/^www\./, "");
          if (h && !/^(192\.168\.|10\.|127\.|localhost)/.test(h) && !u.pathname.startsWith("/guard/")) return h;
        } catch {}
        return c || "QR Code";
      })();
      const label = rawLabel.length > 60 ? rawLabel.slice(0, 57) + "…" : rawLabel;
      const createdStr = qrItem?.createdAt
        ? new Date(qrItem.createdAt).toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })
        : "";
      const html = `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #ffffff; font-family: Arial, sans-serif; }
      .container { text-align: center; padding: 48px 40px; max-width: 420px; }
      .logo-row { display: flex; align-items: center; justify-content: center; gap: 8px; margin-bottom: 28px; }
      .logo-text { font-size: 15px; font-weight: 700; color: #0A0E17; letter-spacing: 0.5px; }
      .qr-wrap { background: #f8fafc; border-radius: 20px; padding: 24px; display: inline-block; border: 1px solid #e2e8f0; margin-bottom: 24px; }
      img { width: 240px; height: 240px; display: block; }
      .label { font-size: 13px; color: #64748b; word-break: break-all; max-width: 300px; margin: 0 auto 6px; line-height: 1.5; }
      .date { font-size: 11px; color: #94a3b8; margin-top: 4px; }
      .footer { margin-top: 28px; font-size: 10px; color: #cbd5e1; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="logo-row"><span class="logo-text">QR Guard</span></div>
      <div class="qr-wrap"><img src="${imgSrc}" alt="QR Code" /></div>
      <p class="label">${label}</p>
      ${createdStr ? `<p class="date">Created ${createdStr}</p>` : ""}
      <p class="footer">Generated by QR Guard &bull; Scan to verify safety</p>
    </div>
  </body>
</html>`;
      const result = await Print.printToFileAsync({ html, base64: false });
      pdfUri = result.uri;
      if (Platform.OS === "android") {
        await saveAndroidPdf(pdfUri, `QRGuard_${Date.now()}.pdf`);
      } else {
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) { Alert.alert("Not available", "Could not save PDF on this device."); return; }
        await Sharing.shareAsync(pdfUri, { mimeType: "application/pdf", dialogTitle: "Save QR Code as PDF", UTI: "com.adobe.pdf" });
      }
    } catch (e: any) {
      Alert.alert("PDF Failed", e?.message || "Could not generate the PDF. Please try again.");
    } finally {
      if (pdfUri) FileSystem.deleteAsync(pdfUri, { idempotent: true }).catch(() => {});
      setDownloadingPdf(false);
    }
  }

  return {
    user, svgRef, scrollRef,
    qrItem, loading,

    ...design,

    ...destination,

    ...ownerComments,
    commentInputRef: ownerComments.commentInputRef,

    togglingActive, deactivateModalOpen, setDeactivateModalOpen,
    deactivationMsgInput, setDeactivationMsgInput,

    followersList, followersModalOpen, setFollowersModalOpen,
    followersLoading, followCount,

    sharingQr, downloadingPdf,

    handleToggleActive, handleConfirmDeactivate, handleCopyContent,
    handleShare, handleDownloadPdf,
    handleLoadFollowers, openFollowers,
  };
}
