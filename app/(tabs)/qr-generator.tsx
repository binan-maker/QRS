import React, { useState, useMemo, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  TextInput,
  Platform,
  Animated,
  useWindowDimensions,
  Keyboard,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, {
  FadeIn,
  FadeInDown,
} from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import { useQrGenerator, LOGO_POSITIONS } from "@/hooks/useQrGenerator";
import TypePickerHome from "@/features/generator/components/TypePickerHome";
import TemplatePickerModal from "@/features/generator/components/TemplatePickerModal";
import CustomQrModal from "@/features/generator/components/CustomQrModal";
import InputSection from "@/features/generator/components/InputSection";
import QrOutputCard from "@/features/generator/components/QrOutputCard";
import InfoModal from "@/features/generator/components/InfoModal";
import PositionModal from "@/features/generator/components/PositionModal";
import CustomizeDrawer from "@/features/generator/components/CustomizeDrawer";
import GroupPickerModal from "@/components/groups/GroupPickerModal";
import type { BusinessCategory } from "@/features/generator/components/BusinessTypeSelector";

type QrMode = "individual" | "business" | "private";

const MODE_DEFS: {
  key: QrMode;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
  color: string;
  sub: string;
}[] = [
  {
    key: "individual",
    label: "Standard",
    icon: "bookmark-outline",
    color: "#3B82F6",
    sub: "Saved, secure",
  },
  {
    key: "business",
    label: "Business",
    icon: "storefront-outline",
    color: "#F59E0B",
    sub: "Smart Redirect",
  },
  {
    key: "private",
    label: "Private",
    icon: "eye-off-outline",
    color: "#64748B",
    sub: "No trace",
  },
];

function QrGeneratorScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = 62 + insets.bottom + 8;
  const { width } = useWindowDimensions();

  const [presetActive, setPresetActive] = useState(false);
  const [qrSize, setQrSize] = useState(220);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [customModalOpen, setCustomModalOpen] = useState(false);

  const {
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
    isBranded,
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

  const styles = useMemo(() => makeStyles(colors, width), [colors, width]);

  const logoPositionLabel = useMemo(
    () => LOGO_POSITIONS.find((p) => p.key === logoPosition)?.label || "Center",
    [logoPosition],
  );

  const buttonState = useMemo(() => {
    const hasLiveQr = !!qrValue;
    const isRegistered = !!generatedUuid;
    const canSave = user && !privateMode;

    let btnLabel = "Generate QR Code";
    let btnIcon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] =
      "qrcode-edit";
    let btnColors: [string, string] = [colors.primary, colors.primaryShade];

    if (hasLiveQr && canSave && !isRegistered) {
      if (qrMode === "business") {
        btnLabel = "Activate Smart Redirect";
        btnIcon = "shield-check";
        btnColors = [
          colors.warning,
          (colors as any).warningShade ?? colors.warning,
        ];
      } else {
        btnLabel = "Save Protected QR";
        btnIcon = "shield-lock-outline";
        btnColors = [colors.safe, (colors as any).safeShade ?? colors.safe];
      }
    } else if (hasLiveQr && isRegistered) {
      btnLabel =
        qrMode === "business"
          ? "Smart Redirect Active ✓"
          : "Protected QR Saved ✓";
      btnIcon = "check-circle-outline";
      btnColors = [colors.safe, (colors as any).safeShade ?? colors.safe];
    } else if (hasLiveQr && privateMode) {
      btnLabel = "Private QR Generated ✓";
      btnIcon = "eye-off-outline";
      btnColors = [colors.textSecondary, colors.textMuted];
    }

    return { btnLabel, btnIcon, btnColors };
  }, [qrValue, generatedUuid, user, privateMode, qrMode, colors]);

  const handleModeSwitch = useCallback(
    (newMode: QrMode) => {
      if (newMode === "business" && !user) return;
      setQrMode(newMode);
      switchPreset(selectedPreset);
    },
    [setQrMode, switchPreset, selectedPreset, user],
  );

  const handleSelectPreset = useCallback(
    (idx: number) => {
      switchPreset(idx);
      setPresetActive(true);
    },
    [switchPreset],
  );

  const handleSelectBusinessCategory = useCallback(
    (cat: BusinessCategory) => {
      setQrMode("business");
      switchBusinessCategory(cat);
      setPresetActive(true);
    },
    [setQrMode, switchBusinessCategory],
  );

  const handleSetHomeMode = useCallback(
    (mode: QrMode) => {
      if (mode === "business" && !user) return;
      setQrMode(mode);
    },
    [setQrMode, user],
  );

  const handleModeCardPress = useCallback(
    (mode: QrMode) => {
      if (mode === "business" && !user) return;
      setQrMode(mode);
    },
    [setQrMode, user],
  );

  const handleOpenTemplates = useCallback(() => {
    Keyboard.dismiss();
    setTimeout(() => setTemplateModalOpen(true), 80);
  }, []);

  const handleOpenTemplatesFromHome = useCallback(() => {
    setTemplateModalOpen(true);
  }, []);

  const handleSelectFromModal = useCallback(
    (idx: number) => {
      switchPreset(idx);
      setPresetActive(true);
    },
    [switchPreset],
  );

  const handleCustomGenerate = useCallback(
    (content: string, label: string) => {
      switchPreset(0);
      setInputValue(content);
      setPresetActive(true);
    },
    [switchPreset, setInputValue],
  );

  const handleClearPreset = useCallback(() => {
    setPresetActive(false);
    handleClear();
  }, [handleClear]);

  const handleSizeIncrease = useCallback(
    () => setQrSize((s) => Math.min(320, s + 20)),
    [],
  );
  const handleSizeDecrease = useCallback(
    () => setQrSize((s) => Math.max(160, s - 20)),
    [],
  );
  const handleOpenPosition = useCallback(
    () => setPositionModalOpen(true),
    [setPositionModalOpen],
  );
  const handleOpenInfo = useCallback(
    () => setInfoModalOpen(true),
    [setInfoModalOpen],
  );
  const handleCloseTemplates = useCallback(
    () => setTemplateModalOpen(false),
    [],
  );
  const handleClosePosition = useCallback(
    () => setPositionModalOpen(false),
    [setPositionModalOpen],
  );
  const handleCloseInfo = useCallback(
    () => setInfoModalOpen(false),
    [setInfoModalOpen],
  );
  const handleOpenGroupPicker = useCallback(() => setGroupPickerOpen(true), []);
  const handleCloseGroupPicker = useCallback(
    () => setGroupPickerOpen(false),
    [],
  );

  const activeModeColor =
    MODE_DEFS.find((m) => m.key === qrMode)?.color ?? colors.primary;
  const activeModeLabel =
    MODE_DEFS.find((m) => m.key === qrMode)?.label ?? "Create";

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset }]}>

      {/* ── HEADER (always visible) ── */}
      <View style={styles.navBar}>
        <View>
          <Text style={[styles.navTitle, { color: colors.text }]}>QR Generator</Text>
        </View>
        <Pressable
          onPress={handleOpenInfo}
          style={[styles.infoBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          <Ionicons name="information-circle-outline" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      {/* ── UNIFIED SINGLE-PAGE SCROLL ── */}
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        {/* Mode cards + type-pick actions (actions collapse once a type is active) */}
        <TypePickerHome
          qrMode={qrMode}
          onSetMode={handleSetHomeMode}
          onModeCardPress={handleModeCardPress}
          onSelectPreset={handleSelectPreset}
          onSelectBusinessCategory={handleSelectBusinessCategory}
          onOpenTemplates={handleOpenTemplatesFromHome}
          onOpenCustom={() => setCustomModalOpen(true)}
          user={user}
          hideActions={presetActive}
        />

        {/* ── INLINE FORM — always visible below the mode cards ── */}
        <>
            {/* "Selected type" chip + Change-type button  OR  "Choose QR Type" prompt */}
            <Reanimated.View entering={FadeInDown.duration(260)} style={styles.typeChipRow}>
              {presetActive ? (
                <>
                  <View style={[styles.typeChip, { backgroundColor: activeModeColor + "14", borderColor: activeModeColor + "40" }]}>
                    <View style={[styles.typeChipDot, { backgroundColor: activeModeColor }]} />
                    <Text style={[styles.typeChipLabel, { color: activeModeColor }]}>
                      {preset?.label ?? "Custom"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", gap: 6, flexShrink: 0 }}>
                    <Pressable
                      onPress={() => setCustomModalOpen(true)}
                      style={({ pressed }) => [
                        styles.clearChipBtn,
                        { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Ionicons name="create-outline" size={13} color={colors.textMuted} />
                      <Text style={[styles.clearChipText, { color: colors.textMuted }]}>Custom QR</Text>
                    </Pressable>
                    <Pressable
                      onPress={handleOpenTemplates}
                      style={({ pressed }) => [
                        styles.clearChipBtn,
                        { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.7 : 1 },
                      ]}
                    >
                      <Ionicons name="swap-horizontal" size={13} color={colors.textMuted} />
                      <Text style={[styles.clearChipText, { color: colors.textMuted }]}>Change type</Text>
                    </Pressable>
                  </View>
                </>
              ) : (
                <Pressable
                  onPress={handleOpenTemplates}
                  style={({ pressed }) => [
                    styles.clearChipBtn,
                    { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.7 : 1, paddingHorizontal: 14 },
                  ]}
                >
                  <Ionicons name="apps-outline" size={14} color={colors.textMuted} />
                  <Text style={[styles.clearChipText, { color: colors.textMuted }]}>Choose QR Type</Text>
                  <Ionicons name="chevron-forward" size={12} color={colors.textMuted} />
                </Pressable>
              )}
            </Reanimated.View>

            {/* Input fields */}
            <Reanimated.View entering={FadeInDown.duration(320).delay(60)} style={{ marginHorizontal: 20 }}>
              <InputSection
                selectedPreset={selectedPreset}
                inputValue={inputValue}
                extraFields={extraFields}
                qrMode={qrMode}
                isBranded={isBranded}
                businessCategory={businessCategory}
                setInputValue={setInputValue}
                setExtraField={setExtraField}
              />
            </Reanimated.View>

            {/* Business name (business mode only) */}
            {qrMode === "business" && (
              <Reanimated.View entering={FadeInDown.duration(320).delay(80)}>
                <View style={{ marginBottom: 16, marginHorizontal: 20 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>
                    Business Name (optional)
                  </Text>
                  <View style={[styles.fieldInput, { backgroundColor: colors.inputBackground, borderColor: colors.surfaceBorder }]}>
                    <Ionicons name="storefront-outline" size={16} color={colors.textMuted} style={{ marginTop: 2 }} />
                    <TextInput
                      style={[styles.fieldInputText, { color: colors.text, flex: 1 }]}
                      value={businessName}
                      onChangeText={setBusinessName}
                      placeholder="e.g. My Coffee Shop"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="words"
                      autoCorrect={false}
                    />
                  </View>
                </View>
              </Reanimated.View>
            )}

            {/* Customize drawer */}
            <Reanimated.View entering={FadeInDown.duration(340).delay(100)} style={{ marginHorizontal: 20 }}>
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

            {/* Generate button */}
            <Reanimated.View entering={FadeInDown.duration(360).delay(120)}>
              <Pressable
                onPress={handleGenerate}
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
            </Reanimated.View>

            {/* Group manager */}
            {savedDocId && (
              <Reanimated.View entering={FadeInDown.duration(350).springify()}>
                <Pressable
                  onPress={handleOpenGroupPicker}
                  style={({ pressed }) => [{
                    flexDirection: "row" as const,
                    alignItems: "center" as const,
                    justifyContent: "center" as const,
                    gap: 8,
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: "#6366F1" + "40",
                    paddingVertical: 11,
                    marginBottom: 16,
                    marginHorizontal: 20,
                    backgroundColor: "#6366F1" + "10",
                    opacity: pressed ? 0.8 : 1,
                  }]}
                >
                  <Ionicons name="folder-outline" size={16} color="#6366F1" />
                  <Text style={{ fontSize: 13, fontFamily: "Inter_600SemiBold", color: "#6366F1" }}>
                    Manage Groups
                  </Text>
                </Pressable>
              </Reanimated.View>
            )}

            {/* QR output card or empty placeholder */}
            {qrValue ? (
              <QrOutputCard
                qrValue={qrValue}
                qrSize={qrSize}
                isBranded={isBranded}
                privateMode={privateMode}
                qrMode={qrMode}
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
                businessDestination={qrMode === "business" ? inputValue.trim() : undefined}
                businessCategory={qrMode === "business" ? businessCategory : undefined}
                urlRiskScore={urlRiskScore}
                urlRiskReasons={urlRiskReasons}
                onSizeIncrease={handleSizeIncrease}
                onSizeDecrease={handleSizeDecrease}
                onCopy={handleCopy}
                onShare={handleShare}
                onDownload={handleDownloadPdf}
                onClear={handleClear}
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
                    {qrMode === "individual"
                      ? "Type above — protected QR previews live"
                      : qrMode === "business"
                        ? "Enter destination — Smart Redirect QR previews live"
                        : "Type above — private QR generates offline"}
                  </Text>
                </View>
              </Reanimated.View>
            )}
        </>
      </ScrollView>

      {/* ── TOAST ── */}
      {toastMsg ? (
        <Animated.View
          style={[
            styles.toast,
            { backgroundColor: colors.surface, borderColor: toastType === "error" ? colors.danger + "40" : colors.safe + "40" },
            { opacity: toastAnim, transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }], pointerEvents: "none" },
          ]}
        >
          <LinearGradient
            colors={toastType === "error" ? [colors.danger + "25", colors.danger + "10"] : [colors.safe + "25", colors.safe + "10"]}
            style={styles.toastIconWrap}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name={toastType === "error" ? "alert-circle" : "checkmark-circle"} size={18} color={toastType === "error" ? colors.danger : colors.safe} />
          </LinearGradient>
          <Text style={[styles.toastText, { color: toastType === "error" ? colors.danger : colors.safe }]}>{toastMsg}</Text>
        </Animated.View>
      ) : null}

      {/* ── MODALS ── */}
      <CustomQrModal
        visible={customModalOpen}
        onClose={() => setCustomModalOpen(false)}
        onConfirm={(presetIdx) => {
          handleSelectPreset(presetIdx);
          setCustomModalOpen(false);
        }}
      />
      <TemplatePickerModal visible={templateModalOpen} selectedPreset={selectedPreset} onSelect={handleSelectFromModal} onClose={handleCloseTemplates} />
      <PositionModal visible={positionModalOpen} logoPosition={logoPosition} onSelect={setLogoPosition} onClose={handleClosePosition} />
      <InfoModal visible={infoModalOpen} onClose={handleCloseInfo} />
      <GroupPickerModal visible={groupPickerOpen} onClose={handleCloseGroupPicker} qrDocId={savedDocId ?? ""} qrLabel={qrValue} />
    </View>
  );
}

function makeStyles(_c: unknown, width: number) {
  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (size: number) => Math.round(size * s);
  return StyleSheet.create({
    container: { flex: 1 },
    navBar: {
      flexDirection: "row",
      alignItems: "flex-start",
      justifyContent: "space-between",
      paddingHorizontal: 22,
      paddingVertical: 14,
      paddingBottom: 8,
    },
    navTitle: { fontSize: rf(20), fontFamily: "Inter_700Bold" },
    navSubtitle: {
      fontSize: rf(12),
      fontFamily: "Inter_400Regular",
      marginTop: 2,
    },
    infoBtn: {
      width: 38,
      height: 38,
      borderRadius: 19,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
    },
    createTopBar: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 10,
      borderBottomWidth: 0,
    },
    backBtn: {
      width: 38,
      height: 38,
      borderRadius: 12,
      borderWidth: 1,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    createTitleWrap: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      gap: 8,
      justifyContent: "center",
    },
    createModeDot: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    createTitle: {
      fontSize: 15,
      fontFamily: "Inter_700Bold",
    },
    scrollContent: { paddingHorizontal: 0, paddingTop: 4 },

    /* Type chip row (shown between mode cards and inline form) */
    typeChipRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 12,
      gap: 10,
    },
    typeChip: {
      flexDirection: "row",
      alignItems: "center",
      gap: 7,
      borderRadius: 20,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 7,
      flexShrink: 1,
    },
    typeChipDot: { width: 7, height: 7, borderRadius: 4 },
    typeChipLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
    clearChipBtn: {
      flexDirection: "row",
      alignItems: "center",
      gap: 5,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    clearChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

    modeSwitcherBar: {
      flexDirection: "row",
      borderRadius: 14,
      borderWidth: 1,
      overflow: "hidden",
      marginBottom: 10,
    },
    modeTab: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 5,
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderRadius: 13,
      margin: 3,
    },
    modeTabLabel: { fontSize: 11, fontFamily: "Inter_700Bold" },

    modeInfoStripe: {
      flexDirection: "row",
      alignItems: "flex-start",
      gap: 7,
      borderRadius: 12,
      borderWidth: 1,
      paddingHorizontal: 12,
      paddingVertical: 9,
      marginBottom: 12,
    },
    modeInfoText: {
      flex: 1,
      fontSize: 11,
      fontFamily: "Inter_400Regular",
      lineHeight: 16,
    },

    fieldLabel: {
      fontSize: 12,
      fontFamily: "Inter_600SemiBold",
      textTransform: "uppercase",
      letterSpacing: 0.8,
      marginBottom: 8,
    },
    fieldInput: {
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      borderRadius: 14,
      borderWidth: 1,
      paddingHorizontal: 14,
      paddingVertical: 12,
    },
    fieldInputText: { fontSize: 13, fontFamily: "Inter_400Regular" },

    generateBtnWrap: { marginBottom: 16, marginHorizontal: 20 },
    generateBtn: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: 10,
      paddingVertical: 14,
      borderRadius: 18,
    },
    generateBtnText: {
      fontSize: rf(15),
      fontFamily: "Inter_700Bold",
      color: "#fff",
    },
    emptyQr: {
      borderRadius: 20,
      borderWidth: 1,
      paddingVertical: 36,
      paddingHorizontal: 24,
      alignItems: "center",
      gap: 14,
      marginBottom: 20,
      marginHorizontal: 20,
    },
    emptyQrIconWrap: {
      width: 100,
      height: 100,
      borderRadius: 28,
      alignItems: "center",
      justifyContent: "center",
    },
    emptyQrText: {
      fontSize: rf(15),
      fontFamily: "Inter_700Bold",
      textAlign: "center",
    },
    emptyQrSub: {
      fontSize: rf(12),
      fontFamily: "Inter_400Regular",
      textAlign: "center",
    },
    toast: {
      position: "absolute",
      bottom: 110,
      left: 20,
      right: 20,
      borderRadius: 18,
      flexDirection: "row",
      alignItems: "center",
      gap: 10,
      paddingHorizontal: 16,
      paddingVertical: 14,
      borderWidth: 1,
      shadowColor: "#000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15,
      shadowRadius: 12,
      elevation: 10,
    },
    toastIconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      alignItems: "center",
      justifyContent: "center",
    },
    toastText: { fontSize: rf(14), fontFamily: "Inter_600SemiBold", flex: 1 },
  });
}

export default React.memo(QrGeneratorScreen);
