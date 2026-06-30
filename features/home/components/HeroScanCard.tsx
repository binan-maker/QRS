import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useScaleFns } from "@/shared/utils/use-scale";
import { usePulseAnimation } from "@/features/home/hooks/usePulseAnimation";

export function HeroScanCard() {
  const { colors, isDark } = useTheme();
  const { s } = useScaleFns();
  const pulseStyle = usePulseAnimation();
  const styles = useMemo(() => makeStyles(colors, isDark, s), [colors, isDark, s]);

  const gradColors = isDark
    ? (["#091428", "#0C1A35", "#091020"] as const)
    : (["#EAF0FF", "#D8E7FF", "#EEF4FF"] as const);

  const blobColor  = isDark ? colors.primary + "18" : colors.primary + "22";
  const blob2Color = isDark ? colors.primary + "0C" : colors.primary + "14";

  return (
    <Animated.View entering={FadeInDown.duration(220)} style={styles.wrapper}>
      <Pressable
        onPress={() => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.push("/(tabs)/scanner");
        }}
        style={({ pressed }) => [
          styles.card,
          { opacity: pressed ? 0.93 : 1, transform: [{ scale: pressed ? 0.983 : 1 }] },
        ]}
      >
        <LinearGradient
          colors={gradColors}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.gradient}
        >
          {/* border ring */}
          <View style={[styles.borderRing, { borderColor: colors.primary + "22" }]} />

          {/* decorative glow blobs */}
          <View style={[styles.blob1, { backgroundColor: blobColor }]} />
          <View style={[styles.blob2, { backgroundColor: blob2Color }]} />

          {/* decorative corner arc */}
          <View style={[styles.cornerArc, { borderColor: colors.primary + "18" }]} />

          {/* ── top row ── */}
          <View style={styles.topRow}>
            {/* pulsing icon */}
            <Animated.View style={[styles.iconRing, { borderColor: colors.primary + "35" }, pulseStyle]}>
              <LinearGradient
                colors={[colors.primary + "30", colors.primary + "0A"]}
                style={styles.iconBg}
              >
                <MaterialCommunityIcons name="qrcode-scan" size={36} color={colors.primary} />
              </LinearGradient>
            </Animated.View>

            {/* text */}
            <View style={styles.textBlock}>
              <Text style={[styles.heading, { color: colors.primary }]}>BinRo</Text>
              <Text style={[styles.title, { color: colors.text }]}>Scan QR Code</Text>
            </View>

            {/* arrow */}
            <View style={[styles.arrowBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="arrow-forward" size={18} color={colors.primaryText} />
            </View>
          </View>

        </LinearGradient>
      </Pressable>
    </Animated.View>
  );
}

function makeStyles(c: any, isDark: boolean, s: number) {
  const rf = (n: number) => Math.round(n * s);
  return StyleSheet.create({
    wrapper:    { marginBottom: 20 },
    card:       { borderRadius: 26, overflow: "hidden" },
    gradient:   { borderRadius: 26, padding: 20 },

    borderRing: {
      position: "absolute", inset: 0 as any,
      borderRadius: 26, borderWidth: 1,
    },

    /* decorative blobs */
    blob1: {
      position: "absolute", width: 130, height: 130, borderRadius: 65,
      right: -30, top: -30,
    },
    blob2: {
      position: "absolute", width: 80, height: 80, borderRadius: 40,
      right: 60, bottom: -20,
    },

    /* decorative corner arc */
    cornerArc: {
      position: "absolute", width: 110, height: 110, borderRadius: 55,
      right: -55, bottom: -55, borderWidth: 1.5,
    },

    topRow:    { flexDirection: "row", alignItems: "center", gap: 14 },

    iconRing: {
      width: 72, height: 72, borderRadius: 22,
      borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    iconBg:   { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },

    textBlock: { flex: 1, gap: 2 },
    heading:   { fontSize: rf(22), fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
    title:     { fontSize: rf(13), fontFamily: "Inter_600SemiBold", letterSpacing: -0.1 },
    subtitle:  { fontSize: rf(11), fontFamily: "Inter_400Regular", lineHeight: 16, marginTop: 2 },

    arrowBtn: {
      width: 42, height: 42, borderRadius: 21,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },

  });
}
