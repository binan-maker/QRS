import React, { useState, useMemo, useEffect, useRef } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Animated, useWindowDimensions, Keyboard } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import { useQrGenerator, LOGO_POSITIONS } from "@/hooks/useQrGenerator";
import ModeSelector from "@/features/generator/components/ModeSelector";
import SmartTemplateBar from "@/features/generator/components/SmartTemplateBar";
import TemplatePickerModal from "@/features/generator/components/TemplatePickerModal";
import InputSection from "@/features/generator/components/InputSection";
import QrOutputCard from "@/features/generator/components/QrOutputCard";
import InfoModal from "@/features/generator/components/InfoModal";
import PositionModal from "@/features/generator/components/PositionModal";
import CustomizeDrawer from "@/features/generator/components/CustomizeDrawer";
import GroupPickerModal from "@/components/groups/GroupPickerModal";
import GroupSelector from "@/components/groups/GroupSelector";
import { addQrToGroup } from "@/lib/firestore-service";

export default function QrGeneratorScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = 62 + insets.bottom + 8;
  const { width } = useWindowDimensions();

  const [qrSize, setQrSize] = useState(220);
  const [templateModalOpen, setTemplateModalOpen] = useState(false);
  const [groupPickerOpen, setGroupPickerOpen] = useState(false);
  const [selectedGroupId, setSelectedGroupId] = useState<string | null>(null);
  const autoAssignedRef = useRef<string | null>(null);

  useEffect(() => {
    if (!savedDocId || !selectedGroupId || !user) return;
    if (autoAssignedRef.current === savedDocId) return;
    autoAssignedRef.current = savedDocId;
    addQrToGroup(user.id, selectedGroupId, savedDocId).catch(() => {});
  }, [savedDocId, selectedGroupId, user?.id]);

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
    filterByKeyboardType, sharingQr, downloadingPdf,
  } = useQrGenerator();

  const styles = makeStyles(colors, width);

  const detectedType = useMemo(() => {
    const v = inputValue.trim();
    if (!v || selectedPreset > 0) return null;
    if (/^https?:\/\//i.test(v) || /^www\./i.test(v)) return "URL";
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return "Email";
    if (/^\+?[\d\s\-().]{7,}$/.test(v)) return "Phone";
    return null;
  }, [inputValue, selectedPreset]);

  function getLogoPositionLabel() {
    return LOGO_POSITIONS.find((p) => p.key === logoPosition)?.label || "Center";
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset }]}>
      {/* Header */}
      <View style={styles.navBar}>
        <View>
          <Text style={[styles.navTitle, { color: colors.text }]}>QR Generator</Text>
          <Text style={[styles.navSubtitle, { color: colors.textMuted }]}>Create custom QR codes</Text>
        </View>
        <Pressable
          onPress={() => setInfoModalOpen(true)}
          style={[styles.infoBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          <Ionicons name="information-circle-outline" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <Reanimated.View entering={FadeInDown.duration(400)}>
          <ModeSelector
            user={user}
            qrMode={qrMode}
            businessName={businessName}
            businessCategory={businessCategory}
            setQrMode={setQrMode}
            setBusinessName={setBusinessName}
            switchBusinessCategory={switchBusinessCategory}
          />
        </Reanimated.View>

        <Reanimated.View entering={FadeInDown.duration(400).delay(80)}>
          <SmartTemplateBar
            selectedPreset={selectedPreset}
            detectedType={detectedType}
            onOpenTemplates={() => {
              Keyboard.dismiss();
              setTimeout(() => setTemplateModalOpen(true), 80);
            }}
            onClearTemplate={() => switchPreset(0)}
          />
        </Reanimated.View>

        <Reanimated.View entering={FadeInDown.duration(400).delay(140)}>
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

        <Reanimated.View entering={FadeInDown.duration(400).delay(180)}>
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
            logoPositionLabel={getLogoPositionLabel()}
            onPickLogo={handlePickCustomLogo}
            onRemoveLogo={handleRemoveLogo}
            onToggleDefaultLogo={handleToggleDefaultLogo}
            onOpenPosition={() => setPositionModalOpen(true)}
          />
        </Reanimated.View>

        {user && !!qrValue && (
          <Reanimated.View entering={FadeInDown.duration(400).delay(195)}>
            <GroupSelector
              selectedGroupId={selectedGroupId}
              onSelect={(gid) => {
                setSelectedGroupId(gid);
                autoAssignedRef.current = null;
              }}
            />
          </Reanimated.View>
        )}

        <Reanimated.View entering={FadeInDown.duration(400).delay(200)}>
          {(() => {
            const hasLiveQr = !!qrValue;
            const isRegistered = !!generatedUuid;
            const canSave = user && !privateMode;

            let btnLabel = "Generate QR Code";
            let btnIcon: React.ComponentProps<typeof MaterialCommunityIcons>["name"] = "qrcode-edit";
            let btnColors: [string, string] = [colors.primary, colors.primaryShade];

            if (hasLiveQr && canSave && !isRegistered) {
              btnLabel = qrMode === "business" ? "Activate Living Shield" : "Save to Profile";
              btnIcon = qrMode === "business" ? "shield-check" : "content-save-outline";
              btnColors = qrMode === "business"
                ? [colors.warning, (colors as any).warningShade ?? colors.warning]
                : [colors.safe, (colors as any).safeShade ?? colors.safe];
            } else if (hasLiveQr && isRegistered) {
              btnLabel = "Registered ✓";
              btnIcon = "check-circle-outline";
              btnColors = [colors.safe, (colors as any).safeShade ?? colors.safe];
            } else if (hasLiveQr && privateMode) {
              btnLabel = "Private QR Generated ✓";
              btnIcon = "eye-off-outline";
              btnColors = [colors.textSecondary, colors.textMuted];
            }

            return (
              <Pressable
                onPress={handleGenerate}
                style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }, styles.generateBtnWrap]}
              >
                <LinearGradient
                  colors={btnColors}
                  style={styles.generateBtn}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialCommunityIcons name={btnIcon} size={22} color="#fff" />
                  <Text style={styles.generateBtnText}>{btnLabel}</Text>
                </LinearGradient>
              </Pressable>
            );
          })()}
        </Reanimated.View>

        {savedDocId && (
          <Reanimated.View entering={FadeInDown.duration(350).springify()}>
            <Pressable
              onPress={() => setGroupPickerOpen(true)}
              style={({ pressed }) => [{
                flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
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
            logoPositionLabel={getLogoPositionLabel()}
            qrFgColor={qrFgColor}
            qrBgColor={qrBgColor}
            onSizeIncrease={() => setQrSize((s) => Math.min(320, s + 20))}
            onSizeDecrease={() => setQrSize((s) => Math.max(160, s - 20))}
            onCopy={handleCopy}
            onShare={handleShare}
            onDownload={handleDownloadPdf}
            onClear={() => { handleClear(); autoAssignedRef.current = null; }}
            sharingQr={sharingQr}
            downloadingPdf={downloadingPdf}
          />
        ) : (
          <Reanimated.View entering={FadeIn.duration(400)}>
            <View style={[styles.emptyQr, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <LinearGradient
                colors={colors.isDark ? ["rgba(0,229,255,0.12)", "rgba(0,111,255,0.08)"] : ["rgba(0,111,255,0.08)", "rgba(0,71,204,0.05)"]}
                style={styles.emptyQrIconWrap}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="qrcode-scan" size={52} color={colors.primary} />
              </LinearGradient>
              <Text style={[styles.emptyQrText, { color: colors.text }]}>Your QR code will appear here</Text>
              <Text style={[styles.emptyQrSub, { color: colors.textMuted }]}>Just start typing — your QR generates automatically</Text>
            </View>
          </Reanimated.View>
        )}
      </ScrollView>

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

      <TemplatePickerModal
        visible={templateModalOpen}
        selectedPreset={selectedPreset}
        onSelect={switchPreset}
        onClose={() => setTemplateModalOpen(false)}
      />

      <PositionModal
        visible={positionModalOpen}
        logoPosition={logoPosition}
        onSelect={setLogoPosition}
        onClose={() => setPositionModalOpen(false)}
      />

      <InfoModal visible={infoModalOpen} onClose={() => setInfoModalOpen(false)} />

      <GroupPickerModal
        visible={groupPickerOpen}
        onClose={() => setGroupPickerOpen(false)}
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
      width: 42, height: 42, borderRadius: 21,
      borderWidth: 1, alignItems: "center", justifyContent: "center",
      marginTop: 4,
    },
    scrollContent: { paddingHorizontal: 20, paddingTop: 8 },
    generateBtnWrap: { marginBottom: 24 },
    generateBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
      paddingVertical: 13, borderRadius: 20,
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
    emptyQrText: { fontSize: rf(16), fontFamily: "Inter_700Bold", textAlign: "center" },
    emptyQrSub: { fontSize: rf(13), fontFamily: "Inter_400Regular", textAlign: "center" },
    toast: {
      position: "absolute", bottom: 110, left: 20, right: 20, borderRadius: 18,
      flexDirection: "row", alignItems: "center", gap: 10,
      paddingHorizontal: 16, paddingVertical: 14,
      borderWidth: 1,
      shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.15, shadowRadius: 12, elevation: 10,
    },
    toastIconWrap: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center" },
    toastText: { fontSize: rf(14), fontFamily: "Inter_600SemiBold", flex: 1 },
  });
}
