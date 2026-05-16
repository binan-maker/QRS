import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { useScaleFns } from "@/lib/utils/use-scale";
import { usePulseAnimation } from "@/features/home/hooks/usePulseAnimation";

const HERO_PILLS = ["Safe check", "Fraud detect", "Trust score"] as const;

export function HeroScanCard() {
  const { colors, isDark } = useTheme();
  const { s } = useScaleFns();
  const pulseStyle = usePulseAnimation();
  const styles = useMemo(() => makeStyles(colors, s), [colors, s]);

  return (
    <Animated.View entering={FadeInDown.duration(500).delay(80)}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/(tabs)/scanner");
        }}
        style={({ pressed }) => [
          styles.heroCard,
          { opacity: pressed ? 0.93 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] },
        ]}
      >
        <LinearGradient
          colors={isDark
            ? ["#0A1525", "#081020", "#0B1628"]
            : ["#EBF1FF", "#DEE9FF", "#E8F0FF"]}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          style={styles.heroGradient}
        >
          <View style={[styles.heroBorderAccent, { borderColor: colors.primary + "25" }]} />

          <View style={styles.heroTop}>
            <Animated.View style={[styles.heroIconRing, { borderColor: colors.primary + "30" }, pulseStyle]}>
              <LinearGradient
                colors={[colors.primary + "25", colors.primary + "08"]}
                style={styles.heroIconBg}
              >
                <MaterialCommunityIcons name="qrcode-scan" size={38} color={colors.primary} />
              </LinearGradient>
            </Animated.View>

            <View style={styles.heroTextBlock}>
              <Text style={[styles.heroTitle, { color: colors.text }]}>Scan QR Code</Text>
            </View>

            <View style={[styles.heroArrow, { backgroundColor: colors.primary }]}>
              <Ionicons name="arrow-forward" size={18} color={colors.primaryText} />
            </View>
          </View>

          <View style={styles.heroPillRow}>
            {HERO_PILLS.map((label) => (
              <View
                key={label}
                style={[styles.heroPill, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "30" }]}
              >
                <Text
                  style={[styles.heroPillText, { color: colors.primary }]}
                  maxFontSizeMultiplier={1}
                  numberOfLines={1}
                >
                  {label}
                </Text>
              </View>
            ))}
          </View>
        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function makeStyles(c: any, s: number) {
  const rf = (n: number) => Math.round(n * s);
  return StyleSheet.create({
    heroCard:         { borderRadius: 24, overflow: "hidden", marginBottom: 18 },
    heroGradient:     { borderRadius: 24, padding: 20 },
    heroBorderAccent: { position: "absolute", inset: 0, borderRadius: 24, borderWidth: 1 } as any,
    heroTop:          { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
    heroIconRing:     { width: 76, height: 76, borderRadius: 22, borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    heroIconBg:       { width: 76, height: 76, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    heroTextBlock:    { flex: 1 },
    heroTitle:        { fontSize: rf(16), fontFamily: "Inter_700Bold", marginBottom: 4 },
    heroArrow:        { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    heroPillRow:      { flexDirection: "row", gap: 6, flexWrap: "wrap" },
    heroPill:         { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1 },
    heroPillText:     { fontSize: rf(12), fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },
  });
}
