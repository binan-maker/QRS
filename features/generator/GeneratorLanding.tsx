import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  StatusBar, Animated, useWindowDimensions, Image, LayoutChangeEvent,
  InteractionManager,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import Reanimated from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useTopInset } from "@/shared/utils/platform";
import * as Haptics from "@/shared/utils/haptics";
import { useFocusEffect } from "expo-router";
import { useTabBarScroll } from "@/shared/contexts/TabBarContext";
import { useHeaderHide } from "@/shared/utils/use-header-hide";


// ─── Simple decorative QR placeholder (3 finder squares + icon) ──────────────
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

// ─── Feature highlights ───────────────────────────────────────────────────────
const FEATURES = [
  { icon: "shield-checkmark", color: "#10B981", label: "Trust Protected",  desc: "Every QR gets a trust score" },
  { icon: "analytics",        color: "#3B82F6", label: "Live Analytics",   desc: "Track scans in real time" },
  { icon: "pencil",           color: "#8B5CF6", label: "Edit Anytime",     desc: "Update content, keep QR" },
  { icon: "brush",            color: "#F59E0B", label: "Custom Branding",  desc: "Logo, colors, your style" },
  { icon: "robot-outline",    color: "#EC4899", label: "AI Builder",       desc: "Describe it, AI builds it", isMC: true },
  { icon: "flash",            color: "#F97316", label: "Instant Share",    desc: "PDF, image, clipboard" },
];

export default function GeneratorLanding() {
  const { colors } = useTheme();
  const insets     = useSafeAreaInsets();
  const topInset   = useTopInset();
  const { width }  = useWindowDimensions();

  const [headerH, setHeaderH] = useState(0);
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { onTabScroll, resetTabBar } = useTabBarScroll();
  const { headerStyle, setHeight, onScroll: onHeaderScroll, reset: resetHeader } = useHeaderHide();

  useFocusEffect(
    useCallback(() => {
      resetTabBar();
      resetHeader();
    }, [resetTabBar, resetHeader])
  );

  const handleScroll = useCallback((e: any) => {
    onHeaderScroll(e);
    onTabScroll(e);
  }, [onHeaderScroll, onTabScroll]);

  useEffect(() => {
    const task = InteractionManager.runAfterInteractions(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, { toValue: 1.06, duration: 1600, useNativeDriver: true }),
          Animated.timing(pulseAnim, { toValue: 1,    duration: 1600, useNativeDriver: true }),
        ])
      ).start();
    });
    return () => task.cancel();
  }, []);

  function handleStandardPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/qr-standard" as any);
  }

  function handlePrivatePress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/qr-private" as any);
  }

  function handleScanNow() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/(tabs)/scanner" as any);
  }

  const cardWidth = width - 40;

  const MODES = [
    {
      key: "standard",
      label: "Standard QR",
      tagline: "Saved, tracked & protected",
      icon: "shield-checkmark",
      fromC: "#1D4ED8", midC: "#2563EB", toC: "#3B82F6",
      features: ["Saved to your account", "Trust score & analytics", "Community safety check"],
      onPress: handleStandardPress,
    },
    {
      key: "private",
      label: "Private QR",
      tagline: "Zero data, fully offline",
      icon: "eye-off",
      badge: "OFFLINE",
      fromC: "#1E293B", midC: "#334155", toC: "#475569",
      features: ["No account needed", "Nothing stored anywhere", "Instant & anonymous"],
      onPress: handlePrivatePress,
    },
  ];

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

      {/* ── Header ───────────────────────────────────────────────── */}
      <Reanimated.View
        style={[
          styles.header,
          { paddingTop: topInset + 6, position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: colors.background },
          headerStyle,
        ]}
        onLayout={(e: LayoutChangeEvent) => { const h = e.nativeEvent.layout.height; setHeaderH(h); setHeight(h); }}
      >
        <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>QR Generator</Text>
            <Text style={[styles.headerSub, { color: colors.textMuted }]}>Build and protect QR codes</Text>
          </View>
        </View>
      </Reanimated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: headerH + 8, paddingBottom: insets.bottom + 120 }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >

        {/* ── Hero QR Preview Card ──────────────────────────────── */}
        <View style={{ marginHorizontal: 20 }}>
          <LinearGradient
            colors={["#0F172A", "#1E1B4B", "#1A1035"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.heroCard, { width: cardWidth }]}
          >
            <View style={styles.heroGlow} />
            <View style={styles.heroGlow2} />

            <View style={styles.heroLeft}>
              <Text style={styles.heroTitle}>Your QR,{"\n"}Protected.</Text>
              <Text style={styles.heroSub}>Trust score, live analytics & fraud guard — built in.</Text>
              <View style={styles.heroStats}>
                {[
                  { val: "0–100", label: "Trust Score" },
                  { val: "Live",  label: "Analytics" },
                ].map((s) => (
                  <View key={s.label} style={styles.heroStatItem}>
                    <Text style={styles.heroStatVal}>{s.val}</Text>
                    <Text style={styles.heroStatLabel}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </View>

            <Animated.View style={[styles.heroQrWrap, { transform: [{ scale: pulseAnim }] }]}>
              <View style={[styles.heroQrCard, { backgroundColor: "#fff" }]}>
                <MockQrDots size={90} dotColor="#0F172A" />
                <View style={styles.heroQrLogoWrap} pointerEvents="none">
                  <Image
                    source={require("../../assets/images/icon.png")}
                    style={styles.heroQrLogo}
                    resizeMode="cover"
                  />
                </View>
              </View>
              <View style={[styles.heroQrLabel, { backgroundColor: "#22C55E20", borderColor: "#22C55E50" }]}>
                <View style={[styles.heroQrDot, { backgroundColor: "#22C55E" }]} />
                <Text style={styles.heroQrLabelText}>Safe</Text>
              </View>
            </Animated.View>
          </LinearGradient>
        </View>

        {/* ── Mode Cards ────────────────────────────────────────── */}
        <View style={styles.modeSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CHOOSE YOUR MODE</Text>
          </View>

          {MODES.map((m) => (
            <Pressable
              key={m.key}
              onPress={m.onPress}
              style={({ pressed }) => ({
                borderRadius: 22,
                overflow: "hidden" as const,
                opacity:   pressed ? 0.88 : 1,
                transform: [{ scale: pressed ? 0.975 : 1 }],
              })}
            >
              <LinearGradient
                colors={[m.fromC, m.midC, m.toC]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.modeCard}
              >
                <View style={styles.modeGlow} />
                <View style={styles.modeTopRow}>
                  <View style={styles.modeIconWrap}>
                    <Ionicons name={m.icon as any} size={28} color="#fff" />
                  </View>
                  {"badge" in m && (
                    <View style={styles.modeBadge}>
                      <Text style={styles.modeBadgeText}>{m.badge}</Text>
                    </View>
                  )}
                  <View style={{ flex: 1 }} />
                  <View style={[styles.goArrow, { backgroundColor: "rgba(255,255,255,0.15)" }]}>
                    <Ionicons name="arrow-forward" size={16} color="rgba(255,255,255,0.9)" />
                  </View>
                </View>
                <Text style={styles.modeTitle}>{m.label}</Text>
                <Text style={styles.modeTagline}>{m.tagline}</Text>
                <View style={styles.modeDivider} />
                <View style={styles.modeFeatures}>
                  {m.features.map((f) => (
                    <View key={f} style={styles.modeFeatureRow}>
                      <Ionicons name="checkmark-circle" size={13} color="rgba(255,255,255,0.75)" />
                      <Text style={styles.modeFeatureText}>{f}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </Pressable>
          ))}
        </View>

        {/* ── Feature Grid ─────────────────────────────────────── */}
        <View style={styles.featureSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 12 }]}>
            WHAT YOU GET
          </Text>
          <View style={styles.featureGrid}>
            {FEATURES.map((f) => (
              <View key={f.label}
                style={[styles.featureCard, { backgroundColor: colors.surface, borderColor: f.color + "25" }]}>
                <View style={[styles.featureCardIcon, { backgroundColor: f.color + "18" }]}>
                  {f.isMC
                    ? <MaterialCommunityIcons name={f.icon as any} size={20} color={f.color} />
                    : <Ionicons name={f.icon as any} size={20} color={f.color} />
                  }
                </View>
                <Text style={[styles.featureCardLabel, { color: colors.text }]}>{f.label}</Text>
                <Text style={[styles.featureCardDesc, { color: colors.textMuted }]}>{f.desc}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* ── Scanner CTA ──────────────────────────────────────── */}
        <View style={{ marginHorizontal: 20 }}>
          <Pressable
            onPress={handleScanNow}
            style={({ pressed }) => ({ opacity: pressed ? 0.88 : 1, transform: [{ scale: pressed ? 0.975 : 1 }], borderRadius: 20, overflow: "hidden" as const })}
          >
            <LinearGradient
              colors={["#059669", "#10B981"]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              style={styles.ctaCard}
            >
              <View style={styles.ctaGlow} />
              <View style={styles.ctaLeft}>
                <View style={[styles.ctaLiveDot, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                  <View style={[styles.ctaLiveDotInner, { backgroundColor: "#10B981" }]} />
                </View>
                <View>
                  <Text style={styles.ctaTitle}>Scanner is Live Now</Text>
                  <Text style={styles.ctaSub}>Scan any QR — UPI, WiFi, URL — and get an instant trust score</Text>
                </View>
              </View>
              <View style={styles.ctaArrow}>
                <Ionicons name="scan" size={22} color="#10B981" />
              </View>
            </LinearGradient>
          </Pressable>
        </View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1 },
  scroll: { gap: 24 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerSub:   { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },

  heroCard:  { borderRadius: 22, padding: 20, flexDirection: "row", alignItems: "center", gap: 16, overflow: "hidden", position: "relative" },
  heroGlow:  { position: "absolute", top: -50, left: "25%", width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(124,58,237,0.18)" },
  heroGlow2: { position: "absolute", bottom: -30, right: 80, width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(79,70,229,0.14)" },
  heroLeft:  { flex: 1, gap: 8 },
  heroTitle: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: -0.3, lineHeight: 26 },
  heroSub:   { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.58)", lineHeight: 16 },
  heroStats: { flexDirection: "row", gap: 16 },
  heroStatItem: { gap: 1 },
  heroStatVal:   { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  heroStatLabel: { fontSize: 9,  fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.5)" },
  heroQrWrap: { alignItems: "center", gap: 6 },
  heroQrCard: { borderRadius: 12, padding: 8, shadowColor: "#000", shadowOpacity: 0.25, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 6, position: "relative" },
  heroQrLogoWrap: { position: "absolute", top: 0, left: 0, right: 0, bottom: 0, alignItems: "center", justifyContent: "center" },
  heroQrLogo: { width: 28, height: 28, borderRadius: 8, borderWidth: 1.5, borderColor: "rgba(255,255,255,0.9)" },
  heroQrLabel: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8, borderWidth: 1 },
  heroQrDot:   { width: 5, height: 5, borderRadius: 3 },
  heroQrLabelText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#22C55E" },

  sectionHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 20, marginBottom: 10 },
  sectionTitle:  { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  modeSection:  { marginHorizontal: 20, gap: 12 },

  modeCard:     { borderRadius: 22, padding: 20, overflow: "hidden", position: "relative" },
  modeGlow:     { position: "absolute", top: -40, right: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.07)" },
  modeTopRow:   { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  modeIconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  modeBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.15)" },
  modeBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.85)", letterSpacing: 0.8 },
  goArrow:      { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  modeTitle:    { fontSize: 17, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 2 },
  modeTagline:  { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.65)", marginBottom: 14 },
  modeDivider:  { height: StyleSheet.hairlineWidth, backgroundColor: "rgba(255,255,255,0.18)", marginBottom: 12 },
  modeFeatures: { gap: 7 },
  modeFeatureRow:  { flexDirection: "row", alignItems: "center", gap: 7 },
  modeFeatureText: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.78)" },

  featureSection: { marginHorizontal: 20 },
  featureGrid:    { flexDirection: "row", flexWrap: "wrap", gap: 10 },
  featureCard:    { width: "47%", borderRadius: 16, borderWidth: 1, padding: 14, gap: 8 },
  featureCardIcon: { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  featureCardLabel: { fontSize: 12, fontFamily: "Inter_700Bold" },
  featureCardDesc:  { fontSize: 10, fontFamily: "Inter_400Regular", lineHeight: 14 },

  ctaCard:  { borderRadius: 20, padding: 18, flexDirection: "row", alignItems: "center", gap: 14, overflow: "hidden", position: "relative" },
  ctaGlow:  { position: "absolute", top: -30, right: 60, width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(255,255,255,0.08)" },
  ctaLeft:  { flex: 1, flexDirection: "row", alignItems: "flex-start", gap: 10 },
  ctaLiveDot: { width: 22, height: 22, borderRadius: 11, alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  ctaLiveDotInner: { width: 10, height: 10, borderRadius: 5 },
  ctaTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 2 },
  ctaSub:   { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.78)", lineHeight: 16 },
  ctaArrow: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", flexShrink: 0 },
});
