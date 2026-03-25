import React from "react";
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  StyleSheet, Image, Share, Platform,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePublicProfile } from "@/features/profile/hooks/usePublicProfile";
import { formatCompactNumber } from "@/lib/number-format";

function safeBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)");
}

const CONTENT_TYPE_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; gradient: [string, string] }> = {
  url:      { icon: "globe-outline",      gradient: ["#006FFF", "#00CFFF"] },
  payment:  { icon: "card-outline",       gradient: ["#F59E0B", "#F97316"] },
  wifi:     { icon: "wifi-outline",       gradient: ["#3B82F6", "#6366F1"] },
  phone:    { icon: "call-outline",       gradient: ["#10B981", "#06B6D4"] },
  email:    { icon: "mail-outline",       gradient: ["#8B5CF6", "#EC4899"] },
  location: { icon: "location-outline",   gradient: ["#EF4444", "#F97316"] },
  text:     { icon: "document-text-outline", gradient: ["#6B7280", "#9CA3AF"] },
};

function getQrIcon(contentType: string) {
  return CONTENT_TYPE_ICONS[contentType] ?? CONTENT_TYPE_ICONS.text;
}

function formatJoinDate(iso: string | null): string {
  if (!iso) return "QR Guard Member";
  try {
    const d = new Date(iso);
    return `Member since ${d.toLocaleDateString(undefined, { month: "long", year: "numeric" })}`;
  } catch { return "QR Guard Member"; }
}

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const { profile, qrCodes, loading, notFound, qrLoading, getGuardianRank } = usePublicProfile(username ?? "");

  const isOwnProfile = user?.id === profile?.userId;

  async function handleShare() {
    try {
      await Share.share({ message: `Check out @${username}'s QR Guard profile!` });
    } catch {}
  }

  if (loading) {
    return (
      <View style={[S.centered, { backgroundColor: colors.background, paddingTop: topInset }]}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={[S.loadingText, { color: colors.textMuted }]}>Loading profile…</Text>
      </View>
    );
  }

  if (notFound || !profile) {
    return (
      <View style={[S.centered, { backgroundColor: colors.background, paddingTop: topInset }]}>
        <View style={S.navBar}>
          <Pressable onPress={safeBack} style={[S.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
        </View>
        <Ionicons name="person-remove-outline" size={52} color={colors.textMuted} />
        <Text style={[S.notFoundTitle, { color: colors.text }]}>User Not Found</Text>
        <Text style={[S.notFoundSub, { color: colors.textSecondary }]}>
          @{username} doesn't exist or hasn't set up a public profile yet.
        </Text>
        <Pressable onPress={safeBack} style={[S.backActionBtn, { backgroundColor: colors.primary }]}>
          <Text style={[S.backActionText, { color: colors.primaryText }]}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const initials = profile.displayName
    .split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);

  const rank = getGuardianRank(profile.stats);

  const STAT_ITEMS = [
    { label: "QR Codes", value: profile.stats.qrCount, icon: "qr-code-outline" as const, gradient: ["#006FFF", "#00CFFF"] as [string, string] },
    { label: "Scans", value: profile.stats.totalScans, icon: "scan-outline" as const, gradient: ["#10B981", "#06B6D4"] as [string, string] },
    { label: "Likes", value: profile.stats.totalLikesReceived, icon: "heart-outline" as const, gradient: ["#EC4899", "#8B5CF6"] as [string, string] },
    { label: "Reports", value: profile.stats.safeReportsGiven, icon: "shield-checkmark-outline" as const, gradient: ["#F59E0B", "#F97316"] as [string, string] },
  ];

  return (
    <View style={[S.container, { backgroundColor: colors.background }]}>
      {/* Floating nav */}
      <View style={[S.floatingNav, { top: topInset + 10 }]}>
        <Pressable onPress={safeBack} style={[S.navBtn, { backgroundColor: colors.surface + "EE", borderColor: colors.surfaceBorder }]}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Pressable onPress={handleShare} style={[S.navBtn, { backgroundColor: colors.surface + "EE", borderColor: colors.surfaceBorder }]}>
          <Ionicons name="share-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 32 }}>

        {/* ── Hero Header ─────────────────────────────────────────────── */}
        <View style={S.heroContainer}>
          <LinearGradient
            colors={isDark ? ["#050F20", "#070D18", "#04090F"] : ["#E0EDFF", "#EAF3FF", "#F0F7FF"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />
          <LinearGradient
            colors={["#006FFF22", "#8B5CF611", "transparent"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />

          <View style={{ height: topInset + 60 }} />

          {/* Avatar */}
          <Animated.View entering={FadeIn.duration(400)} style={S.avatarWrapper}>
            <LinearGradient colors={["#006FFF", "#8B5CF6", "#EC4899"]} style={S.avatarRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <View style={[S.avatarInner, { backgroundColor: colors.surface }]}>
                {profile.photoURL ? (
                  <Image source={{ uri: profile.photoURL }} style={S.avatarPhoto} />
                ) : (
                  <Text style={[S.avatarInitials, { color: colors.primary }]}>{initials}</Text>
                )}
              </View>
            </LinearGradient>
          </Animated.View>

          {/* Rank badge */}
          <Animated.View entering={FadeIn.duration(400).delay(80)} style={S.rankBadgeRow}>
            <LinearGradient
              colors={[rank.color + "30", rank.color + "15"]}
              style={[S.rankBadge, { borderColor: rank.color + "60" }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
            >
              <Ionicons name={rank.icon as any} size={13} color={rank.color} />
              <Text style={[S.rankText, { color: rank.color }]}>{rank.label}</Text>
            </LinearGradient>
            {isOwnProfile && (
              <View style={[S.ownBadge, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}>
                <Text style={[S.ownBadgeText, { color: colors.primary }]}>Your Profile</Text>
              </View>
            )}
          </Animated.View>

          {/* Name & username */}
          <Animated.View entering={FadeInDown.duration(350).delay(100)} style={S.nameBlock}>
            <Text style={[S.displayName, { color: colors.text }]} numberOfLines={1}>{profile.displayName}</Text>
            <Text style={[S.username, { color: colors.primary }]}>@{profile.username}</Text>
            {profile.bio ? (
              <Text style={[S.bio, { color: colors.textSecondary }]}>{profile.bio}</Text>
            ) : null}
            <Text style={[S.joinDate, { color: colors.textMuted }]}>{formatJoinDate(profile.joinedAt)}</Text>
          </Animated.View>

          <View style={{ height: 28 }} />
        </View>

        <View style={S.content}>

          {/* ── Stats Grid ──────────────────────────────────────────────── */}
          {profile.privacy.showStats && (
            <Animated.View entering={FadeInDown.duration(400).delay(150)}>
              <View style={S.statsGrid}>
                {STAT_ITEMS.map((s, i) => (
                  <View key={i} style={[S.statCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <LinearGradient colors={[s.gradient[0] + "20", "transparent"]} style={StyleSheet.absoluteFill} />
                    <LinearGradient colors={s.gradient} style={S.statIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <Ionicons name={s.icon} size={14} color="#fff" />
                    </LinearGradient>
                    <Text style={[S.statValue, { color: colors.text }]}>{formatCompactNumber(s.value)}</Text>
                    <Text style={[S.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* ── Guardian ID Card ─────────────────────────────────────────── */}
          <Animated.View entering={FadeInDown.duration(400).delay(200)}>
            <LinearGradient
              colors={isDark ? ["#0A1628", "#0D1F3C"] : ["#F0F7FF", "#E8F2FF"]}
              style={[S.idCard, { borderColor: colors.primary + "30" }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <LinearGradient
                colors={["#006FFF15", "#8B5CF608", "transparent"]}
                style={StyleSheet.absoluteFill}
              />
              <View style={S.idCardHeader}>
                <LinearGradient colors={["#006FFF", "#8B5CF6"]} style={S.idCardLogo} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="shield-checkmark" size={16} color="#fff" />
                </LinearGradient>
                <View>
                  <Text style={[S.idCardBrand, { color: colors.primary }]}>QR GUARD</Text>
                  <Text style={[S.idCardSub, { color: colors.textMuted }]}>Community ID</Text>
                </View>
                <View style={{ flex: 1 }} />
                <LinearGradient colors={[rank.color + "30", rank.color + "10"]} style={[S.idCardRank, { borderColor: rank.color + "50" }]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
                  <Text style={[S.idCardRankText, { color: rank.color }]}>{rank.label.toUpperCase()}</Text>
                </LinearGradient>
              </View>
              <View style={[S.idCardDivider, { backgroundColor: colors.primary + "20" }]} />
              <View style={S.idCardBody}>
                <View style={S.idCardAvatar}>
                  {profile.photoURL ? (
                    <Image source={{ uri: profile.photoURL }} style={S.idCardAvatarImg} />
                  ) : (
                    <LinearGradient colors={["#006FFF", "#8B5CF6"]} style={S.idCardAvatarGradient}>
                      <Text style={S.idCardAvatarInitials}>{initials}</Text>
                    </LinearGradient>
                  )}
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[S.idCardName, { color: colors.text }]} numberOfLines={1}>{profile.displayName}</Text>
                  <Text style={[S.idCardUsername, { color: colors.primary }]}>@{profile.username}</Text>
                  {profile.bio ? (
                    <Text style={[S.idCardBio, { color: colors.textSecondary }]} numberOfLines={2}>{profile.bio}</Text>
                  ) : null}
                </View>
              </View>
              <View style={S.idCardFooter}>
                <View style={S.idCardStat}>
                  <Text style={[S.idCardStatNum, { color: colors.primary }]}>{formatCompactNumber(profile.stats.qrCount)}</Text>
                  <Text style={[S.idCardStatLabel, { color: colors.textMuted }]}>QR Codes</Text>
                </View>
                <View style={[S.idCardStatDivider, { backgroundColor: colors.surfaceBorder }]} />
                <View style={S.idCardStat}>
                  <Text style={[S.idCardStatNum, { color: "#10B981" }]}>{formatCompactNumber(profile.stats.totalScans)}</Text>
                  <Text style={[S.idCardStatLabel, { color: colors.textMuted }]}>Total Scans</Text>
                </View>
                <View style={[S.idCardStatDivider, { backgroundColor: colors.surfaceBorder }]} />
                <View style={S.idCardStat}>
                  <Text style={[S.idCardStatNum, { color: "#EC4899" }]}>{formatCompactNumber(profile.stats.totalLikesReceived)}</Text>
                  <Text style={[S.idCardStatLabel, { color: colors.textMuted }]}>Likes</Text>
                </View>
              </View>
            </LinearGradient>
          </Animated.View>

          {/* ── Public QR Codes ──────────────────────────────────────────── */}
          {profile.privacy.showQrCodes && (
            <Animated.View entering={FadeInDown.duration(400).delay(250)}>
              <View style={S.sectionHeader}>
                <LinearGradient colors={["#006FFF", "#00CFFF"]} style={S.sectionIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="qr-code-outline" size={13} color="#fff" />
                </LinearGradient>
                <Text style={[S.sectionTitle, { color: colors.text }]}>QR Codes</Text>
              </View>

              {qrLoading ? (
                <View style={S.qrLoadingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[S.qrLoadingText, { color: colors.textMuted }]}>Loading codes…</Text>
                </View>
              ) : qrCodes.length === 0 ? (
                <View style={[S.emptyCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                  <Ionicons name="qr-code-outline" size={32} color={colors.textMuted} />
                  <Text style={[S.emptyTitle, { color: colors.textSecondary }]}>No public QR codes yet</Text>
                </View>
              ) : (
                <View style={S.qrGrid}>
                  {qrCodes.map((qr) => {
                    const cfg = getQrIcon(qr.contentType);
                    return (
                      <Pressable
                        key={qr.id}
                        onPress={() => router.push(`/qr-detail/${qr.id}` as any)}
                        style={({ pressed }) => [
                          S.qrCard,
                          { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.85 : 1 },
                        ]}
                      >
                        <LinearGradient colors={[cfg.gradient[0] + "18", "transparent"]} style={StyleSheet.absoluteFill} />
                        <LinearGradient colors={cfg.gradient} style={S.qrCardIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                          <Ionicons name={cfg.icon} size={20} color="#fff" />
                        </LinearGradient>
                        {qr.isBranded && (
                          <View style={[S.brandedBadge, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}>
                            <Ionicons name="shield-checkmark" size={8} color={colors.primary} />
                            <Text style={[S.brandedText, { color: colors.primary }]}>Guard</Text>
                          </View>
                        )}
                        <Text style={[S.qrCardType, { color: cfg.gradient[0] }]}>{qr.contentType?.toUpperCase()}</Text>
                        {qr.businessName ? (
                          <Text style={[S.qrCardName, { color: colors.text }]} numberOfLines={1}>{qr.businessName}</Text>
                        ) : null}
                        {qr.scanCount != null && (
                          <View style={S.qrCardScanRow}>
                            <Ionicons name="scan-outline" size={9} color={colors.textMuted} />
                            <Text style={[S.qrCardScanCount, { color: colors.textMuted }]}>{formatCompactNumber(qr.scanCount)}</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </Animated.View>
          )}

          {/* ── Own-profile CTA ─────────────────────────────────────────── */}
          {isOwnProfile && (
            <Animated.View entering={FadeInDown.duration(400).delay(300)}>
              <Pressable
                onPress={() => router.push("/(tabs)/profile")}
                style={({ pressed }) => [S.editProfileBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40", opacity: pressed ? 0.85 : 1 }]}
              >
                <Ionicons name="settings-outline" size={18} color={colors.primary} />
                <Text style={[S.editProfileText, { color: colors.primary }]}>Manage Privacy & Settings</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </Pressable>
            </Animated.View>
          )}

        </View>
      </ScrollView>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },
  loadingText: { fontSize: 14, fontFamily: "Inter_400Regular", marginTop: 10 },
  navBar: { position: "absolute", top: 16, left: 16 },
  floatingNav: {
    position: "absolute", left: 16, right: 16, zIndex: 10,
    flexDirection: "row", justifyContent: "space-between",
  },
  navBtn: {
    width: 40, height: 40, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, backdropFilter: "blur(10px)" as any,
  },
  backBtn: {
    width: 40, height: 40, borderRadius: 14,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  notFoundTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 12 },
  notFoundSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
  backActionBtn: { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 16, marginTop: 8 },
  backActionText: { fontSize: 15, fontFamily: "Inter_700Bold" },

  heroContainer: { overflow: "hidden" },
  avatarWrapper: { alignItems: "center" },
  avatarRing: {
    width: 100, height: 100, borderRadius: 50,
    padding: 3, alignItems: "center", justifyContent: "center",
  },
  avatarInner: {
    width: 94, height: 94, borderRadius: 47,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarPhoto: { width: 94, height: 94, borderRadius: 47 },
  avatarInitials: { fontSize: 36, fontFamily: "Inter_700Bold" },

  rankBadgeRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 12, justifyContent: "center" },
  rankBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 5, borderRadius: 100, borderWidth: 1,
  },
  rankText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  ownBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1,
  },
  ownBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  nameBlock: { alignItems: "center", marginTop: 14, paddingHorizontal: 24, gap: 4 },
  displayName: { fontSize: 26, fontFamily: "Inter_700Bold", textAlign: "center" },
  username: { fontSize: 15, fontFamily: "Inter_500Medium" },
  bio: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginTop: 4 },
  joinDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 4 },

  content: { paddingHorizontal: 18, paddingTop: 6 },

  statsGrid: { flexDirection: "row", gap: 8, marginBottom: 16 },
  statCard: {
    flex: 1, borderRadius: 18, padding: 12, alignItems: "center",
    gap: 5, borderWidth: 1, overflow: "hidden",
  },
  statIcon: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", textAlign: "center", letterSpacing: 0.2 },

  idCard: {
    borderRadius: 24, padding: 20, marginBottom: 20,
    borderWidth: 1, overflow: "hidden", gap: 16,
  },
  idCardHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  idCardLogo: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  idCardBrand: { fontSize: 13, fontFamily: "Inter_700Bold", letterSpacing: 1.2 },
  idCardSub: { fontSize: 10, fontFamily: "Inter_400Regular" },
  idCardRank: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  idCardRankText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  idCardDivider: { height: 1 },
  idCardBody: { flexDirection: "row", alignItems: "center", gap: 14 },
  idCardAvatar: { width: 56, height: 56, borderRadius: 16, overflow: "hidden", flexShrink: 0 },
  idCardAvatarImg: { width: 56, height: 56 },
  idCardAvatarGradient: { width: 56, height: 56, alignItems: "center", justifyContent: "center" },
  idCardAvatarInitials: { fontSize: 20, fontFamily: "Inter_700Bold", color: "#fff" },
  idCardName: { fontSize: 16, fontFamily: "Inter_700Bold", marginBottom: 2 },
  idCardUsername: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 4 },
  idCardBio: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  idCardFooter: { flexDirection: "row", alignItems: "center" },
  idCardStat: { flex: 1, alignItems: "center", gap: 3 },
  idCardStatNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
  idCardStatLabel: { fontSize: 10, fontFamily: "Inter_400Regular" },
  idCardStatDivider: { width: 1, height: 30 },

  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14, marginTop: 4 },
  sectionIcon: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },

  qrLoadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 20 },
  qrLoadingText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  emptyCard: {
    borderRadius: 20, padding: 32, alignItems: "center", gap: 10,
    borderWidth: 1, marginBottom: 16,
  },
  emptyTitle: { fontSize: 14, fontFamily: "Inter_500Medium" },

  qrGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  qrCard: {
    width: "47%", borderRadius: 18, padding: 14,
    borderWidth: 1, overflow: "hidden", gap: 8, position: "relative",
  },
  qrCardIcon: { width: 44, height: 44, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  brandedBadge: {
    position: "absolute", top: 10, right: 10,
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 100, borderWidth: 1,
  },
  brandedText: { fontSize: 8, fontFamily: "Inter_700Bold" },
  qrCardType: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  qrCardName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  qrCardScanRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  qrCardScanCount: { fontSize: 11, fontFamily: "Inter_400Regular" },

  editProfileBtn: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 18, padding: 16, borderWidth: 1, marginBottom: 8,
  },
  editProfileText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
