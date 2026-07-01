import { useState } from "react";
import { Alert } from "react-native";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "@/shared/utils/haptics";
import { updateQrDesign, type GeneratedQrItem } from "@/lib/firestore-service";
import { useAuth } from "@/shared/contexts/AuthContext";
import { QR_COLOR_THEMES } from "@/features/generator/components/QrThemeSection";
import {
  resolveExpiryDate,
  type ExpiryPreset,
} from "@/features/generator/components/AdvancedSettingsPanel";

export type LogoPosition = "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";
export type { ExpiryPreset };

export const LOGO_POSITIONS: { key: LogoPosition; label: string }[] = [
  { key: "center",       label: "Center"     },
  { key: "top-left",     label: "Top Left"   },
  { key: "top-right",    label: "Top Right"  },
  { key: "bottom-left",  label: "Bot. Left"  },
  { key: "bottom-right", label: "Bot. Right" },
];

export function useQrDesign(qrItem: GeneratedQrItem | null) {
  const { user } = useAuth();

  const [fgColor, setFgColor] = useState("#0A0E17");
  const [bgColor, setBgColor] = useState("#F8FAFC");

  const [selectedThemeIdx, setSelectedThemeIdx] = useState(0);
  const [isCustomTheme,    setIsCustomTheme]    = useState(false);
  const [customFgColor,    setCustomFgColor]    = useState("#0A0E17");
  const [customBgColor,    setCustomBgColor]    = useState("#F8FAFC");

  const [logoPosition,      setLogoPosition]      = useState<LogoPosition>("center");
  const [customLogoUri,     setCustomLogoUri]     = useState<string | null>(null);
  const [showDefaultLogo,   setShowDefaultLogo]   = useState(false);
  const [positionModalOpen, setPositionModalOpen] = useState(false);

  const [label,            setLabel]            = useState("");
  const [scanLimit,        setScanLimit]        = useState<number | null>(null);
  const [expiryPreset,     setExpiryPreset]     = useState<ExpiryPreset>("never");
  const [expiryCustomDate, setExpiryCustomDate] = useState("");

  const [saving,       setSaving]      = useState(false);
  const [designDirty,  setDesignDirty] = useState(false);
  const [designOpen,   setDesignOpen]  = useState(false);

  const CUSTOM_THEME_IDX = QR_COLOR_THEMES.length;

  function onSelectTheme(idx: number) {
    if (idx === CUSTOM_THEME_IDX) {
      setIsCustomTheme(true);
      setSelectedThemeIdx(idx);
    } else {
      setIsCustomTheme(false);
      setSelectedThemeIdx(idx);
      setFgColor(QR_COLOR_THEMES[idx].fg);
      setBgColor(QR_COLOR_THEMES[idx].bg);
      setCustomFgColor(QR_COLOR_THEMES[idx].fg);
      setCustomBgColor(QR_COLOR_THEMES[idx].bg);
      setDesignDirty(true);
    }
  }

  function onSetCustomFg(hex: string) {
    setCustomFgColor(hex);
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) {
      setFgColor(hex);
      setDesignDirty(true);
    }
  }

  function onSetCustomBg(hex: string) {
    setCustomBgColor(hex);
    if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) {
      setBgColor(hex);
      setDesignDirty(true);
    }
  }

  function initDesignFromQrItem(item: GeneratedQrItem) {
    const fg = item.fgColor || "#0A0E17";
    const bg = item.bgColor || "#F8FAFC";
    setFgColor(fg);
    setBgColor(bg);
    setCustomFgColor(fg);
    setCustomBgColor(bg);
    setLogoPosition((item.logoPosition as LogoPosition) || "center");
    setCustomLogoUri(item.logoUri || null);
    setLabel(item.label || "");
    setScanLimit(item.scanLimit ?? null);

    const validPresets: ExpiryPreset[] = ["never", "1d", "7d", "30d", "90d"];
    const savedPreset = item.expiryPreset as ExpiryPreset | null | undefined;
    if (savedPreset && validPresets.includes(savedPreset)) {
      setExpiryPreset(savedPreset);
    } else {
      setExpiryPreset("never");
    }
    setExpiryCustomDate("");

    const matchIdx = QR_COLOR_THEMES.findIndex((t) => t.fg === fg && t.bg === bg);
    if (matchIdx >= 0) {
      setSelectedThemeIdx(matchIdx);
      setIsCustomTheme(false);
    } else {
      setIsCustomTheme(true);
      setSelectedThemeIdx(CUSTOM_THEME_IDX);
    }
  }

  async function handlePickLogo() {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      Alert.alert("Permission required", "Gallery permission is required to pick a logo.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.3,
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const uri = asset.base64
        ? `data:image/jpeg;base64,${asset.base64}`
        : asset.uri;
      setCustomLogoUri(uri);
      setShowDefaultLogo(false);
      setDesignDirty(true);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }

  function handleRemoveLogo() {
    setCustomLogoUri(null);
    setShowDefaultLogo(false);
    setDesignDirty(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleToggleDefaultLogo() {
    const next = !showDefaultLogo;
    setShowDefaultLogo(next);
    if (next) setCustomLogoUri(null);
    setDesignDirty(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function handleChangeScanLimit(n: number | null) {
    setScanLimit(n);
    setDesignDirty(true);
  }

  function handleChangeExpiryPreset(p: ExpiryPreset) {
    setExpiryPreset(p);
    setDesignDirty(true);
  }

  function handleChangeExpiryCustomDate(d: string) {
    setExpiryCustomDate(d);
    setDesignDirty(true);
  }

  async function handleSaveDesign() {
    if (!user || !qrItem) return;
    setSaving(true);
    try {
      const resolvedExpiry = resolveExpiryDate(expiryPreset, expiryCustomDate);
      await updateQrDesign(user.id, qrItem.docId!, {
        fgColor,
        bgColor,
        logoPosition,
        logoUri: customLogoUri || null,
        label: label.trim() || null,
        scanLimit: scanLimit ?? null,
        expiryDate: resolvedExpiry,
        expiryPreset: expiryPreset === "never" ? null : expiryPreset,
        standardLinkUuid: qrItem.qrType === "individual" ? (qrItem.uuid || null) : null,
        guardLinkUuid: null,
      });
      setDesignDirty(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Design updated successfully.");
    } catch {
      Alert.alert("Error", "Could not save design. Try again.");
    } finally {
      setSaving(false);
    }
  }

  const logoPositionLabel =
    LOGO_POSITIONS.find((p) => p.key === logoPosition)?.label ?? "Center";

  return {
    fgColor, setFgColor,
    bgColor, setBgColor,
    selectedThemeIdx, isCustomTheme,
    customFgColor, customBgColor,
    onSelectTheme, onSetCustomFg, onSetCustomBg,
    logoPosition, setLogoPosition,
    customLogoUri, setCustomLogoUri,
    showDefaultLogo,
    positionModalOpen, setPositionModalOpen,
    logoPositionLabel,
    handlePickLogo, handleRemoveLogo, handleToggleDefaultLogo,
    label, setLabel,
    scanLimit, handleChangeScanLimit,
    expiryPreset, handleChangeExpiryPreset,
    expiryCustomDate, handleChangeExpiryCustomDate,
    saving, designDirty, setDesignDirty,
    designOpen, setDesignOpen,
    initDesignFromQrItem, handleSaveDesign,
  };
}
