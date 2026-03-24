import { View, Text, StyleSheet, Pressable, ScrollView, Platform, RefreshControl, Image } from "react-native";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "@/lib/haptics";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { useHome } from "@/hooks/useHome";
import { detectContentType, getContentTypeIcon, truncate, formatRelativeTime } from "@/lib/utils/formatters";
import NotificationsModal from "@/features/home/components/NotificationsModal";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const {
    user, photoURL, recentScans, refreshing, onRefresh,
    notifCount, notifOpen, setNotifOpen,
    notifications, markingRead, pulseStyle,
    handleOpenNotifications, handleClearNotifications,
  } = useHome();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const styles = makeStyles(colors);

  function getFirstName(name: string) {
    return name ? name.trim().split(/\s+/)[0] : "";
  }

  const STAT_ITEMS = [
    { icon: "shield-checkmark" as const, label: "Safe Scans", desc: "Verified clean", color: colors.safe, bg: colors.safeDim },
    { icon: "warning" as const, label: "Stay Alert", desc: "Report risks", color: colors.warning, bg: colors.warningDim },
    { icon: "chatbubbles" as const, label: "Community", desc: "Trust reviews", color: colors.accent, bg: colors.accentDim },
  ];

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
              <Text style={styles.tagline}>Scan smart. Stay safe.</Text>
            </View>
            <View style={styles.headerRight}>
              {user && (
                <Pressable onPress={handleOpenNotifications} style={styles.iconBtn} accessibilityLabel="Notifications">
                  <Ionicons
                    name={notifCount > 0 ? "notifications" : "notifications-outline"}
                    size={21}
                    color={notifCount > 0 ? colors.primary : colors.textSecondary}
                  />
                  {notifCount > 0 && (
                    <View style={[styles.notifDot, { backgroundColor: colors.primary }]}>
                      <Text style={[styles.notifDotText, { color: colors.primaryText }]}>
                        {notifCount > 99 ? "99+" : notifCount}
                      </Text>
                    </View>
                  )}
                </Pressable>
              )}
              {user ? (
                <Pressable onPress={() => router.push("/(tabs)/profile")} style={styles.avatarRing}>
                  <LinearGradient
                    colors={[colors.primary, colors.accent]}
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
                  ? ["#061527", "#03101F", "#060E1B"]
                  : ["#EAF3FF", "#DDEEFF", "#E8F4FF"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={styles.heroGradient}
              >
                <View style={[styles.heroBorderAccent, { borderColor: colors.primary + "30" }]} />
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
                    <Text style={[styles.heroSub, { color: colors.textSecondary }]}>
                      Camera · Gallery · Instant AI analysis
                    </Text>
                  </View>
                  <View style={[styles.heroArrow, { backgroundColor: colors.primary }]}>
                    <Ionicons name="arrow-forward" size={18} color={colors.primaryText} />
                  </View>
                </View>
                <View style={styles.heroPillRow}>
                  {["Safe check", "Fraud detect", "Trust score"].map((t) => (
                    <View key={t} style={[styles.heroPill, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "35" }]}>
                      <Text style={[styles.heroPillText, { color: colors.primary }]}>{t}</Text>
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
                  <Text style={[styles.statLabel, { color: colors.text }]}>{s.label}</Text>
                  <Text style={[styles.statDesc, { color: s.color }]}>{s.desc}</Text>
                </View>
              ))}
            </View>
          </Animated.View>

          {/* ── GUEST PROMO ── */}
          {!user && (
            <Animated.View entering={FadeInDown.duration(500).delay(240)}>
              <Pressable
                onPress={() => router.push("/(auth)/login")}
                style={({ pressed }) => [styles.promoBanner, { opacity: pressed ? 0.9 : 1 }]}
              >
                <LinearGradient
                  colors={isDark
                    ? ["rgba(176,96,255,0.14)", "rgba(0,229,255,0.08)"]
                    : ["rgba(124,58,237,0.07)", "rgba(0,111,255,0.05)"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[styles.promoGradient, { borderColor: colors.accent + "30" }]}
                >
                  <View style={[styles.promoIconWrap, { backgroundColor: colors.accentDim }]}>
                    <Ionicons name="sparkles" size={20} color={colors.accent} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.promoTitle, { color: colors.text }]}>Unlock Full Access</Text>
                    <Text style={[styles.promoSub, { color: colors.textSecondary }]}>
                      Sign in to comment, report, and sync history
                    </Text>
                  </View>
                  <View style={[styles.promoArrow, { backgroundColor: colors.accentDim }]}>
                    <Ionicons name="chevron-forward" size={16} color={colors.accent} />
                  </View>
                </LinearGradient>
              </Pressable>
            </Animated.View>
          )}

          {/* ── RECENT SCANS ── */}
          <Animated.View entering={FadeInDown.duration(500).delay(320)}>
            <View style={styles.sectionHeader}>
              <View style={styles.sectionTitleRow}>
                <LinearGradient
                  colors={[colors.primary, colors.accent]}
                  style={styles.sectionDot}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                />
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
                  const contentType = detectContentType(scan.content);
                  const icon = getContentTypeIcon(contentType) as any;
                  const accentMap: Record<string, string> = {
                    url: colors.primary, payment: colors.accent,
                    wifi: colors.safe, phone: colors.safe,
                    email: colors.warning, location: colors.danger,
                  };
                  const accent = accentMap[contentType] ?? colors.primary;
                  return (
                    <Animated.View
                      key={scan.id}
                      entering={FadeInRight.duration(350).delay(idx * 55)}
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
                            opacity: pressed ? 0.85 : 1,
                            transform: [{ scale: pressed ? 0.982 : 1 }],
                          },
                        ]}
                      >
                        <View style={[styles.scanAccent, { backgroundColor: accent }]} />
                        <View style={[styles.scanIconBox, { backgroundColor: accent + "1A" }]}>
                          <Ionicons name={icon} size={17} color={accent} />
                        </View>
                        <View style={styles.scanBody}>
                          <Text style={[styles.scanContent, { color: colors.text }]} numberOfLines={1}>
                            {truncate(scan.content, 38)}
                          </Text>
                          <View style={styles.scanMeta}>
                            <View style={[styles.scanBadge, { backgroundColor: accent + "18", borderColor: accent + "40" }]}>
                              <Text style={[styles.scanBadgeText, { color: accent }]}>
                                {contentType.charAt(0).toUpperCase() + contentType.slice(1)}
                              </Text>
                            </View>
                            <Text style={[styles.scanTime, { color: colors.textMuted }]}>
                              {formatRelativeTime(scan.scannedAt)}
                            </Text>
                          </View>
                        </View>
                        {scan.qrCodeId && (
                          <View style={[styles.scanChevron, { backgroundColor: colors.primaryDim }]}>
                            <Ionicons name="chevron-forward" size={13} color={colors.primary} />
                          </View>
                        )}
                      </Pressable>
                    </Animated.View>
                  );
                })}
              </View>
            )}
          </Animated.View>

          <View style={{ height: 110 }} />
        </ScrollView>
      </View>

      <NotificationsModal
        visible={notifOpen}
        notifications={notifications}
        markingRead={markingRead}
        onClose={() => setNotifOpen(false)}
        onClearAll={handleClearNotifications}
      />
    </>
  );
}

function makeStyles(c: ReturnType<typeof import("@/contexts/ThemeContext").useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scrollContent: { paddingHorizontal: 18, paddingTop: 6 },

    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22, gap: 8 },
    headerLeft: { flex: 1, minWidth: 0 },
    greeting: { fontSize: 28, fontFamily: "Inter_700Bold", color: c.text, flexShrink: 1 },
    tagline: { fontSize: 12, fontFamily: "Inter_400Regular", color: c.textMuted, marginTop: 2, letterSpacing: 0.3 },
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
    notifDotText: { fontSize: 9, fontFamily: "Inter_700Bold", lineHeight: 14 },

    avatarRing: { width: 46, height: 46, borderRadius: 23 },
    avatarRingGradient: { width: 46, height: 46, borderRadius: 23, padding: 2, alignItems: "center", justifyContent: "center" },
    avatarInner: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", overflow: "hidden" },
    avatarImg: { width: 42, height: 42, borderRadius: 21 },
    avatarInitial: { fontSize: 17, fontFamily: "Inter_700Bold" },

    signInPill: {
      flexDirection: "row", alignItems: "center", gap: 5,
      paddingHorizontal: 13, paddingVertical: 9, borderRadius: 22, borderWidth: 1,
    },
    signInPillText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },

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
    heroTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginBottom: 5 },
    heroSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginBottom: 12, lineHeight: 17 },
    heroPillRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
    heroPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1 },
    heroPillText: { fontSize: 10, fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },
    heroArrow: {
      position: "absolute", bottom: 18, right: 18,
      width: 40, height: 40, borderRadius: 20,
      alignItems: "center", justifyContent: "center",
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
    statLabel: { fontSize: 11, fontFamily: "Inter_700Bold", textAlign: "center" },
    statDesc: { fontSize: 9, fontFamily: "Inter_600SemiBold", textAlign: "center", letterSpacing: 0.2 },

    promoBanner: { borderRadius: 20, overflow: "hidden", marginBottom: 22 },
    promoGradient: { borderRadius: 20, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
    promoIconWrap: { width: 42, height: 42, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    promoTitle: { fontSize: 14, fontFamily: "Inter_700Bold", marginBottom: 3 },
    promoSub: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
    promoArrow: { width: 30, height: 30, borderRadius: 10, alignItems: "center", justifyContent: "center" },

    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    sectionDot: { width: 10, height: 10, borderRadius: 5 },
    sectionTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
    seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 12 },
    seeAllText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },

    emptyWrap: {
      alignItems: "center", paddingVertical: 40, gap: 10,
      borderRadius: 20, borderWidth: 1,
    },
    emptyIconBox: { width: 70, height: 70, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 4 },
    emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
    emptySub: { fontSize: 13, fontFamily: "Inter_400Regular" },

    recentList: { gap: 8 },
    scanItem: {
      flexDirection: "row", alignItems: "center",
      borderRadius: 18, borderWidth: 1, overflow: "hidden",
      paddingRight: 14, paddingVertical: 13,
    },
    scanAccent: { width: 3, alignSelf: "stretch", borderTopRightRadius: 3, borderBottomRightRadius: 3, marginRight: 13 },
    scanIconBox: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center", marginRight: 12, flexShrink: 0 },
    scanBody: { flex: 1, minWidth: 0, gap: 5 },
    scanContent: { fontSize: 13.5, fontFamily: "Inter_500Medium", lineHeight: 18 },
    scanMeta: { flexDirection: "row", alignItems: "center", gap: 7 },
    scanBadge: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100, borderWidth: 1 },
    scanBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
    scanTime: { fontSize: 10, fontFamily: "Inter_400Regular" },
    scanChevron: { width: 26, height: 26, borderRadius: 8, alignItems: "center", justifyContent: "center", marginLeft: 8 },
  });
}
