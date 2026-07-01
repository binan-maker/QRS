import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  StatusBar, Animated, useWindowDimensions, Image, LayoutChangeEvent,
  InteractionManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Reanimated from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useTopInset } from "@/shared/utils/platform";
import * as Haptics from "@/shared/utils/haptics";
import { useFocusEffect } from "expo-router";
import { useTabBarScroll } from "@/shared/contexts/TabBarContext";
import { useHeaderHide } from "@/shared/utils/use-header-hide";

// ─── Decorative QR finder-square pattern ─────────────────────────────────────
function MockQrDots({ size, dotColor }: { size: number; dotColor: string }) {
  const sq = size * 0.28;
  const r  = sq * 0.22;
  const gap = size * 0.06;
  const innerSq = sq * 0.52;
  const innerR  = innerSq * 0.22;
  const Finder = ({ style }: { style: any }) => (
    <View style={[{ width: sq, height: sq, borderRadius: r, borderWidth: 2, borderColor: dotColor, alignItems: "center", justifyContent: "center" }, style]}>
      <View style={{ width: innerSq, height: innerSq, borderRadius: innerR, backgroundColor: dotColor }} />
    </View>
  );
  return (
    <View style={{ width: size, height: size }}>
      <Finder style={{ position: "absolute", top: gap,    left: gap }} />
      <Finder style={{ position: "absolute", top: gap,    right: gap }} />
      <Finder style={{ position: "absolute", bottom: gap, left: gap }} />
      <View style={{ position: "absolute", bottom: gap, right: gap, width: sq, height: sq, gap: 3, flexDirection: "row", flexWrap: "wrap" }}>
        {Array.from({ length: 9 }).map((_, i) => (
          <View key={i} style={{ width: sq / 4, height: sq / 4, borderRadius: 1.5, backgroundColor: i % 3 !== 1 ? dotColor : "transparent" }} />
        ))}
      </View>
    </View>
  );
}

const MODES = [
  {
    key:      "standard",
    label:    "Standard QR",
    tagline:  "Saved, tracked & protected",
    icon:     "shield-checkmark" as const,
    // Deep navy → electric royal blue
    grad:     ["#09195C", "#0F2F9E", "#1A52D0"] as [string, string, string],
    glow:     "rgba(99,135,255,0.22)",
    accent:   "#4F83FF",
    features: ["Saved to your account", "Trust score & analytics", "Community safety check"],
    onPress:  () => router.push("/qr-standard" as any),
  },
  {
    key:      "private",
    label:    "Private QR",
    tagline:  "Zero data, fully offline",
    icon:     "eye-off" as const,
    badge:    "OFFLINE",
    // Deep black-violet → rich purple (no more flat gray)
    grad:     ["#0E0720", "#220D50", "#3A1880"] as [string, string, string],
    glow:     "rgba(147,97,255,0.22)",
    accent:   "#A578FF",
    features: ["No account needed", "Nothing stored anywhere", "Instant & anonymous"],
    onPress:  () => router.push("/qr-private" as any),
  },
];

export default function GeneratorLanding() {
  const { colors, isDark } = useTheme();
  const insets   = useSafeAreaInsets();
  const topInset = useTopInset();
  const { width } = useWindowDimensions();

  const [headerH, setHeaderH] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { onTabScroll, resetTabBar } = useTabBarScroll();
  const { headerStyle, setHeight, onScroll: onHeaderScroll, reset: resetHeader } = useHeaderHide();

  useFocusEffect(useCallback(() => { resetTabBar(); resetHeader(); }, [resetTabBar, resetHeader]));

  const handleScroll = useCallback((e: any) => {
    onHeaderScroll(e); onTabScroll(e);
  }, [onHeaderScroll, onTabScroll]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 1800, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 1800, useNativeDriver: true }),
        ])
      ).start();
    });
    return () => task.cancel();
  }, []);

  const cardWidth = width - 40;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle="light-content" backgroundColor="transparent" translucent />

      {/* ── Header ───────────────────────────────────────────────────── */}
      <Reanimated.View
        style={[
          styles.header,
          { paddingTop: topInset + 6, position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: colors.background },
          headerStyle,
        ]}
        onLayout={(e: LayoutChangeEvent) => { const h = e.nativeEvent.layout.height; setHeaderH(h); setHeight(h); }}
      >
        <Text style={[styles.headerTitle, { color: colors.text }]}>QR Generator</Text>
        <Text style={[styles.headerSub,   { color: colors.textMuted }]}>Build and protect QR codes</Text>
      </Reanimated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: headerH + 8, paddingBottom: insets.bottom + 120 }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >

        {/* ── Hero Card ────────────────────────────────────────────── */}
        <View style={{ marginHorizontal: 20 }}>
          <LinearGradient
            colors={["#060C1C", "#0D1840", "#08102A"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.heroCard, { width: cardWidth }]}
          >
            {/* Ambient glows */}
            <View style={styles.heroGlowBlue} />
            <View style={styles.heroGlowPurple} />

            {/* Left — title + trust pill */}
            <View style={styles.heroLeft}>
              <View style={styles.heroTrustPill}>
                <View style={styles.heroTrustDot} />
                <Text style={styles.heroTrustText}>BinRo Guard</Text>
              </View>
              <Text style={styles.heroTitle}>Your QR,{"\n"}Protected.</Text>

              {/* Mini stat row */}
              <View style={styles.heroMeta}>
                <Ionicons name="shield-checkmark" size={12} color="#4ADE80" />
                <Text style={styles.heroMetaText}>Trust scored</Text>
                <View style={styles.heroMetaDot} />
                <Ionicons name="analytics" size={12} color="#60A5FA" />
                <Text style={styles.heroMetaText}>Live analytics</Text>
              </View>
            </View>

            {/* Right — animated QR preview */}
            <Animated.View style={[styles.heroQrWrap, { transform: [{ scale: pulseAnim }] }]}>
              {/* Glow ring behind QR */}
              <View style={styles.heroQrRing} />
              <View style={[styles.heroQrCard, { backgroundColor: "#fff" }]}>
                <MockQrDots size={96} dotColor="#0B1227" />
                <View style={styles.heroQrLogoWrap} pointerEvents="none">
                  <Image
                    source={require("../../assets/images/icon.png")}
                    style={styles.heroQrLogo}
                    resizeMode="cover"
                  />
                </View>
              </View>
              <View style={styles.heroSafeBadge}>
                <View style={styles.heroSafeDot} />
                <Text style={styles.heroSafeText}>Safe</Text>
              </View>
            </Animated.View>
          </LinearGradient>
        </View>

        {/* ── Mode Cards ───────────────────────────────────────────── */}
        <View style={styles.modeSection}>

          {MODES.map((m) => (
            <Pressable
              key={m.key}
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); m.onPress(); }}
              style={({ pressed }) => ({
                borderRadius: 24,
                overflow: "hidden" as const,
                opacity:   pressed ? 0.88 : 1,
                transform: [{ scale: pressed ? 0.972 : 1 }],
              })}
            >
              <LinearGradient
                colors={m.grad}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.modeCard}
              >
                {/* Ambient top-right glow */}
                <View style={[styles.modeGlow, { backgroundColor: m.glow }]} />
                {/* Subtle bottom-left counter-glow */}
                <View style={[styles.modeGlow2, { backgroundColor: m.glow }]} />

                {/* Top row: icon + badge + arrow */}
                <View style={styles.modeTopRow}>
                  <View style={[styles.modeIconRing, { borderColor: m.accent + "40", backgroundColor: m.accent + "18" }]}>
                    <View style={[styles.modeIconBox, { backgroundColor: m.accent + "28" }]}>
                      <Ionicons name={m.icon} size={26} color="#fff" />
                    </View>
                  </View>

                  <View style={{ flex: 1, gap: 3 }}>
                    {"badge" in m && (
                      <View style={[styles.modeBadge, { backgroundColor: m.accent + "28", borderColor: m.accent + "50" }]}>
                        <Text style={[styles.modeBadgeText, { color: m.accent }]}>{m.badge}</Text>
                      </View>
                    )}
                  </View>

                  <View style={[styles.goBtn, { backgroundColor: "rgba(255,255,255,0.12)", borderColor: "rgba(255,255,255,0.2)" }]}>
                    <Ionicons name="arrow-forward" size={15} color="#fff" />
                  </View>
                </View>

                {/* Title + tagline */}
                <Text style={styles.modeTitle}>{m.label}</Text>
                <Text style={styles.modeTagline}>{m.tagline}</Text>

                {/* Divider */}
                <View style={[styles.modeDivider, { backgroundColor: "rgba(255,255,255,0.12)" }]} />

                {/* Features */}
                <View style={styles.modeFeatures}>
                  {m.features.map((f) => (
                    <View key={f} style={styles.modeFeatureRow}>
                      <View style={[styles.modeFeatureDot, { backgroundColor: m.accent }]} />
                      <Text style={styles.modeFeatureText}>{f}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </Pressable>
          ))}

        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { gap: 20 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
  },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerSub:   { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },

  // ── Hero ──────────────────────────────────────────────────────────────
  heroCard: {
    borderRadius: 24,
    padding: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    overflow: "hidden",
    position: "relative",
    minHeight: 160,
  },
  heroGlowBlue: {
    position: "absolute", top: -60, left: "20%",
    width: 160, height: 160, borderRadius: 80,
    backgroundColor: "rgba(59,100,255,0.18)",
  },
  heroGlowPurple: {
    position: "absolute", bottom: -40, right: 60,
    width: 100, height: 100, borderRadius: 50,
    backgroundColor: "rgba(120,60,220,0.15)",
  },
  heroLeft: { flex: 1, gap: 10 },

  heroTrustPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 100,
    backgroundColor: "rgba(74,222,128,0.14)",
    borderWidth: 1, borderColor: "rgba(74,222,128,0.28)",
  },
  heroTrustDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#4ADE80" },
  heroTrustText: { fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#4ADE80", letterSpacing: 0.3 },

  heroTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.5,
    lineHeight: 30,
  },

  heroMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  heroMetaText: { fontSize: 10, fontFamily: "Inter_500Medium", color: "rgba(255,255,255,0.55)" },
  heroMetaDot: { width: 3, height: 3, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.25)" },

  heroQrWrap: { alignItems: "center", gap: 7 },
  heroQrRing: {
    position: "absolute",
    width: 118, height: 118, borderRadius: 18,
    borderWidth: 1.5, borderColor: "rgba(99,135,255,0.35)",
    backgroundColor: "rgba(99,135,255,0.06)",
  },
  heroQrCard: {
    borderRadius: 14, padding: 9,
    shadowColor: "#000", shadowOpacity: 0.4, shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 }, elevation: 8,
    position: "relative",
  },
  heroQrLogoWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  heroQrLogo: { width: 30, height: 30, borderRadius: 9, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.9)" },

  heroSafeBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 10,
    backgroundColor: "rgba(34,197,94,0.15)",
    borderWidth: 1, borderColor: "rgba(34,197,94,0.35)",
  },
  heroSafeDot: { width: 5, height: 5, borderRadius: 3, backgroundColor: "#22C55E" },
  heroSafeText: { fontSize: 10, fontFamily: "Inter_700Bold", color: "#22C55E" },

  // ── Mode cards ────────────────────────────────────────────────────────
  modeSection: { marginHorizontal: 20, gap: 14 },

  modeCard: {
    borderRadius: 24,
    padding: 22,
    overflow: "hidden",
    position: "relative",
  },
  modeGlow: {
    position: "absolute", top: -50, right: -40,
    width: 140, height: 140, borderRadius: 70,
  },
  modeGlow2: {
    position: "absolute", bottom: -40, left: -20,
    width: 90, height: 90, borderRadius: 45,
    opacity: 0.5,
  },

  modeTopRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 18 },

  modeIconRing: {
    width: 58, height: 58, borderRadius: 18,
    borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  modeIconBox: {
    width: 46, height: 46, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
  },

  modeBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 7, borderWidth: 1,
  },
  modeBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 1 },

  goBtn: {
    width: 36, height: 36, borderRadius: 12,
    borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },

  modeTitle: {
    fontSize: 20,
    fontFamily: "Inter_700Bold",
    color: "#fff",
    letterSpacing: -0.3,
    marginBottom: 3,
  },
  modeTagline: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.60)",
    marginBottom: 16,
  },
  modeDivider: { height: StyleSheet.hairlineWidth, marginBottom: 14 },

  modeFeatures: { gap: 9 },
  modeFeatureRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  modeFeatureDot: { width: 5, height: 5, borderRadius: 3, flexShrink: 0 },
  modeFeatureText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    color: "rgba(255,255,255,0.78)",
    lineHeight: 18,
  },
});
