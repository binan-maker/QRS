import { useState, useRef, useCallback, useMemo } from "react";
import * as Haptics from "@/shared/utils/haptics";
import { useAuth } from "@/shared/contexts/AuthContext";
import { QR_PRESETS } from "@/features/generator/data/presets";
import { QR_COLOR_THEMES } from "@/features/generator/components/QrThemeSection";
import { type AdvancedSettings } from "@/features/generator/components/AdvancedSettingsPanel";
import { useQrToast }   from "@/features/generator/hooks/useQrToast";
import { useQrLogo }    from "@/features/generator/hooks/useQrLogo";
import { useQrContent } from "@/features/generator/hooks/useQrContent";
import { useQrActions } from "@/features/generator/hooks/useQrActions";
import { useQrSave }    from "@/features/generator/hooks/useQrSave";
import type { QrMode }  from "@/features/generator/types/form-types";

export type { LogoPosition } from "@/features/generator/types/form-types";
export { LOGO_POSITIONS }    from "@/features/generator/types/form-types";

export function useQrGenerator() {
  const { user } = useAuth();
  const svgRef   = useRef<any>(null);

  // ── Input / preset state ──────────────────────────────────────────────────
  const [selectedPreset,    setSelectedPreset]    = useState(0);
  const [inputValue,        setInputValue]        = useState("");
  const [extraFields,       setExtraFields]       = useState<Record<string, string>>({});
  const [qrMode,            setQrMode]            = useState<QrMode>("individual");

  // ── Theme state ───────────────────────────────────────────────────────────
  const [selectedThemeIdx, setSelectedThemeIdx] = useState(0);
  const [customFgColor,    setCustomFgColor]    = useState("#0A0E17");
  const [customBgColor,    setCustomBgColor]    = useState("#FFFFFF");

  // ── Advanced settings ─────────────────────────────────────────────────────
  const [advancedSettings, setAdvancedSettings] = useState<AdvancedSettings>({
    scanLimit: null, expiryPreset: "never", expiryCustomDate: "", label: "",
  });

  // ── Derived values ────────────────────────────────────────────────────────
  const preset       = QR_PRESETS[selectedPreset];
  const privateMode  = qrMode === "private";
  const isBranded    = !!user && !privateMode;
  const isCustomTheme = selectedThemeIdx === QR_COLOR_THEMES.length;
  const activeTheme   = isCustomTheme ? null : (QR_COLOR_THEMES[selectedThemeIdx] ?? QR_COLOR_THEMES[0]);
  const qrFgColor     = isCustomTheme ? customFgColor : (activeTheme?.fg ?? "#0A0E17");
  const qrBgColor     = isCustomTheme ? customBgColor : (activeTheme?.bg ?? "#F8FAFC");

  // ── Sub-hooks ─────────────────────────────────────────────────────────────
  const { toastMsg, toastType, toastAnim, showToast } = useQrToast();

  const {
    customLogoUri, customLogoBase64, showDefaultLogo,
    logoPosition, setLogoPosition, positionModalOpen, setPositionModalOpen,
    handlePickCustomLogo, handleRemoveLogo, handleToggleDefaultLogo, resetLogo,
  } = useQrLogo(showToast);

  const {
    qrValue, setQrValue, generatedUuid, setGeneratedUuid, generatedAt, setGeneratedAt,
    urlRiskScore, urlRiskReasons,
  } = useQrContent({
    inputValue, extraFields, selectedPreset, qrMode, isBranded, showToast,
  });

  const { sharingQr, downloadingPdf, handleCopy, handleShare, handleDownloadPdf } = useQrActions({
    qrValue, qrMode, isBranded, inputValue, selectedPreset, extraFields, svgRef, showToast,
  });

  const { saving, savedToProfile, savedDocId, handleGenerate, nameSuggestions, clearNameSuggestions } = useQrSave({
    qrMode, isBranded, privateMode, selectedPreset, inputValue, extraFields,
    user, customLogoBase64,
    qrFgColor, qrBgColor, advancedSettings,
    setQrValue, setGeneratedUuid, setGeneratedAt, showToast,
  });

  // ── Helpers ───────────────────────────────────────────────────────────────
  const setExtraField = useCallback(
    (key: string, val: string) => setExtraFields((prev) => ({ ...prev, [key]: val })),
    [],
  );

  const switchPreset = useCallback((idx: number) => {
    setSelectedPreset(idx);
    setInputValue("");
    setExtraFields({});
    setQrValue("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [setQrValue]);

  const handleClear = useCallback(() => {
    setInputValue("");
    setExtraFields({});
    setQrValue("");
    setGeneratedUuid(null);
    setGeneratedAt(null);
    setSelectedThemeIdx(0);
    setCustomFgColor("#0A0E17");
    setCustomBgColor("#FFFFFF");
    setAdvancedSettings({ scanLimit: null, expiryPreset: "never", expiryCustomDate: "", label: "" });
    resetLogo();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [setQrValue, setGeneratedUuid, setGeneratedAt, resetLogo]);

  return {
    // Auth
    user,
    svgRef,
    // Input
    selectedPreset,
    inputValue,
    setInputValue,
    extraFields,
    setExtraField,
    // QR output
    qrValue,
    qrMode,
    setQrMode,
    // Logo
    customLogoUri,
    customLogoBase64,
    showDefaultLogo,
    logoPosition,
    setLogoPosition,
    positionModalOpen,
    setPositionModalOpen,
    // Theme
    selectedThemeIdx,
    setSelectedThemeIdx,
    isCustomTheme,
    customFgColor,
    customBgColor,
    setCustomFgColor,
    setCustomBgColor,
    qrFgColor,
    qrBgColor,
    // Advanced settings
    advancedSettings,
    setAdvancedSettings,
    // Generated state
    generatedUuid,
    generatedAt,
    // Save state
    saving,
    savedToProfile,
    savedDocId,
    nameSuggestions,
    clearNameSuggestions,
    // Toast
    toastMsg,
    toastType,
    toastAnim,
    // Risk
    urlRiskScore,
    urlRiskReasons,
    // Derived flags
    preset,
    privateMode,
    isBranded,
    // Share/download state
    sharingQr,
    downloadingPdf,
    // Actions
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
  };
}
