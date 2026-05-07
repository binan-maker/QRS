import React, { memo } from "react";
import { View, Text, StyleSheet, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "@/lib/haptics";
import { router } from "expo-router";
import { useTheme } from "@/contexts/ThemeContext";
import BusinessTypeSelector, { type BusinessCategory } from "./BusinessTypeSelector";

type QrMode = "individual" | "business" | "private";

interface Props {
  user: any;
  qrMode: QrMode;
  businessName: string;
  businessCategory: BusinessCategory;
  setQrMode: (mode: QrMode) => void;
  setBusinessName: (name: string) => void;
  switchBusinessCategory: (cat: BusinessCategory) => void;
}

function ModeSelector({ user, qrMode, businessName, businessCategory, setQrMode, setBusinessName, switchBusinessCategory }: Props) {
  const { colors } = useTheme();

  function handleMode(mode: QrMode) {
    setQrMode(mode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <>
      <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Save as</Text>
      <View style={styles.modeRow}>
        {user ? (
          <>
            <Pressable
              onPress={() => handleMode("individual")}
              style={[
                styles.modeBtn,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                qrMode === "individual" && { backgroundColor: colors.primaryDim, borderColor: colors.primary },
              ]}
            >
              <Ionicons name="bookmark-outline" size={14} color={qrMode === "individual" ? colors.primary : colors.textMuted} />
              <Text style={[styles.modeBtnText, { color: qrMode === "individual" ? colors.primary : colors.textMuted }]} maxFontSizeMultiplier={1}>Saved</Text>
            </Pressable>
            <Pressable
              onPress={() => handleMode("business")}
              style={[
                styles.modeBtn,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                qrMode === "business" && { backgroundColor: colors.warningDim, borderColor: colors.warning + "60" },
              ]}
            >
              <Ionicons name="storefront-outline" size={14} color={qrMode === "business" ? colors.warning : colors.textMuted} />
              <Text style={[styles.modeBtnText, { color: qrMode === "business" ? colors.warning : colors.textMuted }]} maxFontSizeMultiplier={1}>Business</Text>
            </Pressable>
            <Pressable
              onPress={() => handleMode("private")}
              style={[
                styles.modeBtn,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                qrMode === "private" && { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder },
              ]}
            >
              <Ionicons name="eye-off-outline" size={14} color={qrMode === "private" ? colors.textSecondary : colors.textMuted} />
              <Text style={[styles.modeBtnText, { color: qrMode === "private" ? colors.textSecondary : colors.textMuted }]} maxFontSizeMultiplier={1}>Private</Text>
            </Pressable>
          </>
        ) : (
          <>
            <Pressable
              onPress={() => handleMode("individual")}
              style={[
                styles.modeBtn,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                qrMode !== "private" && { backgroundColor: colors.primaryDim, borderColor: colors.primary },
              ]}
            >
              <Ionicons name="shield-checkmark" size={14} color={qrMode !== "private" ? colors.primary : colors.textMuted} />
              <Text style={[styles.modeBtnText, { color: qrMode !== "private" ? colors.primary : colors.textMuted }]} maxFontSizeMultiplier={1}>Standard</Text>
            </Pressable>
            <Pressable
              onPress={() => handleMode("private")}
              style={[
                styles.modeBtn,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                qrMode === "private" && { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder },
              ]}
            >
              <Ionicons name="eye-off-outline" size={14} color={qrMode === "private" ? colors.textSecondary : colors.textMuted} />
              <Text style={[styles.modeBtnText, { color: qrMode === "private" ? colors.textSecondary : colors.textMuted }]} maxFontSizeMultiplier={1}>Private</Text>
            </Pressable>
          </>
        )}
      </View>

      {qrMode === "individual" && user ? (
        <View style={[styles.banner, { backgroundColor: colors.safeDim, borderColor: colors.safe + "40" }]}>
          <Ionicons name="bookmark" size={13} color={colors.safe} />
          <Text style={[styles.bannerText, { color: colors.safe }]} maxFontSizeMultiplier={1}>
            Saved to your profile with a unique ID — update or share anytime
          </Text>
        </View>
      ) : qrMode === "business" && user ? (
        <View style={[styles.banner, { borderColor: colors.warning + "40", backgroundColor: colors.warningDim }]}>
          <Ionicons name="shield" size={13} color={colors.warning} />
          <Text style={[styles.bannerText, { color: colors.warning }]} maxFontSizeMultiplier={1}>
            Smart Redirect — change the destination anytime without reprinting
          </Text>
        </View>
      ) : qrMode === "private" ? (
        <View style={[styles.banner, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="eye-off-outline" size={13} color={colors.textMuted} />
          <Text style={[styles.bannerText, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
            No-trace — generated locally, nothing stored or tracked
          </Text>
        </View>
      ) : (
        <Pressable style={[styles.banner, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]} onPress={() => router.push("/(auth)/login")}>
          <Ionicons name="sparkles-outline" size={13} color={colors.primary} />
          <Text style={[styles.bannerText, { color: colors.primary }]} maxFontSizeMultiplier={1}>
            Sign in to save QR codes to your profile
          </Text>
          <Ionicons name="chevron-forward" size={13} color={colors.primary} />
        </Pressable>
      )}

      {qrMode === "business" && user && (
        <>
          <View style={[styles.businessNameRow, { backgroundColor: colors.surface, borderColor: colors.warning + "40" }]}>
            <Ionicons name="business-outline" size={16} color={colors.warning} style={{ marginRight: 8 }} />
            <TextInput
              style={[styles.businessNameInput, { color: colors.text }]}
              placeholder="Store or organisation name (optional)"
              placeholderTextColor={colors.textMuted}
              value={businessName}
              onChangeText={setBusinessName}
              maxLength={60}
            />
          </View>
          <View style={{ marginTop: 14 }}>
            <BusinessTypeSelector
              businessCategory={businessCategory}
              onSelect={switchBusinessCategory}
            />
          </View>
        </>
      )}
    </>
  );
}

export default memo(ModeSelector);

const styles = StyleSheet.create({
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    textTransform: "uppercase",
    letterSpacing: 0.8,
    marginBottom: 8,
  },
  modeRow: { flexDirection: "row", gap: 8, marginBottom: 10 },
  modeBtn: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5,
    paddingVertical: 10, borderRadius: 12, borderWidth: 1,
  },
  modeBtnText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  banner: {
    flexDirection: "row", alignItems: "center", gap: 7,
    borderRadius: 10, paddingHorizontal: 10, paddingVertical: 9, borderWidth: 1, marginBottom: 16,
  },
  bannerText: { flex: 1, fontSize: 11, fontFamily: "Inter_400Regular" },
  businessNameRow: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 14, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 10, marginTop: 10, marginBottom: 10,
  },
  businessNameInput: { flex: 1, fontSize: 13, fontFamily: "Inter_400Regular" },
});
