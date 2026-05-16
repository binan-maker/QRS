import { useState } from "react";
import { Alert } from "react-native";
import * as Haptics from "@/lib/haptics";
import { updateQrDesign, type GeneratedQrItem } from "@/lib/firestore-service";
import { useAuth } from "@/contexts/AuthContext";

export type LogoPosition = "center" | "top-left" | "top-right" | "bottom-left" | "bottom-right";

export const FG_COLORS = [
  { color: "#0A0E17", label: "Dark" },
  { color: "#1e3a5f", label: "Navy" },
  { color: "#7C3AED", label: "Purple" },
  { color: "#10B981", label: "Green" },
  { color: "#EF4444", label: "Red" },
  { color: "#F59E0B", label: "Amber" },
  { color: "#000000", label: "Black" },
];

export const BG_COLORS = [
  { color: "#F8FAFC", label: "Light" },
  { color: "#FFFFFF", label: "White" },
  { color: "#E0F2FE", label: "Sky" },
  { color: "#FEF3C7", label: "Cream" },
  { color: "#F0FDF4", label: "Mint" },
];

export const LOGO_POSITIONS: { key: LogoPosition; label: string }[] = [
  { key: "center", label: "Center" },
  { key: "top-left", label: "Top Left" },
  { key: "top-right", label: "Top Right" },
  { key: "bottom-left", label: "Bot. Left" },
  { key: "bottom-right", label: "Bot. Right" },
];

export function useQrDesign(qrItem: GeneratedQrItem | null) {
  const { user } = useAuth();
  const [fgColor, setFgColor] = useState("#0A0E17");
  const [bgColor, setBgColor] = useState("#F8FAFC");
  const [logoPosition, setLogoPosition] = useState<LogoPosition>("center");
  const [logoUri, setLogoUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [designDirty, setDesignDirty] = useState(false);
  const [designOpen, setDesignOpen] = useState(false);

  const [customColorOpen, setCustomColorOpen] = useState(false);
  const [customColorTarget, setCustomColorTarget] = useState<"fg" | "bg">("fg");
  const [customColorInput, setCustomColorInput] = useState("");

  function initDesignFromQrItem(item: GeneratedQrItem) {
    setFgColor(item.fgColor || "#0A0E17");
    setBgColor(item.bgColor || "#F8FAFC");
    setLogoPosition((item.logoPosition as LogoPosition) || "center");
    setLogoUri(item.logoUri || null);
  }

  function applyCustomColor() {
    let hex = customColorInput.trim();
    if (!hex.startsWith("#")) hex = "#" + hex;
    if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) {
      Alert.alert("Invalid color", "Please enter a valid hex color (e.g. #FF5500)");
      return;
    }
    if (customColorTarget === "fg") setFgColor(hex);
    else setBgColor(hex);
    setDesignDirty(true);
    setCustomColorOpen(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  async function handleSaveDesign() {
    if (!user || !qrItem) return;
    setSaving(true);
    try {
      await updateQrDesign(user.id, qrItem.docId, { fgColor, bgColor, logoPosition, logoUri: null });
      setDesignDirty(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert("Saved", "Design updated successfully.");
    } catch {
      Alert.alert("Error", "Could not save design. Try again.");
    } finally {
      setSaving(false);
    }
  }

  return {
    fgColor, setFgColor,
    bgColor, setBgColor,
    logoPosition, setLogoPosition,
    logoUri, setLogoUri,
    saving, designDirty, setDesignDirty,
    designOpen, setDesignOpen,
    customColorOpen, setCustomColorOpen,
    customColorTarget, setCustomColorTarget,
    customColorInput, setCustomColorInput,
    initDesignFromQrItem, applyCustomColor, handleSaveDesign,
  };
}
