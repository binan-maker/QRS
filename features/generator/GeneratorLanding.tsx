import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  StatusBar, Animated, useWindowDimensions, Image, LayoutChangeEvent,
  InteractionManager,
} from "react-native";
import InfoModal from "@/features/generator/components/InfoModal";
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

const MODES = [
  {
    key:      "standard",
    label:    "Standard QR",
    tagline:  "Saved, tracked & protected",
    features: ["Saved to your account", "Trust score & analytics", "Community safety check"],
    onPress:  () => router.push("/qr-standard" as any),
  },
  {
    key:      "private",
    label:    "Private QR",
    tagline:  "Zero data, fully offline",
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
  const [infoOpen, setInfoOpen] = useState(false);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { onTabScroll, resetTabBar } = useTabBarScroll();
  const { headerStyle, setHeight, onScroll: onHeaderScroll, reset: resetHeader } = useHeaderHide();

  useFocusEffect(useCallback(() => { resetTabBar(); resetHeader(); }, [resetTabBar, resetHeader]));

  const handleScroll = useCallback((e: any) => {
    onHeaderScroll(e); onTabScroll(e);
  }, [onHeaderScroll, onTabScroll]);

  useEffect(() => {
    let loop: Animated.CompositeAnimation | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      loop = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.05, duration: 2000, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 2000, useNativeDriver: true }),
        ])
      );
      loop.start();
    });
    return () => {
      task.cancel();
      loop?.stop();
    };
  }, []);

  const cardWidth = width - 40;

  const heroGrad: [string, string, string] = isDark
    ? ["#0D1428", "#111D3C", "#0A1020"]
    : ["#DDE8FF", "#E8EFFE", "#D8E6FF"];

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
        <Pressable
          onPress={() => setInfoOpen(true)}
          style={({ pressed }) => [
            styles.headerInfoBtn,
            { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.7 : 1 },
          ]}
          hitSlop={8}
        >
          <Ionicons name="information-circle-outline" size={20} color={colors.textSecondary} />
        </Pressable>
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
            {isDark && <View style={styles.heroGlowBlue} />}
            {isDark && <View style={styles.heroGlowPurple} />}

            {/* Left */}
            <View style={styles.heroLeft}>
              <View style={[styles.heroTrustPill, { backgroundColor: colors.safeDim, borderColor: colors.safe + "44" }]}>
                <View style={[styles.heroTrustDot, { backgroundColor: colors.safe }]} />
                <Text style={[styles.heroTrustText, { color: colors.safe }]}>BinRo</Text>
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

            {/* Right — BinRo logo only */}
            <Animated.View style={[styles.heroBrandWrap, { transform: [{ scale: pulseAnim }] }]}>
              <View style={[styles.heroBrandRing, {
                borderColor:     isDark ? "rgba(99,135,255,0.28)" : "rgba(0,60,180,0.13)",
                backgroundColor: isDark ? "rgba(99,135,255,0.06)" : "rgba(0,60,180,0.05)",
              }]}>
                <Image
                  source={require("../../assets/images/icon.png")}
                  style={styles.heroBrandLogo}
                  resizeMode="cover"
                />
              </View>
            </Animated.View>
          </LinearGradient>
        </View>

        {/* ── Mode Cards ───────────────────────────────────────────── */}
        <View style={styles.modeSection}>

          {MODES.map((m) => {
            const isPrivate = m.key === "private";
            const cardBg    = isPrivate ? colors.surfaceLight : colors.surface;

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
                <View style={[styles.modeCard, { backgroundColor: cardBg, borderColor: colors.surfaceBorder }]}>

                  {/* Title row — label + arrow on same line */}
                  <View style={styles.modeTitleRow}>
                    <Text style={[styles.modeTitle, { color: colors.text }]}>{m.label}</Text>
                    <View style={[styles.goBtn, {
                      backgroundColor: isPrivate ? colors.surfaceBorder : colors.primaryDim,
                      borderColor:     isPrivate ? colors.surfaceBorder : colors.primary + "30",
                    }]}>
                      <Ionicons name="arrow-forward" size={14} color={isPrivate ? colors.textSecondary : colors.primary} />
                    </View>
                  </View>

                  <Text style={[styles.modeTagline, { color: colors.textSecondary }]}>{m.tagline}</Text>

                  {/* Divider */}
                  <View style={[styles.modeDivider, { backgroundColor: colors.surfaceBorder }]} />

                  {/* Feature list */}
                  <View style={styles.modeFeatures}>
                    {m.features.map((f) => (
                      <View key={f} style={styles.modeFeatureRow}>
                        <View style={[styles.modeFeatureDot, { backgroundColor: isPrivate ? colors.textMuted : colors.primary }]} />
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

      <InfoModal visible={infoOpen} onClose={() => setInfoOpen(false)} />
    </View>
  );
}

const styles = StyleSheet.create({
  root:   { flex: 1 },
  scroll: { gap: 20 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  // 22 matches HistoryHeader title size
  headerTitle: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.3, flex: 1 },
  headerInfoBtn: {
    width: 36, height: 36, borderRadius: 18, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },

  // ── Hero ──────────────────────────────────────────────────────────────
  heroCard: {
    borderRadius: 24,
    padding: 22,
    flexDirection: "row",
    alignItems: "center",
    gap: 16,
    overflow: "hidden",
    position: "relative",
    minHeight: 148,
  },
  heroGlowBlue: {
    position: "absolute", top: -60, left: "22%",
    width: 140, height: 140, borderRadius: 70,
    backgroundColor: "rgba(59,100,255,0.13)",
  },
  heroGlowPurple: {
    position: "absolute", bottom: -40, right: 80,
    width: 90, height: 90, borderRadius: 45,
    backgroundColor: "rgba(100,60,200,0.11)",
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

  // Logo only (no QR dots)
  heroBrandWrap: { alignItems: "center", justifyContent: "center" },
  heroBrandRing: {
    width: 100, height: 100, borderRadius: 26,
    borderWidth: 1.5,
    alignItems: "center", justifyContent: "center",
  },
  heroBrandLogo: { width: 70, height: 70, borderRadius: 20 },

  // ── Mode cards ────────────────────────────────────────────────────────
  modeSection: { marginHorizontal: 20, gap: 14 },

  modeCard: {
    borderRadius: 24,
    padding: 20,
    borderWidth: 1,
  },

  modeTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 4,
  },

  goBtn: {
    width: 34, height: 34, borderRadius: 11,
    borderWidth: 1,
    alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },

  modeTitle: {
    fontSize: 18,
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.2,
    flex: 1,
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
  modeFeatureText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
});
