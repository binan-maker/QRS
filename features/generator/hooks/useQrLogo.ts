import { useState, useCallback } from "react";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "@/lib/haptics";
import type { LogoPosition } from "@/features/generator/types/form-types";

export function useQrLogo(
  showToast: (msg: string, type?: "success" | "error") => void,
) {
  const [customLogoUri,     setCustomLogoUri]     = useState<string | null>(null);
  const [customLogoBase64,  setCustomLogoBase64]  = useState<string | null>(null);
  const [showDefaultLogo,   setShowDefaultLogo]   = useState(false);
  const [logoPosition,      setLogoPosition]      = useState<LogoPosition>("center");
  const [positionModalOpen, setPositionModalOpen] = useState(false);

  const handlePickCustomLogo = useCallback(async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) { showToast("Gallery permission is required.", "error"); return; }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.3, base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      setCustomLogoUri(asset.uri);
      setShowDefaultLogo(false);
      setCustomLogoBase64(
        asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : null,
      );
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
  }, [showToast]);

  const handleRemoveLogo = useCallback(() => {
    setCustomLogoUri(null);
    setCustomLogoBase64(null);
    setShowDefaultLogo(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  const handleToggleDefaultLogo = useCallback(() => {
    setShowDefaultLogo((prev) => !prev);
    if (customLogoUri) {
      setCustomLogoUri(null);
      setCustomLogoBase64(null);
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [customLogoUri]);

  const resetLogo = useCallback(() => {
    setCustomLogoUri(null);
    setCustomLogoBase64(null);
    setShowDefaultLogo(false);
    setLogoPosition("center");
  }, []);

  return {
    customLogoUri,
    customLogoBase64,
    showDefaultLogo,
    logoPosition,
    setLogoPosition,
    positionModalOpen,
    setPositionModalOpen,
    handlePickCustomLogo,
    handleRemoveLogo,
    handleToggleDefaultLogo,
    resetLogo,
  };
}
