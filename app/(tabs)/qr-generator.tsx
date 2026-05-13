import React, { useState, useMemo, useCallback } from "react";
import {
  View, Text, StyleSheet, Pressable, ScrollView, TextInput,
  Platform, Animated, useWindowDimensions, Keyboard,
} from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, { FadeIn, FadeInDown, SlideInRight, SlideInLeft } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import { useQrGenerator, LOGO_POSITIONS } from "@/hooks/useQrGenerator";
import TypePickerHome from "@/features/generator/components/TypePickerHome";
import SmartTemplateBar from "@/features/generator/components/SmartTemplateBar";
import TemplatePickerModal from "@/features/generator/components/TemplatePickerModal";
import CustomQrBuilderModal from "@/features/generator/components/CustomQrBuilderModal";
import InputSection from "@/features/generator/components/InputSection";
import QrOutputCard from "@/features/generator/components/QrOutputCard";
import InfoModal from "@/features/generator/components/InfoModal";
import PositionModal from "@/features/generator/components/PositionModal";
import CustomizeDrawer from "@/features/generator/components/CustomizeDrawer";
import GroupPickerModal from "@/components/groups/GroupPickerModal";
import { QR_PRESETS } from "@/features/generator/data/presets";
import type { BusinessCategory } from "@/features/generator/components/BusinessTypeSelector";

type GeneratorView = "home" | "create";

type QrMode = "individual" | "business" | "private";

const MODE_DEFS: { key: QrMode; label: string; icon: keyof typeof Ionicons.glyphMap; color: string; sub: string }[] = [
  { key: "individual", label: "Standard", icon: "bookmark-outline", color: "#3B82F6", sub: "Saved, secure" },
  { key: "business",   label: "Business", icon: "storefront-outline", color: "#F59E0B", sub: "Smart Redirect" },
  { key: "private",    label: "Private",  icon: "eye-off-outline",  color: "#64748B", sub: "No trace" },
];

function QrGeneratorScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = 62 + insets.bottom + 8;
  const { width } = useWindowDimensions();

  const [view, setView] = useState<GeneratorView>("home");
  const [qrSize, setQrSize] = useState(220);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [customBuilderOpen, setCustomBuilderOpen] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);

  const {
    user, svgRef,
    selectedPreset, inputValue, setInputValue,
    extraFields, setExtraField,
    qrValue, qrMode, setQrMode,
    businessName, setBusinessName,
    businessCategory, switchBusinessCategory,
    customLogoUri, showDefaultLogo, logoPosition, setLogoPosition,
    selectedThemeIdx, setSelectedThemeIdx,
    isCustomTheme, customFgColor, customBgColor, setCustomFgColor, setCustomBgColor,
    advancedSettings, setAdvancedSettings,
    qrFgColor, qrBgColor,
    generatedUuid, generatedAt,
    infoModalOpen, setInfoModalOpen,
    positionModalOpen, setPositionModalOpen,
    saving, savedToProfile, savedDocId,
    toastMsg, toastType, toastAnim,
    preset, isBranded, privateMode,
    switchPreset, handleGenerate,
    handlePickCustomLogo, handleRemoveLogo, handleToggleDefaultLogo,
    handleCopy, handleShare, handleDownloadPdf, handleClear,
    sharingQr, downloadingPdf,
    urlRiskScore, urlRiskReasons,
  } = useQrGenerator();

  const styles = useMemo(() => makeStyles(colors, width), [colors, width]);

  const logoPositionLabel = useMemo(
    () => LOGO_POSITIONS.find((p) => p.key === logoPosition)?.label || "Center",
    [logoPosition]
  );

  const buttonState = useMemo(() => {
    const hasLiveQr = !!qrValue;
    const isRegistered = !!generatedUuid;
    const canSave = user && !privateMode;

    let btnLabel = "Generate QR Code";
    let btnIcon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] = "qrcode-edit";
    let btnColors: [string, string] = [colors.primary, colors.primaryShade];

    if (hasLiveQr && canSave && !isRegistered) {
      if (qrMode === "business") {
        btnLabel = "Activate Smart Redirect";
        btnIcon = "shield-check";
        btnColors = [colors.warning, (colors as any).warningShade ?? colors.warning];
      } else {
        btnLabel = "Save Protected QR";
        btnIcon = "shield-lock-outline";
        btnColors = [colors.safe, (colors as any).safeShade ?? colors.safe];
      }
    } else if (hasLiveQr && isRegistered) {
      btnLabel = qrMode === "business" ? "Smart Redirect Active ✓" : "Protected QR Saved ✓";
      btnIcon = "check-circle-outline";
      btnColors = [colors.safe, (colors as any).safeShade ?? colors.safe];
    } else if (hasLiveQr && privateMode) {
      btnLabel = "Private QR Generated ✓";
      btnIcon = "eye-off-outline";
      btnColors = [colors.textSecondary, colors.textMuted];
    }

    return { btnLabel, btnIcon, btnColors };
  }, [qrValue, generatedUuid, user, privateMode, qrMode, colors]);

  const handleModeSwitch = useCallback((newMode: QrMode) => {
    if (newMode === "business" && !user) return;
    setQrMode(newMode);
    switchPreset(selectedPreset);
  }, [setQrMode, switchPreset, selectedPreset, user]);

  const handleSelectPreset = useCallback((idx: number) => {
    switchPreset(idx);
    setView("create");
  }, [switchPreset]);

  const handleSelectBusinessCategory = useCallback((cat: BusinessCategory) => {
    setQrMode("business");
    switchBusinessCategory(cat);
    setView("create");
  }, [setQrMode, switchBusinessCategory]);

  const handleSetHomeMode = useCallback((mode: QrMode) => {
    if (mode === "business" && !user) return;
    setQrMode(mode);
  }, [setQrMode, user]);

  const handleOpenTemplates = useCallback(() => {
    Keyboard.dismiss();
    setTimeout(() => setTemplateModalOpen(true), 80);
  }, []);

  const handleOpenTemplatesFromHome = useCallback(() => {
    setTemplateModalOpen(true);
  }, []);

  const handleSelectFromModal = useCallback((idx: number) => {
    switchPreset(idx);
    setView("create");
  }, [switchPreset]);

  const handleCustomGenerate = useCallback((content: string, label: string) => {
    switchPreset(0);
    setInputValue(content);
    setView("create");
  }, [switchPreset, setInputValue]);

  const handleBackToHome = useCallback(() => {
    setView("home");
    handleClear();
  }, [handleClear]);

  const handleSizeIncrease = useCallback(() => setQrSize((s) => Math.min(320, s + 20)), []);
  const handleSizeDecrease = useCallback(() => setQrSize((s) => Math.max(160, s - 20)), []);
  const handleOpenPosition = useCallback(() => setPositionModalOpen(true), [setPositionModalOpen]);
  const handleOpenInfo = useCallback(() => setInfoModalOpen(true), [setInfoModalOpen]);
  const handleCloseTemplates = useCallback(() => setTemplateModalOpen(false), []);
  const handleClosePosition = useCallback(() => setPositionModalOpen(false), [setPositionModalOpen]);
  const handleCloseInfo = useCallback(() => setInfoModalOpen(false), [setInfoModalOpen]);
  const handleOpenGroupPicker = useCallback(() => setGroupPickerOpen(true), []);
  const handleCloseGroupPicker = useCallback(() => setGroupPickerOpen(false), []);

  const selectedPresetDef = QR_PRESETS[selectedPreset];
  const activeModeColor = MODE_DEFS.find((m) => m.key === qrMode)?.color ?? colors.primary;

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset }]}>

      {/* ── HOME VIEW ── */}
      {view === "home" && (
        <Reanimated.View entering={SlideInLeft.duration(260)} style={{ flex: 1 }}>
          <View style={styles.navBar}>
            <View>
              <Text style={[styles.navTitle, { color: colors.text }]}>QR Generator</Text>
              <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>
                Create secure, trusted QR codes
              </Text>
            </View>
            <Pressable
              onPress={handleOpenInfo}
              style={[styles.infoBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
            >
              <Ionicons name="information-circle-outline" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          <TypePickerHome
            qrMode={qrMode}
            onSetMode={handleSetHomeMode}
            onSelectPreset={handleSelectPreset}
            onSelectBusinessCategory={handleSelectBusinessCategory}
            onOpenTemplates={handleOpenTemplatesFromHome}
            onOpenCustom={() => setCustomBuilderOpen(true)}
            user={user}
          />
        </Reanimated.View>
      )}

      {/* ── CREATE VIEW ── */}
      {view === "create" && (
        <Reanimated.View entering={SlideInRight.duration(260)} style={{ flex: 1 }}>
          {/* Slim top bar */}
          <View style={[styles.createTopBar, { borderBottomColor: colors.surfaceBorder }]}>
            <Pressable
              onPress={handleBackToHome}
              style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
            >
              <Ionicons name="chevron-back" size={18} color={colors.textSecondary} />
            </Pressable>

            {qrMode !== "business" ? (
              <Pressable
                onPress={handleOpenTemplates}
                style={[styles.typeChip, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}
              >
                <Ionicons
                  name={(selectedPresetDef?.icon ?? "qr-code-outline") as keyof typeof Ionicons.glyphMap}
                  size={14}
                  color={colors.primary}
                />
                <Text style={[styles.typeChipText, { color: colors.primary }]} numberOfLines={1}>
                  {selectedPresetDef?.label ?? "QR Type"}
                </Text>
                <Ionicons name="chevron-down" size={12} color={colors.primary} />
              </Pressable>
            ) : (
              <View style={[styles.typeChip, { backgroundColor: "#F59E0B" + "18", borderColor: "#F59E0B" + "40", flex: 1 }]}>
                <Ionicons name="storefront-outline" size={14} color="#F59E0B" />
                <Text style={[styles.typeChipText, { color: "#F59E0B" }]} numberOfLines={1}>
                  Business — Smart Redirect
                </Text>
              </View>
            )}

            <Pressable
              onPress={handleOpenInfo}
              style={[styles.infoBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
            >
              <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
            </Pressable>
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
            keyboardShouldPersistTaps="handled"
          >
            {/* ── Mode Switcher Bar ── */}
            <Reanimated.View entering={FadeInDown.duration(260)}>
              <View style={[styles.modeSwitcherBar, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
                {MODE_DEFS.map((m) => {
                  const active = qrMode === m.key;
                  const disabled = m.key === "business" && !user;
                  return (
                    <Pressable
                      key={m.key}
                      onPress={() => !disabled && handleModeSwitch(m.key)}
                      style={[
                        styles.modeTab,
                        active && { backgroundColor: m.color + "20", borderColor: m.color + "60", borderWidth: 1 },
                      ]}
                    >
                      <Ionicons name={m.icon} size={13} color={active ? m.color : colors.textMuted} />
                      <Text style={[styles.modeTabLabel, { color: active ? m.color : colors.textMuted, opacity: disabled ? 0.45 : 1 }]}>
                        {m.label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </Reanimated.View>

            {/* ── Mode info stripe ── */}
            <Reanimated.View entering={FadeInDown.duration(280).delay(20)}>
              <View style={[styles.modeInfoStripe, {
                backgroundColor: activeModeColor + "0D",
                borderColor: activeModeColor + "28",
              }]}>
                <Ionicons
                  name={
                    qrMode === "individual" ? "shield-checkmark-outline"
                    : qrMode === "business" ? "sync-outline"
                    : "eye-off-outline"
                  }
                  size={12}
                  color={activeModeColor}
                  style={{ flexShrink: 0, marginTop: 1 }}
                />
                <Text style={[styles.modeInfoText, { color: activeModeColor }]} numberOfLines={2}>
                  {qrMode === "individual" && "QR encodes a qrguard.app/go/ID link — only our database reveals the real content."}
                  {qrMode === "business"   && "Change the destination anytime — no reprint needed. QR encodes a /guard/ID link."}
                  {qrMode === "private"    && "Raw content baked directly into the QR. No server, no database, no tracking."}
                </Text>
              </View>
            </Reanimated.View>

            {/* Template quick-switcher (hidden for business) */}
            {qrMode !== "business" && (
              <Reanimated.View entering={FadeInDown.duration(300).delay(40)}>
                <SmartTemplateBar
                  selectedPreset={selectedPreset}
                  qrMode={qrMode}
                  onSelectPreset={switchPreset}
                  onOpenTemplates={handleOpenTemplates}
                />
              </Reanimated.View>
            )}

            {/* Input */}
            <Reanimated.View entering={FadeInDown.duration(320).delay(60)}>
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
                <View style={{ marginBottom: 16 }}>
                  <Text style={[styles.fieldLabel, { color: colors.textMuted }]}>Business Name (optional)</Text>
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
            <Reanimated.View entering={FadeInDown.duration(340).delay(100)}>
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
                    flexDirection: "row" as const, alignItems: "center" as const, justifyContent: "center" as const, gap: 8,
                    borderRadius: 16, borderWidth: 1,
                    borderColor: "#6366F1" + "40",
                    paddingVertical: 11, marginBottom: 16,
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

            {/* QR output */}
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
                  <Text style={[styles.emptyQrText, { color: colors.text }]}>
                    Your QR appears here
                  </Text>
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
          </ScrollView>
        </Reanimated.View>
      )}

      {/* ── TOAST ── */}
      {toastMsg ? (
        <Animated.View
          style={[
            styles.toast,
            {
              backgroundColor: colors.surface,
              borderColor: toastType === "error" ? colors.danger + "40" : colors.safe + "40",
            },
            {
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
              pointerEvents: "none",
            },
          ]}
        >
          <LinearGradient
            colors={toastType === "error"
              ? [colors.danger + "25", colors.danger + "10"]
              : [colors.safe + "25", colors.safe + "10"]}
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

      {/* ── MODALS ── */}
      <TemplatePickerModal
        visible={templateModalOpen}
        selectedPreset={selectedPreset}
        onSelect={handleSelectFromModal}
        onClose={handleCloseTemplates}
      />

      <CustomQrBuilderModal
        visible={customBuilderOpen}
        onClose={() => setCustomBuilderOpen(false)}
        onGenerate={handleCustomGenerate}
      />

      <PositionModal
        visible={positionModalOpen}
        logoPosition={logoPosition}
        onSelect={setLogoPosition}
        onClose={handleClosePosition}
      />

      <InfoModal visible={infoModalOpen} onClose={handleCloseInfo} />

      <GroupPickerModal
        visible={groupPickerOpen}
        onClose={handleCloseGroupPicker}
        qrDocId={savedDocId ?? ""}
        qrLabel={qrValue}
      />
    </View>
  );
}

function makeStyles(_c: unknown, width: number) {
  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (size: number) => Math.round(size * s);
  return StyleSheet.create({
    container: { flex: 1 },
    navBar: {
      flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
      paddingHorizontal: 22, paddingVertical: 14, paddingBottom: 8,
    },
    navTitle: { fontSize: rf(20), fontFamily: "Inter_700Bold" },
    navSubtitle: { fontSize: rf(12), fontFamily: "Inter_400Regular", marginTop: 2 },
    infoBtn: {
      width: 38, height: 38, borderRadius: 19,
      borderWidth: 1, alignItems: "center", justifyContent: "center",
    },
    createTopBar: {
      flexDirection: "row", alignItems: "center", gap: 10,
      paddingHorizontal: 16, paddingVertical: 10,
      borderBottomWidth: 0,
    },
    backBtn: {
      width: 38, height: 38, borderRadius: 12,
      borderWidth: 1, alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    },
    typeChip: {
      flex: 1, flexDirection: "row", alignItems: "center", gap: 6,
      borderRadius: 12, borderWidth: 1,
      paddingHorizontal: 12, paddingVertical: 9,
    },
    typeChipText: { flex: 1, fontSize: 13, fontFamily: "Inter_700Bold" },
    scrollContent: { paddingHorizontal: 20, paddingTop: 8 },

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
      fontSize: 12, fontFamily: "Inter_600SemiBold",
      textTransform: "uppercase", letterSpacing: 0.8, marginBottom: 8,
    },
    fieldInput: {
      flexDirection: "row", alignItems: "center", gap: 10,
      borderRadius: 14, borderWidth: 1,
      paddingHorizontal: 14, paddingVertical: 12,
    },
    fieldInputText: { fontSize: 13, fontFamily: "Inter_400Regular" },

    generateBtnWrap: { marginBottom: 16 },
    generateBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
      paddingVertical: 14, borderRadius: 20,
    },
    generateBtnText: { fontSize: rf(15), fontFamily: "Inter_700Bold", color: "#fff" },
    emptyQr: {
      borderRadius: 24, borderWidth: 1, padding: 44,
      alignItems: "center", gap: 14, marginBottom: 20,
    },
    emptyQrIconWrap: {
      width: 100, height: 100, borderRadius: 28,
      alignItems: "center", justifyContent: "center",
    },
    emptyQrText: { fontSize: rf(15), fontFamily: "Inter_700Bold", textAlign: "center" },
    emptyQrSub: { fontSize: rf(12), fontFamily: "Inter_400Regular", textAlign: "center" },
    toast: {
      position: "absolute", bottom: 110, left: 20, right: 20, borderRadius: 18,
      flexDirection: "row", alignItems: "center", gap: 10,
      paddingHorizontal: 16, paddingVertical: 14,
      borderWidth: 1,
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.15, shadowRadius: 12, elevation: 10,
    },
    toastIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    toastText: { fontSize: rf(14), fontFamily: "Inter_600SemiBold", flex: 1 },
  });
}

export default React.memo(QrGeneratorScreen);
