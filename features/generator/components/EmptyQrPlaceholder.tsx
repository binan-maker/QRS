import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Reanimated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { QrMode } from "@/features/generator/types/form-types";

interface Props {
  mode: QrMode;
}

export default function EmptyQrPlaceholder({ mode }: Props) {
  const { colors } = useTheme();
  return (
    <Reanimated.View entering={FadeIn.duration(260)} style={styles.outer}>
      <View style={[styles.wrap, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <LinearGradient
          colors={
            colors.isDark
              ? ["rgba(0,229,255,0.10)", "rgba(0,111,255,0.06)"]
              : ["rgba(0,111,255,0.07)", "rgba(0,71,204,0.04)"]
          }
          style={styles.iconWrap}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={34} color={colors.primary} />
        </LinearGradient>
        <View style={styles.textWrap}>
          <Text style={[styles.title, { color: colors.text }]}>Your QR appears here</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>
            {mode === "individual"
              ? "Choose a template to build your protected QR"
              : "Choose a template to generate offline"}
          </Text>
        </View>
      </View>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  outer: { marginHorizontal: 20, marginBottom: 16 },
  wrap: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 22,
    paddingHorizontal: 20,
    alignItems: "center",
    flexDirection: "row",
    gap: 14,
  },
  iconWrap: {
    width: 60, height: 60, borderRadius: 16,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  textWrap: { flex: 1 },
  title: { fontSize: 13, fontFamily: "Inter_700Bold" },
  sub:   { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 4, lineHeight: 16 },
});
