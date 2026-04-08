import { useState, useRef, useEffect } from "react";
import { Alert, Animated, Platform, ToastAndroid } from "react-native";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/lib/haptics";
import * as ImagePicker from "expo-image-picker";
import * as Crypto from "expo-crypto";
import * as FileSystem from "expo-file-system/legacy";
import * as Sharing from "expo-sharing";
import * as Print from "expo-print";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { captureQrImage } from "@/lib/capture-qr";
import { useAuth } from "@/contexts/AuthContext";
import { saveGeneratedQr, saveGuardLink, type QrType } from "@/lib/firestore-service";
import { getApiUrl } from "@/lib/query-client";
import { QR_PRESETS } from "@/features/generator/data/presets";
import { buildQrContent, getRawContent, filterByKeyboardType, validateQrInput } from "@/features/generator/data/qr-builder";
import { type BusinessCategory } from "@/features/generator/components/BusinessTypeSelector";
import { QR_COLOR_THEMES } from "@/features/generator/components/QrThemeSection";
import { type AdvancedSettings, resolveExpiryDate } from "@/features/generator/components/AdvancedSettingsPanel";

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
  const [businessCategory, setBusinessCategory] = useState<BusinessCategory>("website");
  const [customLogoUri, setCustomLogoUri] = useState<string | null>(null);
  const [customLogoBase64, setCustomLogoBase64] = useState<string | null>(null);
  const [showDefaultLogo, setShowDefaultLogo] = useState(false);
  const [logoPosition, setLogoPosition] = useState<LogoPosition>("center");
  const [selectedThemeIdx, setSelectedThemeIdx] = useState(0);
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
    scanLimit: null,
    expiryPreset: "never",
    expiryCustomDate: "",
    label: "",
  });
  const [generatedUuid, setGeneratedUuid] = useState<string | null>(null);
  const [generatedAt, setGeneratedAt] = useState<Date | null>(null);
  const [infoModalOpen, setInfoModalOpen] = useState(false);
  const [positionModalOpen, setPositionModalOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedToProfile, setSavedToProfile] = useState(false);
  const [savedDocId, setSavedDocId] = useState<string | null>(null);
  const [sharingQr, setSharingQr] = useState(false);
  const [downloadingPdf, setDownloadingPdf] = useState(false);

  const [toastMsg, setToastMsg] = useState("");
  const [toastType, setToastType] = useState<"success" | "error">("success");
  const toastAnim = useRef(new Animated.Value(0)).current;
  const toastTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [customFgColor, setCustomFgColor] = useState("#0A0E17");
  const [customBgColor, setCustomBgColor] = useState("#FFFFFF");

  const preset = QR_PRESETS[selectedPreset];
  const privateMode = qrMode === "private";
  const isBranded = !!user && !privateMode;
  const isCustomTheme = selectedThemeIdx === QR_COLOR_THEMES.length;
  const activeTheme = isCustomTheme ? null : (QR_COLOR_THEMES[selectedThemeIdx] ?? QR_COLOR_THEMES[0]);
  const qrFgColor = isCustomTheme ? customFgColor : (activeTheme?.fg ?? "#0A0E17");
  const qrBgColor = isCustomTheme ? customBgColor : (activeTheme?.bg ?? "#F8FAFC");

  useEffect(() => {
    const timer = setTimeout(() => {
      if (!inputValue.trim()) {
        setQrValue("");
        setGeneratedUuid(null);
        setGeneratedAt(null);
        return;
      }

      if (qrMode === "business" && isBranded) {
        const v = inputValue.trim();
        let dest: string | null = null;
        switch (businessCategory) {
          case "website": {
            if (!v) break;
            dest = v.startsWith("http") ? v : `https://${v}`;
            break;
          }
          case "whatsapp": {
            if (!v) break;
            const phone = v.replace(/[\s\-()]/g, "").replace(/^\+/, "");
            const msg = extraFields.message?.trim() || "";
            dest = msg ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/${phone}`;
            break;
          }
          case "upi": {
            if (!v) break;
            const params = new URLSearchParams({ pa: v, cu: "INR" });
            const upiName = extraFields.name?.trim();
            const upiAmount = extraFields.amount?.trim();
            const upiNote = extraFields.note?.trim();
            if (upiName) params.set("pn", upiName);
            if (upiAmount) params.set("am", upiAmount);
            if (upiNote) params.set("tn", upiNote);
            dest = `upi://pay?${params.toString()}`;
            break;
          }
          case "wifi": {
            if (!v) break;
            const security = extraFields.security?.trim() || "WPA";
            const password = extraFields.password?.trim() || "";
            const secType = security === "Open" ? "nopass" : security;
            dest = `WIFI:T:${secType};S:${v};P:${password};;`;
            break;
          }
          case "event": {
            if (!v) break;
            const dateStr = extraFields.date?.trim() || "";
            const startH = String(extraFields.startHour ?? "9").padStart(2, "0");
            const startM = String(extraFields.startMin ?? "0").padStart(2, "0");
            const endH = String(extraFields.endHour ?? "10").padStart(2, "0");
            const endM = String(extraFields.endMin ?? "0").padStart(2, "0");
            const location = extraFields.location?.trim() || "";
            if (dateStr) {
              const d = dateStr.replace(/-/g, "");
              const dtStart = `${d}T${startH}${startM}00`;
              const dtEnd = `${d}T${endH}${endM}00`;
              const lines = [
                "BEGIN:VCALENDAR",
                "VERSION:2.0",
                "BEGIN:VEVENT",
                `SUMMARY:${v}`,
                `DTSTART:${dtStart}`,
                `DTEND:${dtEnd}`,
                location ? `LOCATION:${location}` : "",
                "END:VEVENT",
                "END:VCALENDAR",
              ].filter(Boolean);
              dest = lines.join("\r\n");
            } else {
              dest = `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(v)}`;
            }
            break;
          }
          case "phone": {
            if (!v) break;
            const cleaned = v.replace(/[\s\-()]/g, "");
            dest = `tel:${cleaned}`;
            break;
          }
          default:
            if (v) dest = v.startsWith("http") ? v : `https://${v}`;
        }
        if (dest) {
          setQrValue(dest);
          setGeneratedAt(new Date());
        } else {
          setQrValue("");
        }
        return;
      }

      const error = validateQrInput(selectedPreset, inputValue, extraFields);
      if (error) return;

      const builtContent = buildQrContent(selectedPreset, inputValue, extraFields);
      if (builtContent) {
        setQrValue(builtContent);
        setGeneratedUuid(null);
        setGeneratedAt(new Date());
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [inputValue, extraFields, selectedPreset, qrMode, businessCategory, isBranded]);

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

  function switchBusinessCategory(cat: BusinessCategory) {
    setBusinessCategory(cat);
    setInputValue("");
    setExtraFields({});
    setQrValue("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function buildBusinessDestination(): string | null {
    const v = inputValue.trim();
    if (!v) return null;
    switch (businessCategory) {
      case "website":
        return v.startsWith("http") ? v : `https://${v}`;
      case "whatsapp": {
        const phone = v.replace(/[\s\-()]/g, "").replace(/^\+/, "");
        const msg = extraFields.message?.trim() || "";
        return msg ? `https://wa.me/${phone}?text=${encodeURIComponent(msg)}` : `https://wa.me/${phone}`;
      }
      case "upi": {
        const params = new URLSearchParams({ pa: v, cu: "INR" });
        const name = extraFields.name?.trim();
        const amount = extraFields.amount?.trim();
        const note = extraFields.note?.trim();
        if (name) params.set("pn", name);
        if (amount) params.set("am", amount);
        if (note) params.set("tn", note);
        return `upi://pay?${params.toString()}`;
      }
      case "wifi": {
        const security = extraFields.security?.trim() || "WPA";
        const password = extraFields.password?.trim() || "";
        const secType = security === "Open" ? "nopass" : security;
        return `WIFI:T:${secType};S:${v};P:${password};;`;
      }
      case "event": {
        const dateStr = extraFields.date?.trim() || "";
        const startH = String(extraFields.startHour ?? "9").padStart(2, "0");
        const startM = String(extraFields.startMin ?? "0").padStart(2, "0");
        const endH = String(extraFields.endHour ?? "10").padStart(2, "0");
        const endM = String(extraFields.endMin ?? "0").padStart(2, "0");
        const location = extraFields.location?.trim() || "";
        if (dateStr) {
          const d = dateStr.replace(/-/g, "");
          const lines = [
            "BEGIN:VCALENDAR", "VERSION:2.0", "BEGIN:VEVENT",
            `SUMMARY:${v}`,
            `DTSTART:${d}T${startH}${startM}00`,
            `DTEND:${d}T${endH}${endM}00`,
            location ? `LOCATION:${location}` : "",
            "END:VEVENT", "END:VCALENDAR",
          ].filter(Boolean);
          return lines.join("\r\n");
        }
        return `https://calendar.google.com/calendar/r/eventedit?text=${encodeURIComponent(v)}`;
      }
      case "phone": {
        const cleaned = v.replace(/[\s\-()]/g, "");
        return `tel:${cleaned}`;
      }
      default:
        return v.startsWith("http") ? v : `https://${v}`;
    }
  }

  function validateBusinessInput(): string | null {
    const v = inputValue.trim();
    if (!v) return "Please fill in the required field.";
    if (businessCategory === "whatsapp" || businessCategory === "phone") {
      const clean = v.replace(/[\s\-()]/g, "");
      if (!/^\+?\d{7,15}$/.test(clean)) return "Please enter a valid phone number with country code (e.g. +91 9876543210).";
      return null;
    }
    if (businessCategory === "upi") {
      if (!/^[\w.\-+]+@[\w]+$/.test(v) && !/^\d{10,12}@/.test(v)) {
        return "Please enter a valid UPI ID (e.g. name@upi or 9876543210@paytm).";
      }
      return null;
    }
    if (businessCategory === "wifi") return null;
    if (businessCategory === "event") return null;
    if (businessCategory === "phone") return null;
    const withScheme = v.startsWith("http") ? v : `https://${v}`;
    try {
      const url = new URL(withScheme);
      if (!url.hostname.includes(".") || url.hostname.length < 4) return "Please enter a valid URL.";
    } catch {
      return "Please enter a valid URL.";
    }
    return null;
  }

  async function handleGenerate() {
    if (qrMode === "business" && isBranded) {
      const err = validateBusinessInput();
      if (err) { showToast(err, "error"); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error); return; }
    } else {
      const error = validateQrInput(selectedPreset, inputValue, extraFields);
      if (error) {
        showToast(error, "error");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        return;
      }
    }

    const builtContent = qrMode === "business" && isBranded
      ? (buildBusinessDestination() ?? "")
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
      setSavedDocId(null);
      try {
        const qt: QrType = qrMode === "business" ? "business" : "individual";
        const logoToStore = qrMode === "business" && customLogoBase64 ? customLogoBase64 : null;
        const bName = qrMode === "business" ? (businessName.trim() || null) : null;
        if (isBusinessMode) {
          await saveGuardLink(shortUuid, builtContent, bName, user.displayName, user.id);
        }
        const expiryDate = resolveExpiryDate(advancedSettings.expiryPreset, advancedSettings.expiryCustomDate);
        const docId = await saveGeneratedQr(
          user.id, user.displayName, encodedValue,
          getFirestoreContentType(selectedPreset),
          shortUuid, true, qt, bName, logoToStore,
          isBusinessMode ? shortUuid : null,
          {
            fgColor: qrFgColor,
            bgColor: qrBgColor,
            scanLimit: advancedSettings.scanLimit,
            expiryDate,
            label: advancedSettings.label.trim() || null,
          }
        );
        setSavedDocId(docId);
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
    if (!qrValue || sharingQr) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "web") {
      showToast("Long-press the QR image to save it.", "success");
      return;
    }
    setSharingQr(true);
    try {
      const rawBase64 = await captureQrImage(svgRef);
      const fileName = `qrguard_${Date.now()}.png`;
      const dir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? "";
      const fileUri = dir + fileName;
      // Use string literal 'base64' — FileSystem.EncodingType is a TS-only
      // type in expo-file-system v19 and evaluates to undefined at runtime.
      await FileSystem.writeAsStringAsync(fileUri, rawBase64, { encoding: "base64" });
      const canShare = await Sharing.isAvailableAsync();
      if (!canShare) {
        showToast("Sharing is not available on this device.", "error");
        await FileSystem.deleteAsync(fileUri, { idempotent: true });
        return;
      }
      await Sharing.shareAsync(fileUri, { mimeType: "image/png", dialogTitle: "Share QR Code", UTI: "public.png" });
      await FileSystem.deleteAsync(fileUri, { idempotent: true });
    } catch (e: any) {
      showToast(e?.message || "Could not share the QR code.", "error");
    } finally {
      setSharingQr(false);
    }
  }

  async function handleDownloadPdf() {
    if (!qrValue || downloadingPdf) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (Platform.OS === "web") {
      showToast("PDF download is not supported on web.", "error");
      return;
    }
    setDownloadingPdf(true);
    let pdfUri: string | null = null;
    try {
      const rawBase64 = await captureQrImage(svgRef);
      const imgSrc = `data:image/png;base64,${rawBase64}`;
      const contentLabel = qrMode === "business" && inputValue.trim()
        ? (inputValue.trim().length > 60 ? inputValue.trim().slice(0, 57) + "…" : inputValue.trim())
        : (qrValue.length > 60 ? qrValue.slice(0, 57) + "…" : qrValue);
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
      .footer { margin-top: 28px; font-size: 10px; color: #cbd5e1; }
    </style>
  </head>
  <body>
    <div class="container">
      <div class="logo-row">
        <span class="logo-text">QR Guard</span>
      </div>
      <div class="qr-wrap">
        <img src="${imgSrc}" alt="QR Code" />
      </div>
      <p class="label">${contentLabel}</p>
      <p class="footer">Generated by QR Guard &bull; Scan to verify safety</p>
    </div>
  </body>
</html>`;
      const result = await Print.printToFileAsync({ html, base64: false });
      pdfUri = result.uri;

      if (Platform.OS === "android") {
        await saveAndroidPdf(pdfUri, `QRGuard_${Date.now()}.pdf`);
      } else {
        // iOS — share sheet is the standard "Save to Files" flow
        const canShare = await Sharing.isAvailableAsync();
        if (!canShare) { showToast("Could not save PDF on this device.", "error"); return; }
        await Sharing.shareAsync(pdfUri, { mimeType: "application/pdf", dialogTitle: "Save QR Code as PDF", UTI: "com.adobe.pdf" });
      }
    } catch (e: any) {
      showToast(e?.message || "Could not generate PDF.", "error");
    } finally {
      if (pdfUri) {
        FileSystem.deleteAsync(pdfUri, { idempotent: true }).catch(() => {});
      }
      setDownloadingPdf(false);
    }
  }

  async function saveAndroidPdf(pdfUri: string, fileName: string) {
    const SAF = FileSystem.StorageAccessFramework;
    console.log("[PDF] saveAndroidPdf called — pdfUri:", pdfUri, "fileName:", fileName);
    console.log("[PDF] StorageAccessFramework available:", !!SAF);

    return new Promise<void>((resolve) => {
      Alert.alert(
        "Save PDF to Downloads",
        "Do you want to save this QR code PDF to your Downloads folder?",
        [
          {
            text: "Cancel",
            style: "cancel",
            onPress: () => {
              console.log("[PDF] User cancelled save dialog");
              resolve();
            },
          },
          {
            text: "Save",
            onPress: async () => {
              try {
                // Try cached permission URI first — fully silent for repeat saves
                const cachedDirUri = await AsyncStorage.getItem("qrguard_downloads_dir_uri");
                console.log("[PDF] Cached dir URI:", cachedDirUri);

                if (cachedDirUri) {
                  try {
                    console.log("[PDF] Trying cached URI...");
                    const base64 = await FileSystem.readAsStringAsync(pdfUri, { encoding: "base64" });
                    const destUri = await SAF.createFileAsync(cachedDirUri, fileName, "application/pdf");
                    await FileSystem.writeAsStringAsync(destUri, base64, { encoding: "base64" });
                    console.log("[PDF] Saved via cached URI successfully");
                    ToastAndroid.show("PDF saved to Downloads ✓", ToastAndroid.LONG);
                    resolve();
                    return;
                  } catch (cacheErr: any) {
                    console.warn("[PDF] Cached URI failed, clearing:", cacheErr?.message);
                    await AsyncStorage.removeItem("qrguard_downloads_dir_uri");
                  }
                }

                // No cached permission — open SAF pre-navigated to the Downloads folder.
                // getUriForDirectoryInRoot("Download") returns the Downloads content URI so
                // the picker opens directly there; user just taps "Allow" (one tap, once only).
                const downloadsUri = SAF.getUriForDirectoryInRoot("Download");
                console.log("[PDF] Requesting SAF permission, initial URI:", downloadsUri);
                const permissions = await SAF.requestDirectoryPermissionsAsync(downloadsUri);
                console.log("[PDF] SAF permissions result:", JSON.stringify(permissions));

                if (!permissions.granted) {
                  console.warn("[PDF] SAF permission denied");
                  showToast("Permission denied. PDF was not saved.", "error");
                  resolve();
                  return;
                }

                await AsyncStorage.setItem("qrguard_downloads_dir_uri", permissions.directoryUri);
                console.log("[PDF] Permission granted, dir URI:", permissions.directoryUri);

                const base64 = await FileSystem.readAsStringAsync(pdfUri, { encoding: "base64" });
                const destUri = await SAF.createFileAsync(permissions.directoryUri, fileName, "application/pdf");
                await FileSystem.writeAsStringAsync(destUri, base64, { encoding: "base64" });
                console.log("[PDF] Saved successfully via new SAF permission");
                ToastAndroid.show("PDF saved to Downloads ✓", ToastAndroid.LONG);
                resolve();
              } catch (e: any) {
                console.error("[PDF] Save failed:", e?.message, e);
                showToast(e?.message || "Could not save PDF to Downloads.", "error");
                resolve();
              }
            },
          },
        ],
        { cancelable: true }
      );
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
    setSavedDocId(null);
    setBusinessName("");
    setBusinessCategory("website");
    setSelectedThemeIdx(0);
    setCustomFgColor("#0A0E17");
    setCustomBgColor("#FFFFFF");
    setAdvancedSettings({ scanLimit: null, expiryPreset: "never", expiryCustomDate: "", label: "" });
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
    businessCategory,
    switchBusinessCategory,
    customLogoUri,
    customLogoBase64,
    showDefaultLogo,
    logoPosition,
    setLogoPosition,
    selectedThemeIdx,
    setSelectedThemeIdx,
    isCustomTheme,
    customFgColor,
    customBgColor,
    setCustomFgColor,
    setCustomBgColor,
    advancedSettings,
    setAdvancedSettings,
    qrFgColor,
    qrBgColor,
    generatedUuid,
    generatedAt,
    infoModalOpen,
    setInfoModalOpen,
    positionModalOpen,
    setPositionModalOpen,
    saving,
    savedToProfile,
    savedDocId,
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
    sharingQr,
    downloadingPdf,
  };
}
