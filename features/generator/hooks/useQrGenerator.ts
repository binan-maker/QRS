import { useState, useRef } from "react";
import { Alert, Animated, Platform } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import { useAuth } from "@/contexts/AuthContext";
import { saveGeneratedQr, saveGuardLink, type QrType } from "@/lib/firestore-service";
import { getApiUrl } from "@/lib/query-client";
import { QR_PRESETS } from "@/features/generator/data/presets";
import { buildQrContent, getRawContent, filterByKeyboardType, validateQrInput } from "@/features/generator/data/qr-builder";

export type LogoPosition = "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

export const LOGO_POSITIONS: { key: LogoPosition; label: string }[] = [
  { key: "center", label: "Center" },
  { key: "top-left", label: "Top Left" },
  { key: "top-right", label: "Top Right" },
  { key: "bottom-left", label: "Bot. Left" },
  { key: "bottom-right", label: "Bot. Right" },
];

function getFirestoreContentType(presetIdx: number): string {
  return QR_PRESETS[presetIdx]?.contentType ?? "text";
}

export function useQrGenerator() {
  const { user } = useAuth();
  const svgRef = useRef<any>(null);

  const [selectedPreset, setSelectedPreset] = useState(0);
  const [inputValue, setInputValue] = useState("");
  const [extraFields, setExtraFields] = useState<Record<string, string>>({});
  const [qrValue, setQrValue] = useState("");
  const [qrMode, setQrMode] = useState<"individual" | "business" | "private">("individual");
  const [businessName, setBusinessName] = useState("");
  const [customLogoUri, setCustomLogoUri] = useState<string | null>(null);
  const [customLogoBase64, setCustomLogoBase64] = useState<string | null>(null);
  const [showDefaultLogo, setShowDefaultLogo] = useState(false);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>("center");
  const [generatedUuid, setGeneratedUuid] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [positionModalOpen, setPositionModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedToProfile, setSavedToProfile] = useState(false);

  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const preset = QR_PRESETS[selectedPreset];
  const privateMode = qrMode === "private";
  const isBranded = !!user && !privateMode;

  function showToast(msg: string, type: "success" | "error" = "success") {
    if (toastTimer.current) clearTimeout(toastTimer.current);
    setToastMsg(msg);
    setToastType(type);
    Animated.sequence([
      Animated.timing(toastAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(1800),
      Animated.timing(toastAnim, { toValue: 0, duration: 220, useNativeDriver: true }),
    ]).start();
    toastTimer.current = setTimeout(() => setToastMsg(""), 2400);
  }

  function setExtraField(key: string, val: string) {
    setExtraFields((prev) => ({ ...prev, [key]: val }));
  }

  function switchPreset(idx: number) {
    setSelectedPreset(idx);
    setInputValue("");
    setExtraFields({});
    setQrValue("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleGenerate() {
    if (qrMode === "business" && isBranded) {
      const v = inputValue.trim();
      if (!v) { showToast("Please enter a destination URL.", "error"); return; }
      const withScheme = v.startsWith("http") ? v : `https://${v}`;
      try {
        const url = new URL(withScheme);
        if (!url.hostname.includes(".") || url.hostname.length < 4) {
          showToast("Please enter a valid URL for the business QR.", "error"); return;
        }
      } catch {
        showToast("Please enter a valid URL for the business QR.", "error"); return;
      }
    } else {
      const error = validateQrInput(selectedPreset, inputValue, extraFields);
      if (error) {
        showToast(error, "error");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    }

    const builtContent = qrMode === "business" && isBranded
      ? (inputValue.trim().startsWith("http") ? inputValue.trim() : `https://${inputValue.trim()}`)
      : buildQrContent(selectedPreset, inputValue, extraFields);

    const uuid = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, builtContent + Date.now());
    const shortUuid = uuid.slice(0, 16).toUpperCase().match(/.{1,4}/g)?.join("-") || uuid.slice(0, 16);
    const isBusinessMode = qrMode === "business" && isBranded && !!user;

    let encodedValue = builtContent;
    if (isBusinessMode) {
      const base = getApiUrl().replace(/\/$/, "");
      encodedValue = `${base}/guard/${shortUuid}`;
    }

    setQrValue(encodedValue);
    setGeneratedUuid(isBranded ? shortUuid : null);
    setGeneratedAt(new Date());
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    if (isBranded && user) {
      setSaving(true);
      setSavedToProfile(false);
      try {
        const qt: QrType = qrMode === "business" ? "business" : "individual";
        const logoToStore = qrMode === "business" && customLogoBase64 ? customLogoBase64 : null;
        const bName = qrMode === "business" ? (businessName.trim() || null) : null;
        if (isBusinessMode) {
          await saveGuardLink(shortUuid, builtContent, bName, user.displayName, user.id);
        }
        await saveGeneratedQr(
          user.id, user.displayName, encodedValue,
          getFirestoreContentType(selectedPreset),
          shortUuid, true, qt, bName, logoToStore,
          isBusinessMode ? shortUuid : null
        );
        setSavedToProfile(true);
        setTimeout(() => setSavedToProfile(false), 4000);
      } catch (err: any) {
        showToast(err?.message || "Could not save QR code. Please try again.", "error");
      }
      setSaving(false);
    }
  }

  async function handlePickCustomLogo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { showToast("Gallery permission is required.", "error"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.3, base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      setCustomLogoUri(result.assets[0].uri);
      setShowDefaultLogo(false);
      if (result.assets[0].base64) {
        setCustomLogoBase64(`data:image/jpeg;base64,${result.assets[0].base64}`);
      } else {
        setCustomLogoBase64(null);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  function handleRemoveLogo() {
    setCustomLogoUri(null);
    setCustomLogoBase64(null);
    setShowDefaultLogo(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleToggleDefaultLogo() {
    setShowDefaultLogo((prev) => !prev);
    if (customLogoUri) {
      setCustomLogoUri(null);
      setCustomLogoBase64(null);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleCopy() {
    if (!qrValue) return;
    const rawContent = qrMode === "business" && isBranded
      ? inputValue.trim()
      : getRawContent(selectedPreset, inputValue, extraFields);
    await Clipboard.setStringAsync(rawContent || qrValue);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    showToast("Copied to clipboard!", "success");
  }

  async function handleShare() {
    if (!qrValue || !svgRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "web") {
      showToast("Download the QR image by long-pressing it.", "success");
      return;
    }
    svgRef.current.toDataURL(async (dataUrl: string) => {
      try {
        const rawBase64 = dataUrl.includes(",") ? dataUrl.split(",")[1] : dataUrl;
        const fileName = `qrguard_${Date.now()}.png`;
        const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? "";
        const fileUri = dir + fileName;
        await FileSystem.writeAsStringAsync(fileUri, rawBase64, { encoding: FileSystem.EncodingType.Base64 });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(fileUri, { mimeType: "image/png", dialogTitle: "Share QR Code", UTI: "public.png" });
        } else {
          showToast("Sharing is not available on this device.", "error");
        }
      } catch {
        showToast("Could not share the QR code.", "error");
      }
    });
  }

  async function handleDownloadPdf() {
    if (!qrValue || !svgRef.current) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "web") {
      showToast("PDF download is not supported on web.", "error");
      return;
    }
    svgRef.current.toDataURL(async (dataUrl: string) => {
      try {
        const html = `<!DOCTYPE html>
<html>
  <head>
    <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body { display: flex; justify-content: center; align-items: center; min-height: 100vh; background: #ffffff; font-family: Arial, sans-serif; }
      .container { text-align: center; padding: 40px; }
      img { width: 280px; height: 280px; display: block; margin: 0 auto; }
      .title { margin-top: 20px; font-size: 14px; color: #444; }
      .footer { margin-top: 8px; font-size: 11px; color: #999; }
    </style>
  </head>
  <body>
    <div class="container">
      <img src="${dataUrl}" />
      <p class="title">QR Code</p>
      <p class="footer">Generated by QR Guard</p>
    </div>
  </body>
</html>`;
        const { uri } = await Print.printToFileAsync({ html, base64: false });
        const canShare = await Sharing.isAvailableAsync();
        if (canShare) {
          await Sharing.shareAsync(uri, {
            mimeType: "application/pdf",
            dialogTitle: "Download QR Code as PDF",
            UTI: ".pdf",
          });
        } else {
          showToast("Could not save PDF on this device.", "error");
        }
      } catch {
        showToast("Could not generate PDF.", "error");
      }
    });
  }

  function handleClear() {
    setInputValue("");
    setExtraFields({});
    setQrValue("");
    setGeneratedUuid(null);
    setGeneratedAt(null);
    setCustomLogoUri(null);
    setCustomLogoBase64(null);
    setShowDefaultLogo(false);
    setLogoPosition("center");
    setSavedToProfile(false);
    setBusinessName("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return {
    user,
    svgRef,
    selectedPreset,
    inputValue,
    setInputValue,
    extraFields,
    setExtraField,
    qrValue,
    qrMode,
    setQrMode,
    businessName,
    setBusinessName,
    customLogoUri,
    customLogoBase64,
    showDefaultLogo,
    logoPosition,
    setLogoPosition,
    generatedUuid,
    generatedAt,
    infoModalOpen,
    setInfoModalOpen,
    positionModalOpen,
    setPositionModalOpen,
    saving,
    savedToProfile,
    toastMsg,
    toastType,
    toastAnim,
    preset,
    privateMode,
    isBranded,
    switchPreset,
    handleGenerate,
    handlePickCustomLogo,
    handleRemoveLogo,
    handleToggleDefaultLogo,
    handleCopy,
    handleShare,
    handleDownloadPdf,
    handleClear,
    showToast,
    filterByKeyboardType,
  };
}
