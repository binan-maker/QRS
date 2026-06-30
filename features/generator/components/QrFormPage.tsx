import React, { useState, useMemo, useCallback, useEffect } from "react";
import { View, StyleSheet, Text, TextInput, Pressable } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/shared/utils/platform";
import Reanimated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useQrGenerator } from "@/features/generator/hooks/useQrGenerator";
import { LOGO_POSITIONS } from "@/features/generator/types/form-types";
import type { QrMode } from "@/features/generator/types/form-types";
import { ScrollView } from "react-native";
import { Ionicons } from "@expo/vector-icons";

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
  initialTemplateId?: string;
  openAiBuilder?: boolean;
}

export default function QrFormPage({ mode, initialTemplateId, openAiBuilder }: Props) {
  const insets   = useSafeAreaInsets();
  const { colors } = useTheme();
  const topInset = useTopInset();

  const [presetActive,         setPresetActive]         = useState(false);
  const [templateGenerated,    setTemplateGenerated]    = useState(false);
  const [templateName,         setTemplateName]         = useState("");
  const [qrSize,               setQrSize]               = useState(220);
  const [qrTemplateOpen,       setQrTemplateOpen]       = useState(false);
  const [advancedBuilderOpen,  setAdvancedBuilderOpen]  = useState(false);
  const [showGenError,         setShowGenError]         = useState(false);
  const [showNameError,        setShowNameError]        = useState(false);
  const [showDuplicateError,   setShowDuplicateError]   = useState(false);
  const [showTemplateError,    setShowTemplateError]    = useState(false);

  const [initTid] = useState(initialTemplateId);
  const [initAi]  = useState(openAiBuilder);

  React.useEffect(() => {
    if (initTid || initAi) setQrTemplateOpen(true);
  }, []);

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
    nameSuggestions, clearNameSuggestions,
    toastMsg, toastType, toastAnim,
    privateMode,
    switchPreset, handleGenerate,
    handlePickCustomLogo, handleRemoveLogo, handleToggleDefaultLogo,
    handleCopy, handleShare, handleDownloadPdf, handleClear,
    sharingQr, downloadingPdf,
    urlRiskScore, urlRiskReasons,
  } = useQrGenerator();

  React.useEffect(() => { setQrMode(mode); }, []);

  useEffect(() => {
    if (nameSuggestions.length > 0) setShowDuplicateError(true);
  }, [nameSuggestions]);

  const logoPositionLabel = useMemo(
    () => LOGO_POSITIONS.find((p) => p.key === logoPosition)?.label ?? "Center",
    [logoPosition],
  );

  const buttonState = useMemo(() => {
    const hasLiveQr    = !!qrValue;
    const isRegistered = !!generatedUuid;
    const canSave      = user && !privateMode;

    if (hasLiveQr && canSave && !isRegistered)
      return { btnLabel: "Save Protected QR",      btnIcon: "shield-lock-outline"  as const, btnColors: [colors.safe, (colors as any).safeShade ?? colors.safe]   as [string, string] };
    if (hasLiveQr && isRegistered)
      return { btnLabel: "Protected QR Saved ✓",   btnIcon: "check-circle-outline" as const, btnColors: [colors.safe, (colors as any).safeShade ?? colors.safe]   as [string, string] };
    if (hasLiveQr && privateMode)
      return { btnLabel: "Private QR Generated ✓", btnIcon: "eye-off-outline"      as const, btnColors: [colors.textSecondary, colors.textMuted]                  as [string, string] };
    return   { btnLabel: "Generate QR Code",        btnIcon: "qrcode-edit"          as const, btnColors: [colors.primary, colors.primaryShade]                     as [string, string] };
  }, [qrValue, generatedUuid, user, privateMode, colors]);

  const handleSelectPreset = useCallback((idx: number) => {
    switchPreset(idx);
    setPresetActive(true);
    setTemplateGenerated(false);
    setShowTemplateError(false);
  }, [switchPreset]);

  const handleGenerateWithValidation = useCallback(() => {
    if (!presetActive && !templateGenerated) {
      setShowTemplateError(true);
      setShowNameError(false);
      setShowGenError(false);
      return;
    }
    // Name is not required for private QR codes — they are not saved
    if (mode !== "private") {
      const nameVal = advancedSettings.label.trim();
      if (!nameVal) {
        setShowNameError(true);
        setShowTemplateError(false);
        setShowGenError(false);
        return;
      }
    }
    if (!inputValue.trim()) {
      setShowGenError(true);
      setShowTemplateError(false);
      setShowNameError(false);
      return;
    }
    setShowTemplateError(false);
    setShowNameError(false);
    setShowGenError(false);
    handleGenerate();
  }, [mode, presetActive, templateGenerated, inputValue, advancedSettings.label, handleGenerate]);

  const handleClearAll = useCallback(() => {
    setTemplateGenerated(false);
    setTemplateName("");
    setPresetActive(false);
    setShowDuplicateError(false);
    clearNameSuggestions();
    handleClear();
  }, [handleClear, clearNameSuggestions]);

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

      <FormTopBar mode={mode} onOpenInfo={() => setInfoModalOpen(true)} />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 100 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* ── Template picker / ready card ─────────────────────── */}
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
          <TemplateReadyCard templateName={templateName} onChange={handleChangeTemplate} />
        )}

        {/* ── QR Name field — hidden for private QR (not saved) ── */}
        {mode !== "private" && (
          <Reanimated.View entering={FadeInDown.delay(40).duration(260)} style={styles.nameWrap}>
            <View style={[
              styles.nameCard,
              {
                backgroundColor: colors.surface,
                borderColor: showDuplicateError
                  ? colors.warning + "80"
                  : showNameError
                  ? colors.danger + "80"
                  : advancedSettings.label.trim()
                  ? colors.primary + "50"
                  : colors.surfaceBorder,
              },
            ]}>
              <View style={styles.nameRow}>
                <Ionicons
                  name="pricetag-outline"
                  size={13}
                  color={showDuplicateError ? colors.warning : showNameError ? colors.danger : advancedSettings.label.trim() ? colors.primary : colors.textMuted}
                />
                <Text style={[styles.nameLabel, { color: showDuplicateError ? colors.warning : showNameError ? colors.danger : colors.textSecondary }]}>
                  QR Code Name
                </Text>
                <View style={[styles.requiredTag, { backgroundColor: showDuplicateError ? colors.warning + "16" : showNameError ? colors.danger + "16" : colors.primaryDim }]}>
                  <Text style={[styles.requiredText, { color: showDuplicateError ? colors.warning : showNameError ? colors.danger : colors.primary }]}>Required</Text>
                </View>
              </View>

              <TextInput
                style={[styles.nameInput, {
                  color: colors.text,
                  backgroundColor: colors.surfaceLight,
                  borderColor: showDuplicateError ? colors.warning + "55" : showNameError ? colors.danger + "55" : colors.surfaceBorder,
                }]}
                placeholder="Name this QR code"
                placeholderTextColor={colors.textMuted}
                value={advancedSettings.label}
                onChangeText={(v) => {
                  setAdvancedSettings({ ...advancedSettings, label: v });
                  if (v.trim()) setShowNameError(false);
                  if (showDuplicateError) { setShowDuplicateError(false); clearNameSuggestions(); }
                }}
                maxLength={80}
              />

              {showDuplicateError && nameSuggestions.length > 0 ? (
                <View style={{ gap: 6 }}>
                  <Text style={[styles.nameHint, { color: colors.warning }]}>
                    That name is already taken. Try one of these:
                  </Text>
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
                    {nameSuggestions.map((s) => (
                      <Pressable
                        key={s}
                        onPress={() => {
                          setAdvancedSettings({ ...advancedSettings, label: s });
                          setShowDuplicateError(false);
                          clearNameSuggestions();
                        }}
                        style={({ pressed }) => [{
                          borderRadius: 8,
                          borderWidth: 1,
                          borderColor: colors.primary + "50",
                          backgroundColor: pressed ? colors.primaryDim : colors.surfaceLight,
                          paddingHorizontal: 10,
                          paddingVertical: 5,
                        }]}
                      >
                        <Text style={{ fontSize: 11, fontFamily: "Inter_500Medium", color: colors.primary }}>
                          {s}
                        </Text>
                      </Pressable>
                    ))}
                  </View>
                </View>
              ) : (
                <Text style={[styles.nameHint, { color: showNameError ? colors.danger : colors.textMuted }]}>
                  {showNameError ? "Please give your QR code a name before generating" : "Each name must be unique — helps organise your QR codes"}
                </Text>
              )}
            </View>
          </Reanimated.View>
        )}

        {/* ── Content input ────────────────────────────────────── */}
        {showInputSection && (
          <Reanimated.View entering={FadeInDown.delay(0).duration(260)} style={styles.inputWrap}>
            <InputSection
              selectedPreset={selectedPreset}
              inputValue={inputValue}
              extraFields={extraFields}
              setInputValue={setInputValue}
              setExtraField={setExtraField}
            />
          </Reanimated.View>
        )}

        {/* ── Customize drawer ─────────────────────────────────── */}
        <Reanimated.View entering={FadeInDown.delay(40).duration(260)} style={styles.drawerWrap}>
          <CustomizeDrawer
            qrReady={!!qrValue}
            hideOptions={mode === "private"}
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

        {/* ── Generate button ───────────────────────────────────── */}
        {!templateGenerated && (
          <GenerateButton
            btnLabel={buttonState.btnLabel}
            btnIcon={buttonState.btnIcon}
            btnColors={buttonState.btnColors}
            onPress={handleGenerateWithValidation}
            showError={showTemplateError || showGenError}
            errorMessage={
              showTemplateError
                ? "Please choose a template first"
                : "Please type something first"
            }
            onHideError={() => { setShowTemplateError(false); setShowGenError(false); }}
          />
        )}

        {templateGenerated && qrValue && (
          <Reanimated.View entering={FadeInDown.delay(30).duration(260)} style={styles.templateSaveBtnWrap}>
            <GenerateButton
              btnLabel={buttonState.btnLabel}
              btnIcon={buttonState.btnIcon}
              btnColors={buttonState.btnColors}
              onPress={handleGenerateWithValidation}
              onHideError={() => {}}
            />
          </Reanimated.View>
        )}

        {/* ── QR Output or placeholder ──────────────────────────── */}
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

      {/* ── Modals — lazy mounted (only when open) ────────────── */}
      {qrTemplateOpen && (
        <QrTemplateModal
          visible={qrTemplateOpen}
          onClose={() => setQrTemplateOpen(false)}
          initialTemplateId={initTid}
          openAiBuilder={initAi}
          onGenerate={(content, tName) => {
            setInputValue(content);
            setTemplateGenerated(true);
            setTemplateName(tName);
            setPresetActive(true);
            setShowTemplateError(false);
            setQrTemplateOpen(false);
          }}
        />
      )}
      {advancedBuilderOpen && (
        <CustomQrBuilderModal
          visible={advancedBuilderOpen}
          onClose={() => setAdvancedBuilderOpen(false)}
          onGenerate={(content, label) => {
            setInputValue(content);
            setTemplateGenerated(true);
            setTemplateName(label);
            setPresetActive(true);
            setShowTemplateError(false);
            setAdvancedBuilderOpen(false);
          }}
        />
      )}
      {positionModalOpen && (
        <PositionModal
          visible={positionModalOpen}
          logoPosition={logoPosition}
          onSelect={setLogoPosition}
          onClose={() => setPositionModalOpen(false)}
        />
      )}
      {infoModalOpen && (
        <InfoModal visible={infoModalOpen} onClose={() => setInfoModalOpen(false)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { paddingHorizontal: 0, paddingTop: 4, gap: 0 },

  nameWrap: { marginHorizontal: 20, marginTop: 12, marginBottom: 12 },
  nameCard: { borderRadius: 14, borderWidth: 1, padding: 12, gap: 7 },
  nameRow:  { flexDirection: "row", alignItems: "center", gap: 5 },
  nameLabel:{ fontSize: 12, fontFamily: "Inter_600SemiBold", flex: 1 },
  requiredTag: { borderRadius: 5, paddingHorizontal: 5, paddingVertical: 1 },
  requiredText:{ fontSize: 9, fontFamily: "Inter_600SemiBold" },
  nameInput: {
    borderRadius: 10, borderWidth: 1,
    paddingHorizontal: 11, paddingVertical: 8,
    fontSize: 13, fontFamily: "Inter_400Regular",
  },
  nameHint: { fontSize: 10, fontFamily: "Inter_400Regular" },

  inputWrap:           { marginHorizontal: 20, marginBottom: 0 },
  drawerWrap:          { marginHorizontal: 20, marginTop: 12, marginBottom: 0 },
  templateSaveBtnWrap: { marginHorizontal: 0 },
});
