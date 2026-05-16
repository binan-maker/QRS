import React, { useMemo } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { makeResponsiveFont } from "@/features/home/utils";
import type { HomeColors } from "@/features/home/types";

interface StatItem {
  icon:  React.ComponentProps<typeof Ionicons>["name"];
  label: string;
  desc:  string;
  color: string;
  bg:    string;
}

interface Props {
  colors: HomeColors;
}

export function StatsRow({ colors }: Props) {
  const { width } = useWindowDimensions();
  const rf = useMemo(() => makeResponsiveFont(width), [width]);
  const styles = useMemo(() => makeStyles(colors, rf), [colors, rf]);

  const STAT_ITEMS = useMemo<StatItem[]>(() => [
    { icon: "shield-checkmark", label: "Safe Scans", desc: "Verified clean",  color: colors.safe,    bg: colors.safeDim    },
    { icon: "warning",          label: "Stay Alert", desc: "Report risks",    color: colors.warning, bg: colors.warningDim },
    { icon: "chatbubbles",      label: "Community",  desc: "Trust reviews",   color: colors.primary, bg: colors.primaryDim },
  ], [colors]);

  return (
    <Animated.View entering={FadeInDown.duration(500).delay(160)}>
      <View style={styles.statsRow}>
        {STAT_ITEMS.map((s, idx) => (
          <View
            key={idx}
            style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
          >
            <LinearGradient
              colors={[s.bg, "transparent"]}
              style={styles.statCardGlow}
              start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
            />
            <View style={[styles.statIconWrap, { backgroundColor: s.bg }]}>
              <Ionicons name={s.icon} size={18} color={s.color} />
            </View>
            <Text style={[styles.statLabel, { color: colors.text }]} numberOfLines={1} maxFontSizeMultiplier={1}>
              {s.label}
            </Text>
            <Text style={[styles.statDesc, { color: s.color }]} numberOfLines={1} maxFontSizeMultiplier={1}>
              {s.desc}
            </Text>
          </View>
        ))}
      </View>
    </Animated.View>
  );
}

function makeStyles(c: HomeColors, rf: (n: number) => number) {
  return StyleSheet.create({
    statsRow:     { flexDirection: "row", gap: 10, marginBottom: 18 },
    statCard:     { flex: 1, borderRadius: 18, padding: 14, alignItems: "center", borderWidth: 1, gap: 5, overflow: "hidden" },
    statCardGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 40 },
    statIconWrap: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    statLabel:    { fontSize: rf(11), fontFamily: "Inter_700Bold", textAlign: "center" },
    statDesc:     { fontSize: rf(10), fontFamily: "Inter_600SemiBold", textAlign: "center", letterSpacing: 0.2 },
  });
}
