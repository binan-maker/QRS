import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import FeatureRow from "@/features/generator/landing/FeatureRow";
import type { LANDING_MODES } from "@/features/generator/landing/constants";

type Mode = (typeof LANDING_MODES)[number];

interface Props {
  mode: Mode;
}

export default function ModeCard({ mode: m }: Props) {
  return (
    <Pressable
      onPress={() => router.push(m.route as any)}
      style={({ pressed }) => ({
        borderRadius:  24,
        overflow:      "hidden" as const,
        opacity:       pressed ? 0.91 : 1,
        transform:     [{ scale: pressed ? 0.972 : 1 }],
        shadowColor:   m.toC,
        shadowOffset:  { width: 0, height: 8 },
        shadowOpacity: pressed ? 0.15 : 0.28,
        shadowRadius:  18,
        elevation:     pressed ? 4 : 8,
      })}
    >
      <LinearGradient
        colors={[m.fromC, m.midC, m.toC]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.cardGlow} />

        <View style={styles.topRow}>
          <View style={styles.iconWrap}>
            <Ionicons name={m.icon} size={30} color="#fff" />
          </View>
          {m.badge ? (
            <View
              style={[
                styles.badge,
                { backgroundColor: m.badgeColor + "30", borderColor: m.badgeColor + "60" },
              ]}
            >
              <Text style={[styles.badgeText, { color: m.badgeColor }]}>{m.badge}</Text>
            </View>
          ) : null}
          <View style={{ flex: 1 }} />
          <View style={styles.arrowCircle}>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </View>
        </View>

        <View style={styles.titleBlock}>
          <Text style={styles.title}>{m.label}</Text>
          <Text style={styles.tagline}>{m.tagline}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.featureList}>
          {m.features.map((f) => <FeatureRow key={f} text={f} />)}
        </View>
      </LinearGradient>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 24, padding: 20, overflow: "hidden", position: "relative" },
  cardGlow: {
    position: "absolute", top: -40, right: -40,
    width: 130, height: 130, borderRadius: 65,
    backgroundColor: "rgba(255,255,255,0.07)",
  },
  topRow:    { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },
  iconWrap:  {
    width: 56, height: 56, borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  badge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1 },
  badgeText:  { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  arrowCircle: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: "rgba(255,255,255,0.18)",
    alignItems: "center", justifyContent: "center",
  },
  titleBlock:  { gap: 4, marginBottom: 14 },
  title:       { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  tagline:     { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.72)" },
  divider:     { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.2)", marginBottom: 14 },
  featureList: { gap: 7 },
});
