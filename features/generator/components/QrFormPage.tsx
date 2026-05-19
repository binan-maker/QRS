import React, { useState, useMemo, useCallback } from "react";
import { View, StyleSheet } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/lib/utils/platform";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { useQrGenerator } from "@/features/generator/hooks/useQrGenerator";
import { LOGO_POSITIONS } from "@/features/generator/types/form-types";
import type { QrMode } from "@/features/generator/types/form-types";
import { ScrollView } from "react-native";

import FormTopBar          from "@/features/generator/components/FormTopBar";
import TemplateReadyCard   from "@/features/generator/components/TemplateReadyCard";
import GenerateButton      from "@/features/generator/components/GenerateButton";
import EmptyQrPlaceholder  from "@/features/generator/components/EmptyQrPlaceholder";
import QrFormToast         from "@/features/generator/components/QrFormToast";
import TypePickerHome      from "@/features/generator/components/TypePickerHome";
import InputSection        from "@/features/generator/components/InputSection";
import QrOutputCard        from "@/features/generator/components/QrOutputCard";
import CustomizeDrawer     from "@/features/generator/components/CustomizeDrawer";
import QrTemplateModal     from "@/features/generator/components/QrTemplateModal";
import CustomQrBuilderModal from "@/features/generator/components/CustomQrBuilderModal";
import PositionModal       from "@/features/generator/components/PositionModal";
import InfoModal           from "@/features/generator/components/InfoModal";

interface Props {
  mode: QrMode;
}

export default function QrFormPage({ mode }: Props) {
  const insets   = useSafeAreaInsets();
  const { colors } = useTheme();
  const topInset = useTopInset();

  // ── Local UI state ────────────────────────────────────────────────────────
  const [presetActive,       setPresetActive]       = useState(false);
  const [templateGenerated,  setTemplateGenerated]  = useState(false);
  const [templateName,       setTemplateName]       = useState("");
  const [qrSize,             setQrSize]             = useState(220);
  const [qrTemplateOpen,     setQrTemplateOpen]     = useState(true);
  const [advancedBuilderOpen, setAdvancedBuilderOpen] = useState(false);
  const [showGenError,       setShowGenError]       = useState(false);

  // ── Generator hook ────────────────────────────────────────────────────────
  const {
    user, svgRef,
    selectedPreset, inputValue, setInputValue, extraFields, setExtraField,
    qrValue, setQrMode,
    customLogoUri, showDefaultLogo, logoPosition, setLogoPosition,
    selectedThemeIdx, setSelectedThemeIdx, isCustomTheme,
    customFgColor, customBgColor, setCustomFgColor, setCustomBgColor,
    advancedSettings, setAdvancedSettings,
    qrFgColor, qrBgColor,
    generatedUuid, generatedAt,
    infoModalOpen, setInfoModalOpen, positionModalOpen, setPositionModalOpen,
    saving, savedToProfile, savedDocId,
    toastMsg, toastType, toastAnim,
    privateMode,
    switchPreset, handleGenerate,
    handlePickCustomLogo, handleRemoveLogo, handleToggleDefaultLogo,
    handleCopy, handleShare, handleDownloadPdf, handleClear,
    sharingQr, downloadingPdf,
    urlRiskScore, urlRiskReasons,
  } = useQrGenerator();

  React.useEffect(() => { setQrMode(mode); }, []);

  // ── Derived ───────────────────────────────────────────────────────────────
  const logoPositionLabel = useMemo(
    () => LOGO_POSITIONS.find((p) => p.key === logoPosition)?.label ?? "Center",
    [logoPosition],
  );

  const buttonState = useMemo(() => {
    const hasLiveQr    = !!qrValue;
    const isRegistered = !!generatedUuid;
    const canSave      = user && !privateMode;

    if (hasLiveQr && canSave && !isRegistered)
      return { btnLabel: "Save Protected QR",       btnIcon: "shield-lock-outline"  as const, btnColors: [colors.safe, (colors as any).safeShade ?? colors.safe]    as [string, string] };
    if (hasLiveQr && isRegistered)
      return { btnLabel: "Protected QR Saved ✓",    btnIcon: "check-circle-outline" as const, btnColors: [colors.safe, (colors as any).safeShade ?? colors.safe]    as [string, string] };
    if (hasLiveQr && privateMode)
      return { btnLabel: "Private QR Generated ✓",  btnIcon: "eye-off-outline"      as const, btnColors: [colors.textSecondary, colors.textMuted]                   as [string, string] };
    return   { btnLabel: "Generate QR Code",         btnIcon: "qrcode-edit"          as const, btnColors: [colors.primary, colors.primaryShade]                      as [string, string] };
  }, [qrValue, generatedUuid, user, privateMode, colors]);

  // ── Callbacks ─────────────────────────────────────────────────────────────
  const handleSelectPreset = useCallback((idx: number) => {
    switchPreset(idx);
    setPresetActive(true);
    setTemplateGenerated(false);
  }, [switchPreset]);

  const handleGenerateWithValidation = useCallback(() => {
    if (!inputValue.trim()) { setShowGenError(true); return; }
    handleGenerate();
  }, [inputValue, handleGenerate]);

  const handleClearAll = useCallback(() => {
    setTemplateGenerated(false);
    setTemplateName("");
    setPresetActive(false);
    handleClear();
  }, [handleClear]);

  const handleChangeTemplate = useCallback(() => {
    setTemplateGenerated(false);
    setTemplateName("");
    setPresetActive(false);
    handleClear();
    setQrTemplateOpen(true);
  }, [handleClear]);

  const showInputSection  = presetActive && !templateGenerated;
  const showTemplateReady = templateGenerated;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset }]}>

      <FormTopBar
        mode={mode}
        onOpenInfo={() => setInfoModalOpen(true)}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 110 }]}
        keyboardShouldPersistTaps="handled"
      >
        {!showTemplateReady && (
          <TypePickerHome
            qrMode={mode as any}
            onSetMode={() => {}}
            onOpenCustom={() => setQrTemplateOpen(true)}
            hideActions={presetActive}
            hideModeCards={true}
          />
        )}

        {showTemplateReady && (
          <TemplateReadyCard
            templateName={templateName}
            onChange={handleChangeTemplate}
          />
        )}

        {showInputSection && (
          <Reanimated.View entering={FadeInDown.duration(150)} style={styles.inputWrap}>
            <InputSection
              selectedPreset={selectedPreset}
              inputValue={inputValue}
              extraFields={extraFields}
              setInputValue={setInputValue}
              setExtraField={setExtraField}
            />
          </Reanimated.View>
        )}

        <Reanimated.View entering={FadeInDown.duration(160)} style={styles.drawerWrap}>
          <CustomizeDrawer
            qrReady={!!qrValue}
            selectedThemeIdx={selectedThemeIdx}
            onSelectTheme={setSelectedThemeIdx}
            isCustomTheme={isCustomTheme}
            customFgColor={customFgColor}
            customBgColor={customBgColor}
            onSetCustomFg={setCustomFgColor}
            onSetCustomBg={setCustomBgColor}
            settings={advancedSettings}
            onChangeSettings={setAdvancedSettings}
            customLogoUri={customLogoUri}
            showDefaultLogo={showDefaultLogo}
            logoPositionLabel={logoPositionLabel}
            onPickLogo={handlePickCustomLogo}
            onRemoveLogo={handleRemoveLogo}
            onToggleDefaultLogo={handleToggleDefaultLogo}
            onOpenPosition={() => setPositionModalOpen(true)}
          />
        </Reanimated.View>

        {!templateGenerated && (
          <GenerateButton
            btnLabel={buttonState.btnLabel}
            btnIcon={buttonState.btnIcon}
            btnColors={buttonState.btnColors}
            onPress={handleGenerateWithValidation}
            showError={showGenError}
            onHideError={() => setShowGenError(false)}
          />
        )}

        {templateGenerated && qrValue && (
          <Reanimated.View entering={FadeInDown.duration(160)} style={styles.templateSaveBtnWrap}>
            <GenerateButton
              btnLabel={buttonState.btnLabel}
              btnIcon={buttonState.btnIcon}
              btnColors={buttonState.btnColors}
              onPress={handleGenerateWithValidation}
              onHideError={() => {}}
            />
          </Reanimated.View>
        )}

        {qrValue ? (
          <QrOutputCard
            qrValue={qrValue}
            qrSize={qrSize}
            isBranded={false}
            privateMode={privateMode}
            qrMode={mode as any}
            logoPosition={logoPosition}
            customLogoUri={customLogoUri}
            showDefaultLogo={showDefaultLogo}
            generatedUuid={generatedUuid}
            generatedAt={generatedAt}
            saving={saving}
            savedToProfile={savedToProfile}
            savedDocId={savedDocId}
            user={user}
            svgRef={svgRef}
            logoPositionLabel={logoPositionLabel}
            qrFgColor={qrFgColor}
            qrBgColor={qrBgColor}
            urlRiskScore={urlRiskScore}
            urlRiskReasons={urlRiskReasons}
            onSizeIncrease={() => setQrSize((s) => Math.min(320, s + 20))}
            onSizeDecrease={() => setQrSize((s) => Math.max(160, s - 20))}
            onCopy={handleCopy}
            onShare={handleShare}
            onDownload={handleDownloadPdf}
            onClear={handleClearAll}
            sharingQr={sharingQr}
            downloadingPdf={downloadingPdf}
          />
        ) : (
          <EmptyQrPlaceholder mode={mode} />
        )}
      </ScrollView>

      <QrFormToast msg={toastMsg} type={toastType} animVal={toastAnim} />

      <QrTemplateModal
        visible={qrTemplateOpen}
        onClose={() => setQrTemplateOpen(false)}
        onGenerate={(content, tName) => {
          setInputValue(content);
          setTemplateGenerated(true);
          setTemplateName(tName);
          setPresetActive(true);
          setQrTemplateOpen(false);
        }}
      />
      <CustomQrBuilderModal
        visible={advancedBuilderOpen}
        onClose={() => setAdvancedBuilderOpen(false)}
        onGenerate={(content, label) => {
          setInputValue(content);
          setTemplateGenerated(true);
          setTemplateName(label);
          setPresetActive(true);
          setAdvancedBuilderOpen(false);
        }}
      />
      <PositionModal
        visible={positionModalOpen}
        logoPosition={logoPosition}
        onSelect={setLogoPosition}
        onClose={() => setPositionModalOpen(false)}
      />
      <InfoModal visible={infoModalOpen} onClose={() => setInfoModalOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  container:           { flex: 1 },
  scroll:              { paddingHorizontal: 0, paddingTop: 4 },
  inputWrap:           { marginHorizontal: 20 },
  drawerWrap:          { marginHorizontal: 20, marginTop: 16 },
  templateSaveBtnWrap: { marginHorizontal: 0 },
});
