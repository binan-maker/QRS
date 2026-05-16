import React, { useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  ScrollView,
  RefreshControl,
  useWindowDimensions,
} from "react-native";
import { Image } from "expo-image";
import { router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/lib/utils/platform";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown, FadeInRight } from "react-native-reanimated";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { useHome } from "@/features/home/hooks/useHome";
import { useAvatar } from "@/contexts/AvatarContext";
import { RecentScanCard, cardStyles, getFirstName } from "@/features/home/components/RecentScanCard";

function HomeScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user, recentScans, isLoading, refreshing, onRefresh, deleteScan, pulseStyle } = useHome();
  const { cachedUrl: photoURL } = useAvatar();

  const topInset = useTopInset();
  const { width } = useWindowDimensions();

  const styles = useMemo(() => makeStyles(colors, width), [colors, width]);

  const STAT_ITEMS = useMemo(() => [
    { icon: "shield-checkmark" as const, label: "Safe Scans",  desc: "Verified clean",  color: colors.safe,    bg: colors.safeDim    },
    { icon: "warning"          as const, label: "Stay Alert",  desc: "Report risks",    color: colors.warning, bg: colors.warningDim },
    { icon: "chatbubbles"      as const, label: "Community",   desc: "Trust reviews",   color: colors.primary, bg: colors.primaryDim },
  ], [colors]);

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
                  {"👋 Hey, "}
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
                        <Image
                          source={{ uri: photoURL }}
                          style={styles.avatarImg}
                          cachePolicy="memory-disk"
                          contentFit="cover"
                          key={photoURL}
                        />
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

            {isLoading ? (
              <View style={styles.recentList}>
                {[0, 1, 2].map((i) => (
                  <Animated.View
                    key={i}
                    entering={FadeInRight.duration(300).delay(i * 60)}
                    style={[
                      cardStyles.scanItem,
                      { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: 0.7 },
                    ]}
                  >
                    <View style={{ width: 46, height: 46, borderRadius: 14, backgroundColor: colors.surfaceBorder }} />
                    <View style={{ flex: 1, gap: 8 }}>
                      <View style={{ height: 14, width: "65%", borderRadius: 7, backgroundColor: colors.surfaceBorder }} />
                      <View style={{ height: 11, width: "40%", borderRadius: 5.5, backgroundColor: colors.surfaceBorder }} />
                    </View>
                    <View style={{ gap: 8, alignItems: "flex-end" }}>
                      <View style={{ height: 11, width: 36, borderRadius: 5.5, backgroundColor: colors.surfaceBorder }} />
                      <View style={{ width: 28, height: 28, borderRadius: 9, backgroundColor: colors.surfaceBorder }} />
                    </View>
                  </Animated.View>
                ))}
              </View>
            ) : recentScans.length === 0 ? (
              <View style={[styles.emptyWrap, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <View style={[styles.emptyIconBox, { backgroundColor: colors.surfaceLight }]}>
                  <Ionicons name="scan-outline" size={32} color={colors.textMuted} />
                </View>
                <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No scans yet</Text>
                <Text style={[styles.emptySub, { color: colors.textMuted }]}>Scan a QR code to get started</Text>
              </View>
            ) : (
              <View style={styles.recentList}>
                {recentScans.map((scan, idx) => (
                  <RecentScanCard
                    key={scan.id}
                    scan={scan}
                    index={idx}
                    colors={colors}
                    isDark={isDark}
                    onDelete={deleteScan}
                  />
                ))}
                <Pressable
                  onPress={() => {
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    router.push("/(tabs)/history");
                  }}
                  style={({ pressed }) => [
                    styles.fullHistoryBtn,
                    {
                      backgroundColor: colors.surface,
                      borderColor: colors.surfaceBorder,
                      opacity: pressed ? 0.82 : 1,
                      transform: [{ scale: pressed ? 0.985 : 1 }],
                    },
                  ]}
                >
                  <Ionicons name="time-outline" size={16} color={colors.primary} />
                  <Text style={[styles.fullHistoryText, { color: colors.primary }]}>See Full History</Text>
                  <Ionicons name="arrow-forward" size={14} color={colors.primary} />
                </Pressable>
              </View>
            )}
          </Animated.View>

          <View style={{ height: Math.max(160, 110 + insets.bottom) }} />
        </ScrollView>
      </View>
    </>
  );
}

function makeStyles(
  c: ReturnType<typeof import("@/contexts/ThemeContext").useTheme>["colors"],
  width: number
) {
  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (size: number) => Math.round(size * s);
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    scrollContent: { paddingHorizontal: 18, paddingTop: 6 },

    header: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 22, gap: 8 },
    headerLeft: { flex: 1, minWidth: 0 },
    greeting: { fontSize: rf(22), fontFamily: "Inter_700Bold", color: c.text, flexShrink: 1 },
    headerRight: { flexDirection: "row", alignItems: "center", gap: 10 },

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
    heroBorderAccent: { position: "absolute", inset: 0, borderRadius: 24, borderWidth: 1 } as any,
    heroTop: { flexDirection: "row", alignItems: "center", gap: 14, marginBottom: 16 },
    heroIconRing: {
      width: 76, height: 76, borderRadius: 22, borderWidth: 1.5,
      alignItems: "center", justifyContent: "center", flexShrink: 0,
    },
    heroIconBg: { width: 76, height: 76, borderRadius: 22, alignItems: "center", justifyContent: "center" },
    heroTextBlock: { flex: 1 },
    heroTitle: { fontSize: rf(16), fontFamily: "Inter_700Bold", marginBottom: 4 },
    heroPillRow: { flexDirection: "row", gap: 6, flexWrap: "wrap" },
    heroPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 100, borderWidth: 1 },
    heroPillText: { fontSize: rf(12), fontFamily: "Inter_600SemiBold", letterSpacing: 0.2 },
    heroArrow: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center", flexShrink: 0 },

    statsRow: { flexDirection: "row", gap: 10, marginBottom: 18 },
    statCard: {
      flex: 1, borderRadius: 18, padding: 14, alignItems: "center",
      borderWidth: 1, gap: 5, overflow: "hidden",
    },
    statCardGlow: { position: "absolute", top: 0, left: 0, right: 0, height: 40 },
    statIconWrap: { width: 40, height: 40, borderRadius: 13, alignItems: "center", justifyContent: "center" },
    statLabel: { fontSize: rf(11), fontFamily: "Inter_700Bold", textAlign: "center" },
    statDesc: { fontSize: rf(10), fontFamily: "Inter_600SemiBold", textAlign: "center", letterSpacing: 0.2 },

    sectionHeader: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    sectionDot: { width: 10, height: 10, borderRadius: 5 },
    sectionTitle: { fontSize: rf(16), fontFamily: "Inter_700Bold" },
    seeAllBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 12 },
    seeAllText: { fontSize: rf(12), fontFamily: "Inter_600SemiBold" },

    emptyWrap: { alignItems: "center", paddingVertical: 40, gap: 10, borderRadius: 20, borderWidth: 1 },
    emptyIconBox: { width: 70, height: 70, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 4 },
    emptyTitle: { fontSize: rf(15), fontFamily: "Inter_600SemiBold" },
    emptySub: { fontSize: rf(13), fontFamily: "Inter_400Regular" },

    recentList: { gap: 10 },

    fullHistoryBtn: {
      flexDirection: "row", alignItems: "center", justifyContent: "center",
      gap: 8, paddingVertical: 14, borderRadius: 20, borderWidth: 1, marginTop: 2,
    },
    fullHistoryText: { fontSize: rf(14), fontFamily: "Inter_600SemiBold", flex: 0 },
  });
}

export default React.memo(HomeScreen);
