import { useState } from "react";
import { View, Text, StyleSheet, Pressable, ScrollView, Platform, Animated } from "react-native";
import { shadow } from "@/lib/utils/platform";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Reanimated, { FadeIn, FadeInDown } from "react-native-reanimated";
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
  const tabBarHeight = 60 + insets.bottom;

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

  const styles = makeStyles(colors);

  function getLogoPositionLabel() {
    return LOGO_POSITIONS.find((p) => p.key === logoPosition)?.label || "Center";
  }

  return (
    <View style={[styles.container, { paddingTop: topInset }]}>
      <View style={styles.navBar}>
        <Text style={styles.navTitle}>QR Generator</Text>
        <Pressable onPress={() => setInfoModalOpen(true)} style={styles.infoBtn}>
          <Ionicons name="information-circle-outline" size={22} color={colors.textSecondary} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: tabBarHeight + 20 }]}
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
            style={({ pressed }) => [styles.generateBtn, { opacity: pressed ? 0.8 : 1 }]}
          >
            <MaterialCommunityIcons name="qrcode-edit" size={22} color={colors.primaryText} />
            <Text style={styles.generateBtnText}>Generate QR Code</Text>
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
          <Reanimated.View entering={FadeIn.duration(400)} style={styles.emptyQr}>
            <View style={styles.emptyQrPlaceholder}>
              <MaterialCommunityIcons name="qrcode-scan" size={64} color={colors.textMuted} />
            </View>
            <Text style={styles.emptyQrText}>Your QR code will appear here</Text>
            <Text style={styles.emptyQrSub}>Enter content above and tap Generate</Text>
          </Reanimated.View>
        )}
      </ScrollView>

      {toastMsg ? (
        <Animated.View
          style={[
            styles.toast,
            toastType === "error" ? styles.toastError : styles.toastSuccess,
            {
              opacity: toastAnim,
              transform: [{ translateY: toastAnim.interpolate({ inputRange: [0, 1], outputRange: [20, 0] }) }],
              pointerEvents: "none",
            },
          ]}
        >
          <Ionicons
            name={toastType === "error" ? "alert-circle" : "checkmark-circle"}
            size={18}
            color={toastType === "error" ? colors.danger : colors.safe}
          />
          <Text style={[styles.toastText, toastType === "error" ? { color: colors.danger } : { color: colors.safe }]}>
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

function makeStyles(c: ReturnType<typeof import("@/contexts/ThemeContext").useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    navBar: {
      flexDirection: "row", alignItems: "center", justifyContent: "space-between",
      paddingHorizontal: 20, paddingVertical: 14,
      borderBottomWidth: 1, borderBottomColor: c.surfaceBorder,
    },
    navTitle: { fontSize: 22, fontFamily: "Inter_700Bold", color: c.text },
    infoBtn: {
      width: 40, height: 40, borderRadius: 20,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder,
      alignItems: "center", justifyContent: "center",
    },
    scrollContent: { padding: 20 },
    generateBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
      backgroundColor: c.primary, paddingVertical: 16, borderRadius: 16, marginBottom: 24,
    },
    generateBtnText: { fontSize: 17, fontFamily: "Inter_700Bold", color: c.primaryText },
    emptyQr: {
      backgroundColor: c.surface, borderRadius: 20,
      borderWidth: 1, borderColor: c.surfaceBorder,
      padding: 40, alignItems: "center", gap: 12,
    },
    emptyQrPlaceholder: {
      width: 100, height: 100, borderRadius: 20,
      backgroundColor: c.surfaceLight,
      alignItems: "center", justifyContent: "center",
    },
    emptyQrText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.textSecondary },
    emptyQrSub: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textMuted },
    toast: {
      position: "absolute", bottom: 100, left: 20, right: 20, borderRadius: 14,
      flexDirection: "row", alignItems: "center", gap: 10,
      paddingHorizontal: 16, paddingVertical: 14,
      backgroundColor: c.surface, borderWidth: 1,
      ...shadow(10, "#000", 0.2, 0, 4, 8),
    },
    toastSuccess: { borderColor: c.safe + "50" },
    toastError: { borderColor: c.danger + "50" },
    toastText: { fontSize: 14, fontFamily: "Inter_500Medium", flex: 1 },
  });
}
