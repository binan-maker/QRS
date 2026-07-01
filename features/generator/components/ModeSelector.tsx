import React, { memo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown, FadeInUp } from "react-native-reanimated";
import * as Haptics from "@/shared/utils/haptics";
import { router } from "expo-router";
import { useTheme } from "@/shared/contexts/ThemeContext";

type QrMode = "individual" | "private";

interface Props {
  user: any;
  qrMode: QrMode;
  setQrMode: (mode: QrMode) => void;
}

function ModeSelector({ user, qrMode, setQrMode }: Props) {
  const { colors } = useTheme();

  function handleMode(mode: QrMode) {
    setQrMode(mode);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return (
    <>
      <Animated.Text entering={FadeInDown.delay(0).duration(260)} style={[styles.sectionLabel, { color: colors.textMuted }]}>Save as</Animated.Text>
      <Animated.View entering={FadeInDown.delay(40).duration(260)} style={styles.modeRow}>
        {user ? (
          <>
            {[
              { mode: "individual" as QrMode, icon: "bookmark-outline" as const, label: "Saved",   active: qrMode === "individual", activeStyle: { backgroundColor: colors.primaryDim, borderColor: colors.primary }, color: colors.primary },
              { mode: "private"   as QrMode, icon: "eye-off-outline" as const,   label: "Private", active: qrMode === "private",    activeStyle: { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }, color: colors.textSecondary },
            ].map(({ mode, icon, label, active, activeStyle, color }) => (
              <Pressable
                key={mode}
                onPress={() => handleMode(mode)}
                style={[
                  styles.modeBtn,
                  { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                  active && activeStyle,
                ]}
              >
                <Ionicons name={icon} size={14} color={active ? color : colors.textMuted} />
                <Text style={[styles.modeBtnText, { color: active ? color : colors.textMuted }]} maxFontSizeMultiplier={1}>{label}</Text>
              </Pressable>
            ))}
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
      </Animated.View>

      <Animated.View entering={FadeInUp.delay(40).duration(260)}>
        {qrMode === "individual" && user ? (
          <View style={[styles.banner, { backgroundColor: colors.safeDim, borderColor: colors.safe + "40" }]}>
            <Ionicons name="bookmark" size={13} color={colors.safe} />
            <Text style={[styles.bannerText, { color: colors.safe }]} maxFontSizeMultiplier={1}>
              Saved to your profile with a unique ID — update or share anytime
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
      </Animated.View>
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
});
