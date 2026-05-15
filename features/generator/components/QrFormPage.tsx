import React, { useState, useMemo, useCallback, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  Platform,
  Animated,
  useWindowDimensions,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, {
  FadeIn,
  FadeInDown,
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  runOnJS,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import { useQrGenerator, LOGO_POSITIONS } from "@/hooks/useQrGenerator";
import TypePickerHome from "@/features/generator/components/TypePickerHome";
import QrTemplateModal from "@/features/generator/components/QrTemplateModal";
import CustomQrBuilderModal from "@/features/generator/components/CustomQrBuilderModal";
import InputSection from "@/features/generator/components/InputSection";
import QrOutputCard from "@/features/generator/components/QrOutputCard";
import InfoModal from "@/features/generator/components/InfoModal";
import PositionModal from "@/features/generator/components/PositionModal";
import CustomizeDrawer from "@/features/generator/components/CustomizeDrawer";

type QrMode = "individual" | "private";

const MODE_META: Record<QrMode, { label: string; color: string }> = {
  individual: { label: "Standard", color: "#3B82F6" },
  private:    { label: "Private",  color: "#64748B" },
};

interface Props {
  mode: QrMode;
}

export default function QrFormPage({ mode }: Props) {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { width } = useWindowDimensions();

  const [presetActive, setPresetActive] = useState(false);
  const [templateGenerated, setTemplateGenerated] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [qrSize, setQrSize] = useState(220);
  const [qrTemplateOpen, setQrTemplateOpen] = useState(false);
  const [advancedBuilderOpen, setAdvancedBuilderOpen] = useState(false);
  const [showGenError, setShowGenError] = useState(false);

  const errorProgress = useSharedValue(0);
  const errorOpacity = useSharedValue(0);
  const errorBarStyle = useAnimatedStyle(() => ({ width: `${errorProgress.value * 100}%` as any }));
  const errorContainerStyle = useAnimatedStyle(() => ({ opacity: errorOpacity.value }));

  const {
    user,
    svgRef,
    selectedPreset,
    inputValue,
    setInputValue,
    extraFields,
    setExtraField,
    qrValue,
    setQrMode,
    customLogoUri,
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
    privateMode,
    switchPreset,
    handleGenerate,
    handlePickCustomLogo,
    handleRemoveLogo,
    handleToggleDefaultLogo,
    handleCopy,
    handleShare,
    handleDownloadPdf,
    handleClear,
    sharingQr,
    downloadingPdf,
    urlRiskScore,
    urlRiskReasons,
  } = useQrGenerator();

  useEffect(() => {
    setQrMode(mode);
  }, []);

  const styles = useMemo(() => makeStyles(colors, width), [colors, width]);
  const meta = MODE_META[mode];

  const logoPositionLabel = useMemo(
    () => LOGO_POSITIONS.find((p) => p.key === logoPosition)?.label || "Center",
    [logoPosition],
  );

  const buttonState = useMemo(() => {
    const hasLiveQr = !!qrValue;
    const isRegistered = !!generatedUuid;
    const canSave = user && !privateMode;

    let btnLabel = "Generate QR Code";
    let btnIcon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] = "qrcode-edit";
    let btnColors: [string, string] = [colors.primary, colors.primaryShade];

    if (hasLiveQr && canSave && !isRegistered) {
      btnLabel = "Save Protected QR";
      btnIcon = "shield-lock-outline";
      btnColors = [colors.safe, (colors as any).safeShade ?? colors.safe];
    } else if (hasLiveQr && isRegistered) {
      btnLabel = "Protected QR Saved ✓";
      btnIcon = "check-circle-outline";
      btnColors = [colors.safe, (colors as any).safeShade ?? colors.safe];
    } else if (hasLiveQr && privateMode) {
      btnLabel = "Private QR Generated ✓";
      btnIcon = "eye-off-outline";
      btnColors = [colors.textSecondary, colors.textMuted];
    }

    return { btnLabel, btnIcon, btnColors };
  }, [qrValue, generatedUuid, user, privateMode, mode, colors]);

  const handleSelectPreset = useCallback(
    (idx: number) => {
      switchPreset(idx);
      setPresetActive(true);
      setTemplateGenerated(false);
    },
    [switchPreset],
  );

  const handleSetHomeMode = useCallback(
    (m: QrMode) => { setQrMode(m); },
    [setQrMode],
  );

  function _hideGenError() { setShowGenError(false); }

  const handleGenerateWithValidation = useCallback(() => {
    const isEmpty = !inputValue.trim();
    if (isEmpty) {
      setShowGenError(true);
      errorProgress.value = 0;
      errorOpacity.value = 1;
      errorProgress.value = withTiming(1, { duration: 1100 }, (finished) => {
        if (finished) {
          errorOpacity.value = withTiming(0, { duration: 280 }, () => {
            runOnJS(_hideGenError)();
          });
        }
      });
      return;
    }
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

  const handleSizeIncrease = useCallback(() => setQrSize(s => Math.min(320, s + 20)), []);
  const handleSizeDecrease = useCallback(() => setQrSize(s => Math.max(160, s - 20)), []);
  const handleOpenPosition = useCallback(() => setPositionModalOpen(true), [setPositionModalOpen]);
  const handleOpenInfo = useCallback(() => setInfoModalOpen(true), [setInfoModalOpen]);
  const handleClosePosition = useCallback(() => setPositionModalOpen(false), [setPositionModalOpen]);
  const handleCloseInfo = useCallback(() => setInfoModalOpen(false), [setInfoModalOpen]);

  const showInputSection = presetActive && !templateGenerated;
  const showTemplateReady = templateGenerated;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset }]}>

      {/* ── Top bar ── */}
      <View style={[styles.topBar, { borderBottomColor: colors.surfaceBorder }]}>
        <Pressable
          onPress={() => router.back()}
          style={({ pressed }) => [
            styles.backBtn,
            { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.textSecondary} />
        </Pressable>
        <View style={styles.topBarCenter}>
          <View style={[styles.modeDot, { backgroundColor: meta.color }]} />
          <Text style={[styles.topBarTitle, { color: meta.color }]}>{meta.label} QR</Text>
        </View>
        <Pressable
          onPress={handleOpenInfo}
          style={[styles.infoBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* ── Form scroll ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Template picker / mode picker — hidden once template is active */}
        {!showTemplateReady && (
          <TypePickerHome
            qrMode={mode}
            onSetMode={handleSetHomeMode}
            onOpenCustom={() => setQrTemplateOpen(true)}
            hideActions={presetActive}
            hideModeCards={true}
          />
        )}

        {/* Template ready card — shown after QrTemplateModal generates content */}
        {showTemplateReady && (
          <Reanimated.View entering={FadeInDown.duration(300)} style={{ marginHorizontal: 20, marginTop: 12 }}>
            <View style={[styles.templateReadyCard, { backgroundColor: colors.surface, borderColor: colors.primary + "40" }]}>
              <View style={[styles.templateReadyIcon, { backgroundColor: colors.primaryDim }]}>
                <Ionicons name="checkmark-circle" size={20} color={colors.primary} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.templateReadyTitle, { color: colors.text }]}>{templateName}</Text>
                <Text style={[styles.templateReadySub, { color: colors.textMuted }]}>Content ready · QR generating below</Text>
              </View>
              <Pressable
                onPress={handleChangeTemplate}
                style={({ pressed }) => [styles.changeBtn, { backgroundColor: colors.primaryDim, opacity: pressed ? 0.75 : 1 }]}
              >
                <Text style={[styles.changeBtnText, { color: colors.primary }]}>Change</Text>
              </Pressable>
            </View>
          </Reanimated.View>
        )}

        {/* Manual input — only when a preset is active and NOT from template modal */}
        {showInputSection && (
          <Reanimated.View entering={FadeInDown.duration(320).delay(60)} style={{ marginHorizontal: 20 }}>
            <InputSection
              selectedPreset={selectedPreset}
              inputValue={inputValue}
              extraFields={extraFields}
              setInputValue={setInputValue}
              setExtraField={setExtraField}
            />
          </Reanimated.View>
        )}

        {/* Customize drawer */}
        <Reanimated.View entering={FadeInDown.duration(340).delay(100)} style={{ marginHorizontal: 20, marginTop: 16 }}>
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
            onOpenPosition={handleOpenPosition}
          />
        </Reanimated.View>

        {/* Generate / Save button — only show when not using template (template auto-previews) */}
        {!templateGenerated && (
          <Reanimated.View entering={FadeInDown.duration(360).delay(120)}>
            <Pressable
              onPress={handleGenerateWithValidation}
              style={({ pressed }) => [
                { opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                styles.generateBtnWrap,
              ]}
            >
              <LinearGradient
                colors={buttonState.btnColors}
                style={styles.generateBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name={buttonState.btnIcon} size={22} color="#fff" />
                <Text style={styles.generateBtnText}>{buttonState.btnLabel}</Text>
              </LinearGradient>
            </Pressable>

            {showGenError && (
              <Reanimated.View
                style={[
                  errorContainerStyle,
                  {
                    marginHorizontal: 20,
                    marginTop: 8,
                    borderRadius: 10,
                    overflow: "hidden",
                    height: 32,
                    backgroundColor: colors.danger + "12",
                  },
                ]}
              >
                <Reanimated.View
                  style={[
                    errorBarStyle,
                    {
                      position: "absolute",
                      top: 0, bottom: 0, left: 0,
                      backgroundColor: colors.danger + "35",
                      borderRadius: 10,
                    },
                  ]}
                />
                <Text style={{
                  fontSize: 11,
                  fontFamily: "Inter_600SemiBold",
                  color: colors.danger,
                  textAlign: "center",
                  lineHeight: 32,
                  zIndex: 1,
                }}>
                  Please type something first
                </Text>
              </Reanimated.View>
            )}
          </Reanimated.View>
        )}

        {/* Save button for template-generated QRs */}
        {templateGenerated && qrValue && (
          <Reanimated.View entering={FadeInDown.duration(360).delay(80)} style={styles.generateBtnWrap}>
            <Pressable
              onPress={handleGenerateWithValidation}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] })}
            >
              <LinearGradient
                colors={buttonState.btnColors}
                style={styles.generateBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name={buttonState.btnIcon} size={22} color="#fff" />
                <Text style={styles.generateBtnText}>{buttonState.btnLabel}</Text>
              </LinearGradient>
            </Pressable>
          </Reanimated.View>
        )}

        {/* QR output or empty placeholder */}
        {qrValue ? (
          <QrOutputCard
            qrValue={qrValue}
            qrSize={qrSize}
            isBranded={false}
            privateMode={privateMode}
            qrMode={mode}
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
            onSizeIncrease={handleSizeIncrease}
            onSizeDecrease={handleSizeDecrease}
            onCopy={handleCopy}
            onShare={handleShare}
            onDownload={handleDownloadPdf}
            onClear={handleClearAll}
            sharingQr={sharingQr}
            downloadingPdf={downloadingPdf}
          />
        ) : (
          <Reanimated.View entering={FadeIn.duration(400)}>
            <View style={[styles.emptyQr, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <LinearGradient
                colors={colors.isDark
                  ? ["rgba(0,229,255,0.12)", "rgba(0,111,255,0.08)"]
                  : ["rgba(0,111,255,0.08)", "rgba(0,71,204,0.05)"]}
                style={styles.emptyQrIconWrap}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="qrcode-scan" size={52} color={colors.primary} />
              </LinearGradient>
              <Text style={[styles.emptyQrText, { color: colors.text }]}>Your QR appears here</Text>
              <Text style={[styles.emptyQrSub, { color: colors.textMuted }]}>
                {mode === "individual"
                  ? "Choose a template — protected QR previews live"
                  : "Choose a template — private QR generates offline"}
              </Text>
            </View>
          </Reanimated.View>
        )}
      </ScrollView>

      {/* ── Toast ── */}
      {toastMsg ? (
        <Animated.View
          style={[
            styles.toast,
            { backgroundColor: colors.surface, borderColor: toastType === "error" ? colors.danger + "40" : colors.safe + "40" },
            {
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
              pointerEvents: "none",
            },
          ]}
        >
          <LinearGradient
            colors={toastType === "error" ? [colors.danger + "25", colors.danger + "10"] : [colors.safe + "25", colors.safe + "10"]}
            style={styles.toastIconWrap}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons
              name={toastType === "error" ? "alert-circle" : "checkmark-circle"}
              size={18}
              color={toastType === "error" ? colors.danger : colors.safe}
            />
          </LinearGradient>
          <Text style={[styles.toastText, { color: toastType === "error" ? colors.danger : colors.safe }]}>
            {toastMsg}
          </Text>
        </Animated.View>
      ) : null}

      {/* ── Modals ── */}
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
        onOpenAdvancedBuilder={() => {
          setQrTemplateOpen(false);
          setAdvancedBuilderOpen(true);
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
        onClose={handleClosePosition}
      />
      <InfoModal visible={infoModalOpen} onClose={handleCloseInfo} />
    </View>
  );
}

function makeStyles(colors: any, width: number) {
  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (size: number) => Math.round(size * s);
  return StyleSheet.create({
    container: { flex: 1 },
    topBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 12,
      borderBottomWidth: StyleSheet.hairlineWidth,
    },
    backBtn: {
      width: 38, height: 38, borderRadius: 12, borderWidth: 1,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    topBarCenter: {
      flex: 1, flexDirection: "row", alignItems: "center",
      gap: 8, justifyContent: "center",
    },
    modeDot: { width: 8, height: 8, borderRadius: 4 },
    topBarTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
    infoBtn: {
      width: 38, height: 38, borderRadius: 19, borderWidth: 1,
      alignItems: "center", justifyContent: "center",
    },
    scrollContent: { paddingHorizontal: 0, paddingTop: 4 },
    templateReadyCard: {
      flexDirection: "row", alignItems: "center", gap: 12,
      borderRadius: 16, borderWidth: 1.5, padding: 14,
    },
    templateReadyIcon: {
      width: 40, height: 40, borderRadius: 12,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    templateReadyTitle: { fontSize: rf(13), fontFamily: "Inter_700Bold" },
    templateReadySub: { fontSize: rf(10), fontFamily: "Inter_400Regular", marginTop: 2 },
    changeBtn: {
      borderRadius: 10, paddingHorizontal: 12, paddingVertical: 7,
    },
    changeBtnText: { fontSize: rf(12), fontFamily: "Inter_700Bold" },
    generateBtnWrap: { marginBottom: 16, marginHorizontal: 20 },
    generateBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 10, paddingVertical: 14, borderRadius: 18,
    },
    generateBtnText: { fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#fff" },
    emptyQr: {
      borderRadius: 20, borderWidth: 1, paddingVertical: 36,
      paddingHorizontal: 24, alignItems: "center", gap: 14,
      marginBottom: 20, marginHorizontal: 20,
    },
    emptyQrIconWrap: {
      width: 100, height: 100, borderRadius: 28,
      alignItems: "center", justifyContent: "center",
    },
    emptyQrText: { fontSize: rf(13), fontFamily: "Inter_700Bold", textAlign: "center" },
    emptyQrSub: { fontSize: rf(11), fontFamily: "Inter_400Regular", textAlign: "center" },
    toast: {
      position: "absolute", bottom: 110, left: 20, right: 20,
      borderRadius: 18, flexDirection: "row", alignItems: "center",
      gap: 10, paddingHorizontal: 16, paddingVertical: 14, borderWidth: 1,
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15, shadowRadius: 12, elevation: 10,
    },
    toastIconWrap: {
      width: 32, height: 32, borderRadius: 16,
      alignItems: "center", justifyContent: "center",
    },
    toastText: { fontSize: rf(14), fontFamily: "Inter_600SemiBold", flex: 1 },
  });
}
