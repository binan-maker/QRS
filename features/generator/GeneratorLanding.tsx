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
    features: ["Saved to your account", "Trust score & analytics", "Community safety check"],
    onPress:  () => router.push("/qr-standard" as any),
  },
  {
    key:      "private",
    label:    "Private QR",
    tagline:  "Zero data, fully offline",
    icon:     "eye-off" as const,
    badge:    "OFFLINE",
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
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 2000, useNativeDriver: true }),
        ])
      ).start();
    });
    return () => task.cancel();
  }, []);

  const cardWidth = width - 40;

  // ── Hero gradient — adapts to theme ─────────────────────────────────
  const heroGrad: [string, string, string] = isDark
    ? ["#0D1428", "#111D3C", "#0A1020"]
    : ["#DDE8FF", "#E8EFFE", "#D8E6FF"];

  // QR dots color adapts to theme
  const qrDotColor = isDark ? "#0B1227" : "#1C2A4A";

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar
        barStyle={isDark ? "light-content" : "dark-content"}
        backgroundColor="transparent"
        translucent
      />

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
            colors={heroGrad}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.heroCard, {
              width: cardWidth,
              borderColor: isDark ? "rgba(255,255,255,0.06)" : "rgba(0,60,180,0.10)",
              borderWidth: 1,
            }]}
          >
            {/* Subtle ambient glow — dark only */}
            {isDark && <View style={styles.heroGlowBlue} />}
            {isDark && <View style={styles.heroGlowPurple} />}

            {/* Left — title + trust pill */}
            <View style={styles.heroLeft}>
              <View style={[styles.heroTrustPill, { backgroundColor: colors.safeDim, borderColor: colors.safe + "44" }]}>
                <View style={[styles.heroTrustDot, { backgroundColor: colors.safe }]} />
                <Text style={[styles.heroTrustText, { color: colors.safe }]}>BinRo Guard</Text>
              </View>

              <Text style={[styles.heroTitle, { color: colors.text }]}>Your QR,{"\n"}Protected.</Text>

              <View style={styles.heroMeta}>
                <Ionicons name="shield-checkmark" size={11} color={colors.primary} />
                <Text style={[styles.heroMetaText, { color: colors.textSecondary }]}>Trust scored</Text>
                <View style={[styles.heroMetaDot, { backgroundColor: colors.surfaceBorder }]} />
                <Ionicons name="analytics" size={11} color={colors.primary} />
                <Text style={[styles.heroMetaText, { color: colors.textSecondary }]}>Live analytics</Text>
              </View>
            </View>

            {/* Right — animated QR preview */}
            <Animated.View style={[styles.heroQrWrap, { transform: [{ scale: pulseAnim }] }]}>
              <View style={[styles.heroQrRing, {
                borderColor: isDark ? "rgba(99,135,255,0.30)" : "rgba(0,60,180,0.14)",
                backgroundColor: isDark ? "rgba(99,135,255,0.05)" : "rgba(0,60,180,0.04)",
              }]} />
              <View style={[styles.heroQrCard, {
                backgroundColor: "#fff",
                shadowColor: isDark ? "#000" : "#1C3A8A",
              }]}>
                <MockQrDots size={96} dotColor={qrDotColor} />
                <View style={styles.heroQrLogoWrap} pointerEvents="none">
                  <Image
                    source={require("../../assets/images/icon.png")}
                    style={styles.heroQrLogo}
                    resizeMode="cover"
                  />
                </View>
              </View>
              <View style={[styles.heroSafeBadge, {
                backgroundColor: colors.safeDim,
                borderColor: colors.safe + "44",
              }]}>
                <View style={[styles.heroSafeDot, { backgroundColor: colors.safe }]} />
                <Text style={[styles.heroSafeText, { color: colors.safe }]}>Safe</Text>
              </View>
            </Animated.View>
          </LinearGradient>
        </View>

        {/* ── Mode Cards ───────────────────────────────────────────── */}
        <View style={styles.modeSection}>

          {MODES.map((m) => {
            const isPrivate = m.key === "private";
            // Private card gets a slightly offset surface so it reads different from Standard
            const cardBg = isPrivate ? colors.surfaceLight : colors.surface;

            return (
              <Pressable
                key={m.key}
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); m.onPress(); }}
                style={({ pressed }) => ({
                  borderRadius: 24,
                  overflow: "hidden" as const,
                  opacity:   pressed ? 0.85 : 1,
                  transform: [{ scale: pressed ? 0.972 : 1 }],
                })}
              >
                <View style={[styles.modeCard, {
                  backgroundColor: cardBg,
                  borderColor:     colors.surfaceBorder,
                }]}>

                  {/* Top row: icon ring + badge + arrow */}
                  <View style={styles.modeTopRow}>
                    <View style={[styles.modeIconRing, {
                      borderColor:     isPrivate ? colors.surfaceBorder : colors.primary + "30",
                      backgroundColor: isPrivate ? colors.surfaceBorder + "60" : colors.primaryDim,
                    }]}>
                      <Ionicons
                        name={m.icon}
                        size={24}
                        color={isPrivate ? colors.textSecondary : colors.primary}
                      />
                    </View>

                    {"badge" in m && (
                      <View style={[styles.modeBadge, {
                        backgroundColor: colors.surfaceLight,
                        borderColor:     colors.surfaceBorder,
                      }]}>
                        <Text style={[styles.modeBadgeText, { color: colors.textSecondary }]}>
                          {m.badge}
                        </Text>
                      </View>
                    )}

                    <View style={{ flex: 1 }} />

                    <View style={[styles.goBtn, {
                      backgroundColor: isPrivate ? colors.surfaceBorder : colors.primaryDim,
                      borderColor:     isPrivate ? colors.surfaceBorder : colors.primary + "30",
                    }]}>
                      <Ionicons
                        name="arrow-forward"
                        size={14}
                        color={isPrivate ? colors.textSecondary : colors.primary}
                      />
                    </View>
                  </View>

                  {/* Title + tagline */}
                  <Text style={[styles.modeTitle, { color: colors.text }]}>{m.label}</Text>
                  <Text style={[styles.modeTagline, { color: colors.textSecondary }]}>{m.tagline}</Text>

                  {/* Divider */}
                  <View style={[styles.modeDivider, { backgroundColor: colors.surfaceBorder }]} />

                  {/* Feature list */}
                  <View style={styles.modeFeatures}>
                    {m.features.map((f) => (
                      <View key={f} style={styles.modeFeatureRow}>
                        <View style={[styles.modeFeatureDot, {
                          backgroundColor: isPrivate ? colors.textMuted : colors.primary,
                        }]} />
                        <Text style={[styles.modeFeatureText, { color: colors.textSecondary }]}>{f}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              </Pressable>
            );
          })}

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
    minHeight: 158,
  },
  heroGlowBlue: {
    position: "absolute", top: -60, left: "22%",
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: "rgba(59,100,255,0.14)",
  },
  heroGlowPurple: {
    position: "absolute", bottom: -40, right: 70,
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: "rgba(100,60,200,0.12)",
  },

  heroLeft: { flex: 1, gap: 10 },

  heroTrustPill: {
    flexDirection: "row", alignItems: "center", gap: 5,
    alignSelf: "flex-start",
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 100, borderWidth: 1,
  },
  heroTrustDot:  { width: 6, height: 6, borderRadius: 3 },
  heroTrustText: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.3 },

  heroTitle: {
    fontSize: 24,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    lineHeight: 30,
  },

  heroMeta: { flexDirection: "row", alignItems: "center", gap: 5 },
  heroMetaText: { fontSize: 10, fontFamily: "Inter_500Medium" },
  heroMetaDot:  { width: 3, height: 3, borderRadius: 2 },

  heroQrWrap: { alignItems: "center", gap: 7 },
  heroQrRing: {
    position: "absolute",
    width: 120, height: 120, borderRadius: 18,
    borderWidth: 1.5,
  },
  heroQrCard: {
    borderRadius: 14, padding: 9,
    shadowOpacity: 0.18, shadowRadius: 10,
    shadowOffset: { width: 0, height: 5 }, elevation: 6,
    position: "relative",
  },
  heroQrLogoWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  heroQrLogo: { width: 30, height: 30, borderRadius: 9, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.9)" },

  heroSafeBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 9, paddingVertical: 4,
    borderRadius: 10, borderWidth: 1,
  },
  heroSafeDot:  { width: 5, height: 5, borderRadius: 3 },
  heroSafeText: { fontSize: 10, fontFamily: "Inter_700Bold" },

  // ── Mode cards ────────────────────────────────────────────────────────
  modeSection: { marginHorizontal: 20, gap: 14 },

  modeCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },

  modeTopRow: { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 16 },

  modeIconRing: {
    width: 50, height: 50, borderRadius: 16,
    borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },

  modeBadge: {
    paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 7, borderWidth: 1,
  },
  modeBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },

  goBtn: {
    width: 34, height: 34, borderRadius: 11,
    borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },

  modeTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
    marginBottom: 3,
  },
  modeTagline: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    marginBottom: 16,
    lineHeight: 18,
  },
  modeDivider: { height: StyleSheet.hairlineWidth, marginBottom: 14 },

  modeFeatures: { gap: 9 },
  modeFeatureRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  modeFeatureDot: { width: 5, height: 5, borderRadius: 3, flexShrink: 0 },
  modeFeatureText: {
    fontSize: 13,
    fontFamily: "Inter_400Regular",
    lineHeight: 18,
  },
});
