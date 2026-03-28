import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Animated, useWindowDimensions } from "react-native";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import { useQrGenerator, LOGO_POSITIONS } from "@/hooks/useQrGenerator";
import ModeSelector from "@/features/generator/components/ModeSelector";
import ContentTypeSelector from "@/features/generator/components/ContentTypeSelector";
import InputSection from "@/features/generator/components/InputSection";
import LogoSection from "@/features/generator/components/LogoSection";
import QrOutputCard from "@/features/generator/components/QrOutputCard";
import InfoModal from "@/features/generator/components/InfoModal";
import PositionModal from "@/features/generator/components/PositionModal";

export default function QrGeneratorScreen() {
  const insets = useSafeAreaInsets();
  const { colors } = useTheme();
  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const tabBarHeight = 62 + insets.bottom + 8;
  const { width } = useWindowDimensions();

  const [qrSize, setQrSize] = useState(220);

  const {
    user, svgRef,
    selectedPreset, inputValue, setInputValue,
    extraFields, setExtraField,
    qrValue, qrMode, setQrMode,
    businessName, setBusinessName,
    customLogoUri, showDefaultLogo, logoPosition, setLogoPosition,
    generatedUuid, generatedAt,
    infoModalOpen, setInfoModalOpen,
    positionModalOpen, setPositionModalOpen,
    saving, savedToProfile,
    toastMsg, toastType, toastAnim,
    preset, isBranded, privateMode,
    switchPreset, handleGenerate,
    handlePickCustomLogo, handleRemoveLogo, handleToggleDefaultLogo,
    handleCopy, handleShare, handleDownloadPdf, handleClear,
    filterByKeyboardType, sharingQr, downloadingPdf,
  } = useQrGenerator();

  const styles = makeStyles(colors, width);

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
            setQrMode={setQrMode}
            setBusinessName={setBusinessName}
          />
        </Reanimated.View>

        {qrMode !== "business" && (
          <Reanimated.View entering={FadeInDown.duration(400).delay(80)}>
            <ContentTypeSelector selectedPreset={selectedPreset} onSelect={switchPreset} />
          </Reanimated.View>
        )}

        <Reanimated.View entering={FadeInDown.duration(400).delay(140)}>
          <InputSection
            selectedPreset={selectedPreset}
            inputValue={inputValue}
            extraFields={extraFields}
            qrMode={qrMode}
            isBranded={isBranded}
            setInputValue={setInputValue}
            setExtraField={setExtraField}
          />
        </Reanimated.View>

        <Reanimated.View entering={FadeInDown.duration(400).delay(180)}>
          <LogoSection
            customLogoUri={customLogoUri}
            showDefaultLogo={showDefaultLogo}
            logoPositionLabel={getLogoPositionLabel()}
            onPickLogo={handlePickCustomLogo}
            onRemoveLogo={handleRemoveLogo}
            onToggleDefaultLogo={handleToggleDefaultLogo}
            onOpenPosition={() => setPositionModalOpen(true)}
          />
        </Reanimated.View>

        <Reanimated.View entering={FadeInDown.duration(400).delay(220)}>
          <Pressable
            onPress={handleGenerate}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] }, styles.generateBtnWrap]}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryShade]}
              style={styles.generateBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <MaterialCommunityIcons name="qrcode-edit" size={22} color="#fff" />
              <Text style={styles.generateBtnText}>Generate QR Code</Text>
            </LinearGradient>
          </Pressable>
        </Reanimated.View>

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
            user={user}
            svgRef={svgRef}
            logoPositionLabel={getLogoPositionLabel()}
            onSizeIncrease={() => setQrSize((s) => Math.min(320, s + 20))}
            onSizeDecrease={() => setQrSize((s) => Math.max(160, s - 20))}
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
                colors={colors.isDark ? ["rgba(0,229,255,0.12)", "rgba(0,111,255,0.08)"] : ["rgba(0,111,255,0.08)", "rgba(0,71,204,0.05)"]}
                style={styles.emptyQrIconWrap}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <MaterialCommunityIcons name="qrcode-scan" size={52} color={colors.primary} />
              </LinearGradient>
              <Text style={[styles.emptyQrText, { color: colors.text }]}>Your QR code will appear here</Text>
              <Text style={[styles.emptyQrSub, { color: colors.textMuted }]}>Fill in the details above and tap Generate</Text>
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

function makeStyles(_c: unknown, width: number) {
  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (size: number) => Math.round(size * s);
  return StyleSheet.create({
    container: { flex: 1 },
    navBar: {
      flexDirection: "row", alignItems: "flex-start", justifyContent: "space-between",
      paddingHorizontal: 22, paddingVertical: 14, paddingBottom: 8,
    },
    navTitle: { fontSize: rf(26), fontFamily: "Inter_700Bold" },
    navSubtitle: { fontSize: rf(13), fontFamily: "Inter_400Regular", marginTop: 2 },
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
