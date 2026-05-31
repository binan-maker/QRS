import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  View, Text, StyleSheet, ScrollView, Pressable,
  StatusBar, Animated, useWindowDimensions, Image, LayoutChangeEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { router } from "expo-router";
import Reanimated, { FadeInDown, FadeIn, ZoomIn } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useTopInset } from "@/shared/utils/platform";
import * as Haptics from "@/shared/utils/haptics";
import { useTabBarScroll } from "@/shared/contexts/TabBarContext";
import { useHeaderHide } from "@/shared/utils/use-header-hide";

// ─── QR type showcase data ────────────────────────────────────────────────────
const QR_TYPES = [
  { key: "upi",      icon: "cash",                 label: "UPI Payment",   color: "#10B981", desc: "Generate UPI QR codes pre-filled with your VPA, amount, and payee name for instant payments." },
  { key: "wifi",     icon: "wifi",                  label: "WiFi",          color: "#3B82F6", desc: "Share your WiFi network. Guests scan and connect instantly — no typing passwords ever again." },
  { key: "url",      icon: "link",                  label: "Website URL",   color: "#6366F1", desc: "Turn any website link into a scannable QR code with full trust-score protection." },
  { key: "contact",  icon: "person-circle",         label: "Contact Card",  color: "#F59E0B", desc: "Share your full contact info — name, phone, email, company — as a vCard via QR." },
  { key: "business", icon: "storefront",            label: "Business",      color: "#EC4899", desc: "A full branded business QR page with your logo, hours, and verified merchant badge." },
  { key: "event",    icon: "calendar",              label: "Event",         color: "#8B5CF6", desc: "Create QR codes for events with date, time, location, and RSVP link built in." },
  { key: "sms",      icon: "chatbubble-ellipses",   label: "SMS",           color: "#14B8A6", desc: "Pre-fill an SMS message so users just hit send — perfect for feedback or support." },
  { key: "email",    icon: "mail",                  label: "Email",         color: "#F97316", desc: "Open a pre-filled email with subject and body ready to send — zero friction." },
] as const;

// ─── Mock QR dot pattern (decorative, not real QR) ───────────────────────────
const DOT_GRID = [
  [1,1,1,0,1,0,0,1,1,1],
  [1,0,1,0,1,1,0,1,0,1],
  [1,0,1,0,0,1,0,1,0,1],
  [1,1,1,0,1,0,0,1,1,1],
  [0,0,0,1,0,1,1,0,0,0],
  [1,0,1,1,1,0,1,1,0,1],
  [0,1,0,1,0,1,0,1,1,0],
  [1,1,1,0,1,1,0,1,0,1],
  [1,0,1,0,0,0,1,1,0,0],
  [1,1,1,1,1,0,0,1,1,1],
];

function MockQrDots({ size, dotColor }: { size: number; dotColor: string }) {
  const dotSize = size / 12;
  return (
    <View style={{ width: size, height: size, gap: dotSize * 0.35 }}>
      {DOT_GRID.map((row, r) => (
        <View key={r} style={{ flexDirection: "row", gap: dotSize * 0.35, flex: 1 }}>
          {row.map((cell, c) => (
            <View
              key={c}
              style={{
                flex: 1,
                borderRadius: cell ? dotSize * 0.28 : 0,
                backgroundColor: cell ? dotColor : "transparent",
              }}
            />
          ))}
        </View>
      ))}
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

  const [selectedType, setSelectedType] = useState<string>("upi");
  const [showPhase2Hint, setShowPhase2Hint] = useState(false);
  const [headerH, setHeaderH] = useState(0);
  const hintAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const { onTabScroll } = useTabBarScroll();
  const { headerStyle, setHeight, onScroll: onHeaderScroll } = useHeaderHide();

  const handleScroll = useCallback((e: any) => {
    onHeaderScroll(e);
    onTabScroll(e);
  }, [onHeaderScroll, onTabScroll]);

  const selectedTypeData = QR_TYPES.find((t) => t.key === selectedType) ?? QR_TYPES[0];

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.06, duration: 1600, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1,    duration: 1600, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  function handleTypePress(key: string) {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedType(key);
  }

  function handleModeCardPress() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setShowPhase2Hint(true);
    Animated.sequence([
      Animated.timing(hintAnim, { toValue: 1, duration: 220, useNativeDriver: true }),
      Animated.delay(2800),
      Animated.timing(hintAnim, { toValue: 0, duration: 260, useNativeDriver: true }),
    ]).start(() => setShowPhase2Hint(false));
  }

  function handleScanNow() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    router.push("/(tabs)/scanner" as any);
  }

  const cardWidth = width - 40;

  return (
    <View style={[styles.root, { backgroundColor: colors.background }]}>
      <StatusBar barStyle={colors.isDark ? "light-content" : "dark-content"} backgroundColor="transparent" translucent />

      {/* ── Header (absolute, hides on scroll) ───────────────────── */}
      <Reanimated.View
        entering={FadeInDown.delay(0).duration(240)}
        style={[
          styles.header,
          { paddingTop: topInset + 6, position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: colors.background },
          headerStyle,
        ]}
        onLayout={(e: LayoutChangeEvent) => { const h = e.nativeEvent.layout.height; setHeaderH(h); setHeight(h); }}
      >
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>QR Generator</Text>
          <Text style={[styles.headerSub, { color: colors.textMuted }]}>Build and protect QR codes</Text>
        </View>
        <View style={[styles.phasePill, { backgroundColor: "#7C3AED18", borderColor: "#7C3AED50" }]}>
          <View style={[styles.phaseDot, { backgroundColor: "#7C3AED" }]} />
          <Text style={styles.phasePillText}>PHASE 2</Text>
        </View>
      </Reanimated.View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scroll, { paddingTop: headerH, paddingBottom: insets.bottom + 120 }]}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >

        {/* ── Hero QR Preview Card ──────────────────────────────── */}
        <Reanimated.View entering={FadeInDown.delay(60).duration(340)} style={{ marginHorizontal: 20 }}>
          <LinearGradient
            colors={["#0F172A", "#1E1B4B", "#1A1035"]}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={[styles.heroCard, { width: cardWidth }]}
          >
            <View style={styles.heroGlow} />
            <View style={styles.heroGlow2} />

            <View style={styles.heroLeft}>
              <View style={[styles.heroBadge, { backgroundColor: "#7C3AED20", borderColor: "#7C3AED50" }]}>
                <MaterialCommunityIcons name="shimmer" size={10} color="#A78BFA" />
                <Text style={styles.heroBadgeText}>PREVIEW</Text>
              </View>
              <Text style={styles.heroTitle}>Your QR,{"\n"}Protected.</Text>
              <Text style={styles.heroSub}>Every QR you create gets a trust score, analytics, and fraud protection built in.</Text>
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
        </Reanimated.View>

        {/* ── QR Type Explorer ─────────────────────────────────── */}
        <Reanimated.View entering={FadeInDown.delay(120).duration(300)}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>EXPLORE QR TYPES</Text>
            <View style={[styles.interactiveBadge, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}>
              <Ionicons name="hand-left-outline" size={9} color={colors.primary} />
              <Text style={[styles.interactiveBadgeText, { color: colors.primary }]}>tap to explore</Text>
            </View>
          </View>

          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.typeChipsRow}
          >
            {QR_TYPES.map((t) => {
              const active = selectedType === t.key;
              return (
                <Pressable
                  key={t.key}
                  onPress={() => handleTypePress(t.key)}
                  style={({ pressed }) => [
                    styles.typeChip,
                    {
                      backgroundColor: active ? t.color + "20" : colors.surface,
                      borderColor:     active ? t.color + "80" : colors.surfaceBorder,
                      borderWidth:     active ? 1.5 : 1,
                      opacity:         pressed ? 0.78 : 1,
                      transform:       [{ scale: pressed ? 0.93 : active ? 1.04 : 1 }],
                    },
                  ]}
                >
                  <View style={[styles.typeChipIcon, { backgroundColor: active ? t.color + "28" : colors.surfaceLight }]}>
                    <Ionicons name={t.icon as any} size={15} color={active ? t.color : colors.textMuted} />
                  </View>
                  <Text style={[styles.typeChipLabel, { color: active ? t.color : colors.textSecondary }]}>
                    {t.label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          {/* Type description card */}
          <Reanimated.View
            key={selectedType}
            entering={FadeIn.duration(220)}
            style={{ marginHorizontal: 20 }}
          >
            <View style={[styles.typeDescCard, {
              backgroundColor: colors.surface,
              borderColor: selectedTypeData.color + "40",
              borderLeftColor: selectedTypeData.color,
            }]}>
              <View style={[styles.typeDescIcon, { backgroundColor: selectedTypeData.color + "18" }]}>
                <Ionicons name={selectedTypeData.icon as any} size={20} color={selectedTypeData.color} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.typeDescLabel, { color: selectedTypeData.color }]}>{selectedTypeData.label}</Text>
                <Text style={[styles.typeDescText, { color: colors.textSecondary }]}>{selectedTypeData.desc}</Text>
              </View>
            </View>
          </Reanimated.View>
        </Reanimated.View>

        {/* ── Mode Cards (interactive but Phase 2) ─────────────── */}
        <Reanimated.View entering={FadeInDown.delay(180).duration(300)} style={styles.modeSection}>
          <View style={styles.sectionHeader}>
            <Text style={[styles.sectionTitle, { color: colors.textSecondary }]}>CHOOSE YOUR MODE</Text>
          </View>

          {/* Phase 2 hint toast */}
          {showPhase2Hint && (
            <Animated.View style={[styles.phase2Toast, { opacity: hintAnim, backgroundColor: "#7C3AED" }]}>
              <MaterialCommunityIcons name="rocket-launch-outline" size={14} color="#fff" />
              <Text style={styles.phase2ToastText}>
                QR Generation launches in Phase 2 — Scanner is live now!
              </Text>
            </Animated.View>
          )}

          {[
            {
              key: "standard",
              label: "Standard QR",
              tagline: "Saved, tracked & protected",
              icon: "shield-checkmark",
              fromC: "#1D4ED8", midC: "#2563EB", toC: "#3B82F6",
              features: ["Saved to your account", "Trust score & analytics", "Community safety check"],
            },
            {
              key: "private",
              label: "Private QR",
              tagline: "Zero data, fully offline",
              icon: "eye-off",
              badge: "OFFLINE",
              fromC: "#1E293B", midC: "#334155", toC: "#475569",
              features: ["No account needed", "Nothing stored anywhere", "Instant & anonymous"],
            },
          ].map((m) => (
            <Pressable
              key={m.key}
              onPress={handleModeCardPress}
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
                  <View style={[styles.phase2Tag, { backgroundColor: "rgba(255,255,255,0.15)", borderColor: "rgba(255,255,255,0.3)" }]}>
                    <MaterialCommunityIcons name="rocket-launch-outline" size={9} color="rgba(255,255,255,0.85)" />
                    <Text style={styles.phase2TagText}>Phase 2</Text>
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
        </Reanimated.View>

        {/* ── Feature Grid ─────────────────────────────────────── */}
        <Reanimated.View entering={FadeInDown.delay(240).duration(300)} style={styles.featureSection}>
          <Text style={[styles.sectionTitle, { color: colors.textSecondary, marginBottom: 12 }]}>
            WHAT YOU GET IN PHASE 2
          </Text>
          <View style={styles.featureGrid}>
            {FEATURES.map((f) => (
              <Reanimated.View key={f.label} entering={ZoomIn.delay(20).duration(240)}
                style={[styles.featureCard, { backgroundColor: colors.surface, borderColor: f.color + "25" }]}>
                <View style={[styles.featureCardIcon, { backgroundColor: f.color + "18" }]}>
                  {f.isMC
                    ? <MaterialCommunityIcons name={f.icon as any} size={20} color={f.color} />
                    : <Ionicons name={f.icon as any} size={20} color={f.color} />
                  }
                </View>
                <Text style={[styles.featureCardLabel, { color: colors.text }]}>{f.label}</Text>
                <Text style={[styles.featureCardDesc, { color: colors.textMuted }]}>{f.desc}</Text>
              </Reanimated.View>
            ))}
          </View>
        </Reanimated.View>

        {/* ── Live Now CTA ─────────────────────────────────────── */}
        <Reanimated.View entering={FadeInDown.delay(280).duration(300)} style={{ marginHorizontal: 20 }}>
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
                <View style={[styles.ctaLiveDot, { backgroundColor: "#fff" }]}>
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
        </Reanimated.View>

      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  root:  { flex: 1 },
  scroll: { paddingTop: 4, gap: 24 },

  header: {
    paddingHorizontal: 20,
    paddingBottom: 10,
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
  },
  headerTitle: { fontSize: 26, fontFamily: "Inter_700Bold", letterSpacing: -0.5 },
  headerSub:   { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  phasePill:   { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 1, marginTop: 6 },
  phaseDot:    { width: 5, height: 5, borderRadius: 3 },
  phasePillText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "#A78BFA", letterSpacing: 1 },

  heroCard:  { borderRadius: 22, padding: 20, flexDirection: "row", alignItems: "center", gap: 16, overflow: "hidden", position: "relative" },
  heroGlow:  { position: "absolute", top: -50, left: "25%", width: 140, height: 140, borderRadius: 70, backgroundColor: "rgba(124,58,237,0.18)" },
  heroGlow2: { position: "absolute", bottom: -30, right: 80, width: 80, height: 80, borderRadius: 40, backgroundColor: "rgba(79,70,229,0.14)" },
  heroLeft:  { flex: 1, gap: 8 },
  heroBadge: { flexDirection: "row", alignItems: "center", gap: 4, alignSelf: "flex-start", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  heroBadgeText: { fontSize: 8, fontFamily: "Inter_700Bold", color: "#A78BFA", letterSpacing: 1 },
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
  interactiveBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, borderWidth: 1 },
  interactiveBadgeText: { fontSize: 9, fontFamily: "Inter_600SemiBold" },

  typeChipsRow: { paddingHorizontal: 20, paddingTop: 8, paddingBottom: 12, gap: 8 },
  typeChip:     { alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 9, borderRadius: 14, borderWidth: 1 },
  typeChipIcon: { width: 30, height: 30, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  typeChipLabel: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  typeDescCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    borderRadius: 14, borderWidth: 1, borderLeftWidth: 3,
    padding: 14,
  },
  typeDescIcon:  { width: 38, height: 38, borderRadius: 11, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  typeDescLabel: { fontSize: 12, fontFamily: "Inter_700Bold", marginBottom: 3 },
  typeDescText:  { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },

  modeSection:  { marginHorizontal: 20, gap: 12 },
  phase2Toast:  {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 14, paddingVertical: 10, borderRadius: 12,
    marginBottom: 4,
  },
  phase2ToastText: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: "#fff", flex: 1 },

  modeCard:     { borderRadius: 22, padding: 20, overflow: "hidden", position: "relative" },
  modeGlow:     { position: "absolute", top: -40, right: -40, width: 120, height: 120, borderRadius: 60, backgroundColor: "rgba(255,255,255,0.07)" },
  modeTopRow:   { flexDirection: "row", alignItems: "center", gap: 12, marginBottom: 14 },
  modeIconWrap: { width: 52, height: 52, borderRadius: 16, backgroundColor: "rgba(255,255,255,0.18)", alignItems: "center", justifyContent: "center" },
  modeBadge:    { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6, backgroundColor: "rgba(255,255,255,0.15)" },
  modeBadgeText: { fontSize: 9, fontFamily: "Inter_700Bold", color: "rgba(255,255,255,0.85)", letterSpacing: 0.8 },
  phase2Tag:    { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8, borderWidth: 1 },
  phase2TagText: { fontSize: 9, fontFamily: "Inter_600SemiBold", color: "rgba(255,255,255,0.85)" },
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
  ctaLiveDot: { width: 22, height: 22, borderRadius: 11, backgroundColor: "rgba(255,255,255,0.2)", alignItems: "center", justifyContent: "center", marginTop: 1, flexShrink: 0 },
  ctaLiveDotInner: { width: 10, height: 10, borderRadius: 5 },
  ctaTitle: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff", marginBottom: 2 },
  ctaSub:   { fontSize: 11, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.78)", lineHeight: 16 },
  ctaArrow: { width: 42, height: 42, borderRadius: 14, backgroundColor: "#fff", alignItems: "center", justifyContent: "center", flexShrink: 0 },
});
