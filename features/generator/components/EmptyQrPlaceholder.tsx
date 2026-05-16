import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Reanimated, { FadeIn } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import type { QrMode } from "@/features/generator/types/form-types";

interface Props {
  mode: QrMode;
}

export default function EmptyQrPlaceholder({ mode }: Props) {
  const { colors } = useTheme();
  return (
    <Reanimated.View entering={FadeIn.duration(400)}>
      <View
        style={[
          styles.wrap,
          { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
        ]}
      >
        <LinearGradient
          colors={
            colors.isDark
              ? ["rgba(0,229,255,0.12)", "rgba(0,111,255,0.08)"]
              : ["rgba(0,111,255,0.08)", "rgba(0,71,204,0.05)"]
          }
          style={styles.iconWrap}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <MaterialCommunityIcons name="qrcode-scan" size={52} color={colors.primary} />
        </LinearGradient>
        <Text style={[styles.title, { color: colors.text }]}>Your QR appears here</Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          {mode === "individual"
            ? "Choose a template — protected QR previews live"
            : "Choose a template — private QR generates offline"}
        </Text>
      </View>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    borderRadius:    20,
    borderWidth:     1,
    paddingVertical: 36,
    paddingHorizontal: 24,
    alignItems:      "center",
    gap:             14,
    marginBottom:    20,
    marginHorizontal: 20,
  },
  iconWrap: {
    width: 100, height: 100, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
  },
  title: { fontSize: 13, fontFamily: "Inter_700Bold", textAlign: "center" },
  sub:   { fontSize: 11, fontFamily: "Inter_400Regular", textAlign: "center" },
});
