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

const PILLS = [
  { label: "Instant",  icon: "flash"          as const },
  { label: "Secure",   icon: "shield-checkmark" as const },
  { label: "Private",  icon: "lock-closed"    as const },
];

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
              <Text style={[styles.title, { color: colors.text }]}>Scan QR Code</Text>
              <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
                Detect risks before you tap
              </Text>
            </View>

            {/* arrow */}
            <View style={[styles.arrowBtn, { backgroundColor: colors.primary }]}>
              <Ionicons name="arrow-forward" size={18} color={colors.primaryText} />
            </View>
          </View>

          {/* ── divider ── */}
          <View style={[styles.divider, { backgroundColor: colors.primary + "18" }]} />

          {/* ── feature pills ── */}
          <View style={styles.pillsRow}>
            {PILLS.map((pill) => (
              <View
                key={pill.label}
                style={[styles.pill, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "28" }]}
              >
                <Ionicons name={pill.icon} size={11} color={colors.primary} />
                <Text style={[styles.pillText, { color: colors.primary }]}>{pill.label}</Text>
              </View>
            ))}

            {/* live badge */}
            <View style={[styles.liveBadge, { backgroundColor: isDark ? "#0F2A0F" : "#ECFDF5", borderColor: "#16A34A28" }]}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>LIVE</Text>
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

    topRow:    { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 18 },

    iconRing: {
      width: 72, height: 72, borderRadius: 22,
      borderWidth: 1.5, alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    iconBg:   { width: 72, height: 72, borderRadius: 22, alignItems: "center", justifyContent: "center" },

    textBlock: { flex: 1, gap: 5 },
    title:     { fontSize: rf(17), fontFamily: "Inter_700Bold", letterSpacing: -0.3 },
    subtitle:  { fontSize: rf(12), fontFamily: "Inter_400Regular", lineHeight: 17 },

    arrowBtn: {
      width: 42, height: 42, borderRadius: 21,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },

    divider: { height: 1, marginBottom: 14 },

    pillsRow: { flexDirection: "row", alignItems: "center", gap: 8, flexWrap: "nowrap" },

    pill: {
      flexDirection: "row", alignItems: "center", gap: 4,
      paddingHorizontal: 10, paddingVertical: 5,
      borderRadius: 100, borderWidth: 1,
    },
    pillText: { fontSize: rf(11), fontFamily: "Inter_600SemiBold" },

    liveBadge: {
      flexDirection: "row", alignItems: "center", gap: 5,
      paddingHorizontal: 9, paddingVertical: 5,
      borderRadius: 100, borderWidth: 1,
      marginLeft: "auto" as any,
    },
    liveDot: {
      width: 6, height: 6, borderRadius: 3, backgroundColor: "#16A34A",
    },
    liveText: {
      fontSize: rf(10), fontFamily: "Inter_700Bold",
      color: "#16A34A", letterSpacing: 0.6,
    },
  });
}
