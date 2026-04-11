import { View, Text, StyleSheet, Pressable, ScrollView, Platform, RefreshControl, Image, useWindowDimensions } from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import { Swipeable } from "react-native-gesture-handler";
import * as Haptics from "@/lib/haptics";
import { parseAnyPaymentQr } from "@/lib/qr-analysis";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { useHome } from "@/hooks/useHome";
import { detectContentType, getContentTypeIcon, truncate, formatRelativeTime } from "@/lib/utils/formatters";
import { Linking } from "react-native";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const {
    user, photoURL, recentScans, refreshing, onRefresh, deleteScan, pulseStyle,
  } = useHome();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const { width } = useWindowDimensions();
  const styles = makeStyles(colors, width);

  function getFirstName(name: string) {
    return name ? name.trim().split(/\s+/)[0] : "";
  }

  const STAT_ITEMS = [
    { icon: "shield-checkmark" as const, label: "Safe Scans", desc: "Verified clean", color: colors.safe, bg: colors.safeDim },
    { icon: "warning" as const, label: "Stay Alert", desc: "Report risks", color: colors.warning, bg: colors.warningDim },
    { icon: "chatbubbles" as const, label: "Community", desc: "Trust reviews", color: colors.primary, bg: colors.primaryDim },
  ];

  function getScanGradient(contentType: string): [string, string] {
    if (contentType === "payment") return [colors.warning, colors.warningShade];
    if (contentType === "location") return [colors.danger, colors.dangerShade];
    if (contentType === "phone") return [colors.safe, colors.safeShade];
    if (contentType === "otp") return [colors.safe, colors.safeShade];
    return [colors.primary, colors.primaryShade];
  }

  function getScanMeta(scan: { content: string; contentType?: string }) {
    const contentType = detectContentType(scan.content);
    const gradient = getScanGradient(contentType);
    const icon = getContentTypeIcon(contentType) as any;
    const label = contentType.charAt(0).toUpperCase() + contentType.slice(1);

    let displayLabel = scan.content;
    let subtitle: string | null = null;
    let amountText: string | null = null;

    if (contentType === "payment") {
      try {
        const parsed = parseAnyPaymentQr(scan.content);
        displayLabel = parsed?.recipientName || parsed?.vpa || "Payment QR";
        subtitle = parsed?.vpa && parsed?.recipientName ? parsed.vpa : null;
        if (parsed?.amount) amountText = `₹${Number(parsed.amount).toLocaleString("en-IN")}`;
      } catch {}
    } else if (contentType === "url") {
      try {
        displayLabel = new URL(scan.content).hostname.replace("www.", "");
        subtitle = scan.content;
      } catch {}
    } else if (scan.content.length > 44) {
      subtitle = scan.content.slice(0, 44) + "…";
    }

    return { contentType, gradient, icon, label, displayLabel: truncate(displayLabel, 36), subtitle, amountText };
  }

  return (
    <>
      <View style={[styles.container, { paddingTop: topInset }]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
          }
        >
          {/* ── HEADER ── */}
          <Animated.View entering={FadeInDown.duration(500)} style={styles.header}>
            <View style={styles.headerLeft}>
              {user ? (
                <Text style={styles.greeting} numberOfLines={1} ellipsizeMode="tail">
                  Hey,{" "}
                  <Text style={{ color: colors.primary }}>{getFirstName(user.displayName)}</Text>
                </Text>
              ) : (
                <Text style={styles.greeting}>Welcome</Text>
              )}
            </View>
            <View style={styles.headerRight}>
              {user ? (
                <Pressable onPress={() => router.push("/(tabs)/profile")} style={styles.avatarRing}>
                  <LinearGradient
                    colors={[colors.primary, colors.primaryShade]}
                    style={styles.avatarRingGradient}
                    start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  >
                    <View style={[styles.avatarInner, { backgroundColor: colors.surface }]}>
                      {photoURL ? (
                        <Image source={{ uri: photoURL }} style={styles.avatarImg} />
                      ) : (
                        <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                          {user.displayName.charAt(0).toUpperCase()}
                        </Text>
                      )}
                    </View>
                  </LinearGradient>
                </Pressable>
              ) : (
                <Pressable
                  onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(auth)/login"); }}
                  style={[styles.signInPill, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "50" }]}
                >
                  <Ionicons name="log-in-outline" size={16} color={colors.primary} />
                  <Text style={[styles.signInPillText, { color: colors.primary }]}>Sign In</Text>
                </Pressable>
              )}
            </View>
          </Animated.View>

          {/* ── HERO SCAN CARD ── */}
          <Animated.View entering={FadeInDown.duration(500).delay(80)}>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/(tabs)/scanner"); }}
              style={({ pressed }) => [styles.heroCard, { opacity: pressed ? 0.93 : 1, transform: [{ scale: pressed ? 0.985 : 1 }] }]}
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
                  {["Safe check", "Fraud detect", "Trust score"].map((t) => (
                    <View key={t} style={[styles.heroPill, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "30" }]}>
                      <Text style={[styles.heroPillText, { color: colors.primary }]} maxFontSizeMultiplier={1} numberOfLines={1}>{t}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>
            </Pressable>
          </Animated.View>

          {/* ── STATS ROW ── */}
          <Animated.View entering={FadeInDown.duration(500).delay(160)}>
            <View style={styles.statsRow}>
              {STAT_ITEMS.map((s, idx) => (
                <View key={idx} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                  <LinearGradient
                    colors={[s.bg, "transparent"]}
                    style={styles.statCardGlow}
                    start={{ x: 0.5, y: 0 }} end={{ x: 0.5, y: 1 }}
                  />
                  <View style={[styles.statIconWrap, { backgroundColor: s.bg }]}>
                    <Ionicons name={s.icon} size={18} color={s.color} />
                  </View>
                  <Text style={[styles.statLabel, { color: colors.text }]} numberOfLines={1} maxFontSizeMultiplier={1}>{s.label}</Text>
                  <Text style={[styles.statDesc, { color: s.color }]} numberOfLines={1} maxFontSizeMultiplier={1}>{s.desc}</Text>
                </View>
              ))}
            </View>
          </Animated.View>


          {/* ── RECENT SCANS ── */}
          <Animated.View entering={FadeInDown.duration(500).delay(320)}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
                <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Scans</Text>
              </View>
              {recentScans.length > 0 && (
                <Pressable
                  onPress={() => router.push("/(tabs)/history")}
                  style={[styles.seeAllBtn, { backgroundColor: colors.primaryDim }]}
                >
                  <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
                  <Ionicons name="arrow-forward" size={12} color={colors.primary} />
                </Pressable>
              )}
            </View>

            {recentScans.length === 0 ? (
              <View style={[styles.emptyWrap, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <View style={[styles.emptyIconBox, { backgroundColor: colors.surfaceLight }]}>
                  <Ionicons name="scan-outline" size={32} color={colors.textMuted} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No scans yet</Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>Scan a QR code to get started</Text>
              </View>
            ) : (
              <View style={styles.recentList}>
                {recentScans.map((scan, idx) => {
                  const { gradient, icon, displayLabel, subtitle, amountText } = getScanMeta(scan);
                  const renderRightActions = () => (
                    <Pressable
                      onPress={() => {
                        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                        deleteScan(scan.id);
                      }}
                      style={styles.swipeDeleteBtn}
                    >
                      <Ionicons name="trash-outline" size={20} color="#fff" />
                      <Text style={styles.swipeDeleteText}>Delete</Text>
                    </Pressable>
                  );
                  return (
                    <Animated.View key={scan.id} entering={FadeInRight.duration(350).delay(idx * 55)}>
                      <Swipeable
                        renderRightActions={renderRightActions}
                        overshootRight={false}
                        friction={2}
                      >
                        <Pressable
                          onPress={() => {
                            if (scan.qrCodeId) {
                              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                              router.push({ pathname: "/qr-detail/[id]", params: { id: scan.qrCodeId } });
                            }
                          }}
                          style={({ pressed }) => [
                            styles.scanItem,
                            {
                              backgroundColor: colors.surface,
                              borderColor: colors.surfaceBorder,
                              opacity: pressed ? 0.9 : 1,
                              transform: [{ scale: pressed ? 0.984 : 1 }],
                            },
                          ]}
                        >
                          <LinearGradient
                            colors={gradient}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 1 }}
                            style={styles.scanIconBox}
                          >
                            <Ionicons name={icon} size={20} color="#fff" />
                          </LinearGradient>

                          <View style={styles.scanBody}>
                            <View style={styles.scanTopRow}>
                              <Text style={[styles.scanContent, { color: colors.text }]} numberOfLines={1} maxFontSizeMultiplier={1}>
                                {displayLabel}
                              </Text>
                              {amountText && (
                                <View style={[styles.scanAmountPill, { backgroundColor: colors.warning + "1E" }]}>
                                  <Text style={[styles.scanAmount, { color: colors.warning }]} maxFontSizeMultiplier={1}>
                                    {amountText}
                                  </Text>
                                </View>
                              )}
                            </View>
                            {subtitle && (
                              <Text style={[styles.scanSub, { color: colors.textSecondary }]} numberOfLines={1} maxFontSizeMultiplier={1}>
                                {subtitle}
                              </Text>
                            )}
                          </View>

                          <View style={styles.scanRight}>
                            <Text style={[styles.scanTime, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
                              {formatRelativeTime(scan.scannedAt)}
                            </Text>
                            <View style={[styles.safeIndicator, { backgroundColor: colors.safe + "18" }]}>
                              <Ionicons name="shield-checkmark" size={13} color={colors.safe} />
                            </View>
                          </View>
                        </Pressable>
                      </Swipeable>
                    </Animated.View>
                  );
                })}
              </View>
            )}
          </Animated.View>

          <View style={{ height: 110 }} />
        </ScrollView>
      </View>

    </>
  );
}

function makeStyles(c: ReturnType<typeof import("@/contexts/ThemeContext").useTheme>["colors"], width: number) {
  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (size: number) => Math.round(size * s);
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scrollContent: { paddingHorizontal: 18, paddingTop: 6 },

    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22, gap: 8 },
    headerLeft: { flex: 1, minWidth: 0 },
    greeting: { fontSize: rf(22), fontFamily: "Inter_700Bold", color: c.text, flexShrink: 1 },
    tagline: { fontSize: rf(12), fontFamily: "Inter_400Regular", color: c.textMuted, marginTop: 2, letterSpacing: 0.3 },
    headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },

    iconBtn: {
      width: 42, height: 42, borderRadius: 21,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder,
      alignItems: "center", justifyContent: "center",
    },
    notifDot: {
      position: "absolute", top: -3, right: -3,
      minWidth: 17, height: 17, borderRadius: 9,
      alignItems: "center", justifyContent: "center",
      paddingHorizontal: 3, borderWidth: 1.5, borderColor: c.background,
    },
    notifDotText: { fontSize: rf(11), fontFamily: "Inter_700Bold", lineHeight: 14 },

    avatarRing: { width: 46, height: 46, borderRadius: 23 },
    avatarRingGradient: { width: 46, height: 46, borderRadius: 23, padding: 2, alignItems: "center", justifyContent: "center" },
    avatarInner: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    avatarImg: { width: 42, height: 42, borderRadius: 21 },
    avatarInitial: { fontSize: rf(17), fontFamily: "Inter_700Bold" },

    signInPill: {
      flexDirection: "row", alignItems: "center", gap: 5,
      paddingHorizontal: 13, paddingVertical: 9, borderRadius: 22, borderWidth: 1,
    },
    signInPillText: { fontFamily: "Inter_600SemiBold", fontSize: rf(13) },

    heroCard: { borderRadius: 24, overflow: "hidden", marginBottom: 18 },
    heroGradient: { borderRadius: 24, padding: 20 },
    heroBorderAccent: {
      position: "absolute", inset: 0, borderRadius: 24, borderWidth: 1,
    } as any,
    heroLeft: { flexDirection: "row", alignItems: "flex-start", gap: 16, marginBottom: 0 },
    heroIconRing: {
      width: 76, height: 76, borderRadius: 22, borderWidth: 1.5,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    heroIconBg: { width: 76, height: 76, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    heroTop: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
    heroTextBlock: { flex: 1 },
    heroTitle: { fontSize: rf(16), fontFamily: "Inter_700Bold", marginBottom: 4 },
    heroSub: { fontSize: rf(12), fontFamily: "Inter_400Regular", lineHeight: Math.round(17 * s) },
    heroPillRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
    heroPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1 },
    heroPillText: { fontSize: rf(12), fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },
    heroArrow: {
      width: 40, height: 40, borderRadius: 20,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },

    statsRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
    statCard: {
      flex: 1, borderRadius: 18, padding: 14, alignItems: "center",
      borderWidth: 1, gap: 5, overflow: "hidden",
    },
    statCardGlow: {
      position: "absolute", top: 0, left: 0, right: 0, height: 40,
    },
    statIconWrap: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    statLabel: { fontSize: rf(11), fontFamily: "Inter_700Bold", textAlign: "center" },
    statDesc: { fontSize: rf(10), fontFamily: "Inter_600SemiBold", textAlign: "center", letterSpacing: 0.2 },

    promoBanner: { borderRadius: 20, overflow: "hidden", marginBottom: 22 },
    promoGradient: { borderRadius: 20, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
    promoIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    promoTitle: { fontSize: rf(14), fontFamily: "Inter_700Bold", marginBottom: 3 },
    promoSub: { fontSize: rf(12), fontFamily: "Inter_400Regular", lineHeight: Math.round(16 * s) },
    promoArrow: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },

    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    sectionDot: { width: 10, height: 10, borderRadius: 5 },
    sectionTitle: { fontSize: rf(16), fontFamily: "Inter_700Bold" },
    seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 12 },
    seeAllText: { fontSize: rf(12), fontFamily: "Inter_600SemiBold" },

    emptyWrap: {
      alignItems: "center", paddingVertical: 40, gap: 10,
      borderRadius: 20, borderWidth: 1,
    },
    emptyIconBox: { width: 70, height: 70, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 4 },
    emptyTitle: { fontSize: rf(15), fontFamily: "Inter_600SemiBold" },
    emptySub: { fontSize: rf(13), fontFamily: "Inter_400Regular" },

    signInBannerCard: {
      flexDirection: "row",
      alignItems: "center",
      gap: 14,
      borderRadius: 14,
      padding: 14,
      marginBottom: 18,
      borderWidth: 1,
    },
    signInBannerIcon: {
      width: 46,
      height: 46,
      borderRadius: 14,
      alignItems: "center",
      justifyContent: "center",
      flexShrink: 0,
    },
    signInBannerTitle: {
      fontSize: rf(14),
      fontFamily: "Inter_700Bold",
      letterSpacing: -0.2,
    },
    signInBannerSub: {
      fontSize: rf(12),
      fontFamily: "Inter_400Regular",
      lineHeight: Math.round(16 * s),
      marginTop: 1,
    },
    signInBannerCta: {
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 22,
      flexShrink: 0,
    },
    signInBannerCtaText: {
      fontSize: rf(13),
      fontFamily: "Inter_700Bold",
      color: "#fff",
      letterSpacing: 0.1,
    },

    recentList: { gap: 10 },
    scanItem: {
      flexDirection: "row", alignItems: "center",
      borderRadius: 20, borderWidth: 1,
      paddingHorizontal: 14, paddingVertical: 13, gap: 13,
    },
    scanIconBox: { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
    scanBody: { flex: 1, minWidth: 0, gap: 4 },
    scanTopRow: { flexDirection: "row", alignItems: "center", gap: 7 },
    scanContent: { fontSize: rf(14), fontFamily: "Inter_700Bold", lineHeight: Math.round(20 * s), flex: 1, letterSpacing: -0.1 },
    scanAmountPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100, flexShrink: 0 },
    scanAmount: { fontSize: rf(12), fontFamily: "Inter_700Bold" },
    scanSub: { fontSize: rf(12), fontFamily: "Inter_400Regular", lineHeight: Math.round(16 * s) },
    scanRight: { alignItems: "flex-end", gap: 8, flexShrink: 0 },
    scanTime: { fontSize: rf(11), fontFamily: "Inter_500Medium", letterSpacing: 0.1 },
    safeIndicator: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
    swipeDeleteBtn: {
      backgroundColor: c.danger,
      justifyContent: "center",
      alignItems: "center",
      width: 72,
      borderRadius: 20,
      marginLeft: 8,
      gap: 3,
    },
    swipeDeleteText: { fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: "#fff" },
  });
}