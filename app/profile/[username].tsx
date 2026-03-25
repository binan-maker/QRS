import React, { useRef } from "react";
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  StyleSheet, Image, Share, Platform, useWindowDimensions,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePublicProfile } from "@/features/profile/hooks/usePublicProfile";
import { formatCompactNumber } from "@/lib/number-format";

function safeBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)");
}

const CONTENT_TYPE_ICONS: Record<string, { icon: keyof typeof Ionicons.glyphMap; gradient: [string, string] }> = {
  url:      { icon: "globe-outline",         gradient: ["#006FFF", "#00CFFF"] },
  payment:  { icon: "card-outline",          gradient: ["#F59E0B", "#F97316"] },
  wifi:     { icon: "wifi-outline",          gradient: ["#3B82F6", "#6366F1"] },
  phone:    { icon: "call-outline",          gradient: ["#10B981", "#06B6D4"] },
  email:    { icon: "mail-outline",          gradient: ["#8B5CF6", "#EC4899"] },
  location: { icon: "location-outline",      gradient: ["#EF4444", "#F97316"] },
  text:     { icon: "document-text-outline", gradient: ["#6B7280", "#9CA3AF"] },
};
function getQrIcon(ct: string) { return CONTENT_TYPE_ICONS[ct] ?? CONTENT_TYPE_ICONS.text; }

function formatJoinDate(iso: string | null): string {
  if (!iso) return "QR Guard Member";
  try {
    const d = new Date(iso);
    return `Member since ${d.toLocaleDateString(undefined, { month: "long", year: "numeric" })}`;
  } catch { return "QR Guard Member"; }
}

// Generates a deterministic cover gradient from username
function getCoverGradients(username: string): [string, string, string] {
  const h = username.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const palettes: [string, string, string][] = [
    ["#0A1628", "#0F2040", "#0D2A4A"],
    ["#0D0A20", "#1A0A30", "#120D28"],
    ["#0A1A18", "#081E20", "#0A1828"],
    ["#1A0A10", "#200A14", "#180810"],
    ["#0A1020", "#0C1830", "#080E1E"],
  ];
  return palettes[h % palettes.length];
}

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const { profile, qrCodes, loading, notFound, qrLoading, getGuardianRank } = usePublicProfile(username ?? "");
  const isOwnProfile = user?.id === profile?.userId;

  async function handleShare() {
    try {
      await Share.share({ message: `Check out @${username}'s profile on QR Guard!` });
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
        <Pressable onPress={safeBack} style={[S.floatBackBtn, { top: topInset + 10, backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Ionicons name="person-remove-outline" size={56} color={colors.textMuted} />
        <Text style={[S.notFoundTitle, { color: colors.text }]}>User Not Found</Text>
        <Text style={[S.notFoundSub, { color: colors.textSecondary }]}>
          @{username} doesn't exist or hasn't set up a profile yet.
        </Text>
        <Pressable onPress={safeBack} style={[S.notFoundBtn, { backgroundColor: colors.primary }]}>
          <Text style={[S.notFoundBtnText, { color: colors.primaryText }]}>Go Back</Text>
        </Pressable>
      </View>
    );
  }

  const initials = profile.displayName
    .split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const rank = getGuardianRank(profile.stats);
  const coverColors = isDark ? getCoverGradients(username ?? "") : ["#E8F2FF", "#EEF5FF", "#F4F8FF"] as [string, string, string];

  const STAT_ITEMS = [
    { label: "Codes",   value: profile.stats.qrCount,            gradient: ["#006FFF", "#00CFFF"] as [string, string], icon: "qr-code-outline" as const },
    { label: "Scans",   value: profile.stats.totalScans,         gradient: ["#10B981", "#34D399"] as [string, string], icon: "scan-outline" as const },
    { label: "Likes",   value: profile.stats.totalLikesReceived, gradient: ["#EC4899", "#F472B6"] as [string, string], icon: "heart-outline" as const },
    { label: "Reports", value: profile.stats.safeReportsGiven,   gradient: ["#F59E0B", "#FBBF24"] as [string, string], icon: "shield-checkmark-outline" as const },
  ];

  const HERO_H = topInset + 260;

  return (
    <View style={[S.container, { backgroundColor: colors.background }]}>

      {/* ── Floating nav ── */}
      <View style={[S.floatingNav, { top: topInset + 10 }]}>
        <Pressable onPress={safeBack} style={[S.navBtn, { backgroundColor: "rgba(0,0,0,0.45)", borderColor: "rgba(255,255,255,0.12)" }]}>
          <Ionicons name="chevron-back" size={22} color="#fff" />
        </Pressable>
        <Pressable onPress={handleShare} style={[S.navBtn, { backgroundColor: "rgba(0,0,0,0.45)", borderColor: "rgba(255,255,255,0.12)" }]}>
          <Ionicons name="share-outline" size={20} color="#fff" />
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>

        {/* ══════════════ HERO SECTION ══════════════ */}
        <View style={[S.hero, { height: HERO_H }]}>
          {/* Cover background */}
          <LinearGradient colors={coverColors} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />

          {/* Decorative mesh overlay */}
          <LinearGradient
            colors={["#006FFF1A", "#8B5CF60D", "transparent"]}
            style={StyleSheet.absoluteFill}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
          />

          {/* Grid dot pattern overlay */}
          <View style={[StyleSheet.absoluteFill, S.heroPattern]} pointerEvents="none">
            {Array.from({ length: 6 }).map((_, row) =>
              Array.from({ length: 8 }).map((_, col) => (
                <View
                  key={`${row}-${col}`}
                  style={[S.heroDot, {
                    top: row * 42 + (topInset + 10),
                    left: col * (screenWidth / 7),
                    opacity: 0.04 + (((row + col) % 3) * 0.02),
                  }]}
                />
              ))
            )}
          </View>

          {/* Bottom fade */}
          <LinearGradient
            colors={["transparent", colors.background]}
            style={S.heroFade}
            start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }}
          />

          {/* Avatar + rank + name */}
          <View style={[S.heroContent, { paddingTop: topInset + 56 }]}>
            <Animated.View entering={FadeInDown.duration(400)} style={S.avatarZone}>
              {/* Outer glow ring */}
              <View style={[S.avatarGlowRing, { borderColor: rank.color + "50" }]} />
              <LinearGradient colors={["#006FFF", "#8B5CF6", "#EC4899"]} style={S.avatarRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={[S.avatarInner, { backgroundColor: isDark ? "#0A1628" : "#F0F7FF" }]}>
                  {profile.photoURL ? (
                    <Image source={{ uri: profile.photoURL }} style={S.avatarPhoto} />
                  ) : (
                    <Text style={[S.avatarInitials, { color: colors.primary }]}>{initials}</Text>
                  )}
                </View>
              </LinearGradient>
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(400).delay(80)} style={S.rankRow}>
              <LinearGradient
                colors={[rank.color + "28", rank.color + "10"]}
                style={[S.rankBadge, { borderColor: rank.color + "55" }]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
              >
                <Ionicons name={rank.icon as any} size={12} color={rank.color} />
                <Text style={[S.rankText, { color: rank.color }]}>{rank.label}</Text>
              </LinearGradient>
              {isOwnProfile && (
                <View style={[S.ownBadge, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}>
                  <Text style={[S.ownBadgeText, { color: colors.primary }]}>Your Profile</Text>
                </View>
              )}
            </Animated.View>

            <Animated.View entering={FadeInDown.duration(400).delay(140)} style={S.nameBlock}>
              <Text style={[S.displayName, { color: isDark ? "#fff" : colors.text }]} numberOfLines={1}>
                {profile.displayName}
              </Text>
              <Text style={[S.usernameText, { color: colors.primary }]}>@{profile.username}</Text>
              {profile.bio ? (
                <Text style={[S.bio, { color: isDark ? "rgba(255,255,255,0.65)" : colors.textSecondary }]} numberOfLines={2}>
                  {profile.bio}
                </Text>
              ) : null}
              <Text style={[S.joinDate, { color: isDark ? "rgba(255,255,255,0.3)" : colors.textMuted }]}>
                {formatJoinDate(profile.joinedAt)}
              </Text>
            </Animated.View>
          </View>
        </View>

        <View style={S.body}>

          {/* ══════════════ STATS ROW ══════════════ */}
          {profile.privacy.showStats && (
            <Animated.View entering={FadeInDown.duration(400).delay(100)}>
              <View style={S.statsRow}>
                {STAT_ITEMS.map((s, i) => (
                  <View key={i} style={[S.statCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                    <LinearGradient colors={[s.gradient[0] + "18", "transparent"]} style={StyleSheet.absoluteFill} />
                    <LinearGradient colors={s.gradient} style={S.statIconWrap} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                      <Ionicons name={s.icon} size={12} color="#fff" />
                    </LinearGradient>
                    <Text style={[S.statValue, { color: colors.text }]}>{formatCompactNumber(s.value)}</Text>
                    <Text style={[S.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* ══════════════ GUARDIAN PASSPORT ══════════════ */}
          <Animated.View entering={FadeInDown.duration(400).delay(160)}>
            <LinearGradient
              colors={isDark ? ["#06142A", "#0A1E3A"] : ["#EBF3FF", "#F4F8FF"]}
              style={[S.passport, { borderColor: rank.color + "35" }]}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              {/* Holographic shimmer */}
              <LinearGradient
                colors={[rank.color + "12", "#8B5CF608", "transparent"]}
                style={StyleSheet.absoluteFill}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              />

              {/* Header row */}
              <View style={S.passportHeader}>
                <LinearGradient colors={["#006FFF", "#8B5CF6"]} style={S.passportLogo} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <MaterialCommunityIcons name="shield-check" size={16} color="#fff" />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={[S.passportBrand, { color: colors.primary }]}>QR GUARD</Text>
                  <Text style={[S.passportType, { color: colors.textMuted }]}>Guardian Passport</Text>
                </View>
                <LinearGradient
                  colors={[rank.color + "28", rank.color + "10"]}
                  style={[S.passportRankBadge, { borderColor: rank.color + "55" }]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}
                >
                  <Ionicons name={rank.icon as any} size={11} color={rank.color} />
                  <Text style={[S.passportRankText, { color: rank.color }]}>{rank.label.toUpperCase()}</Text>
                </LinearGradient>
              </View>

              <View style={[S.passportDivider, { backgroundColor: rank.color + "22" }]} />

              {/* Identity row */}
              <View style={S.passportIdentity}>
                <View style={S.passportAvatar}>
                  {profile.photoURL ? (
                    <Image source={{ uri: profile.photoURL }} style={S.passportAvatarImg} />
                  ) : (
                    <LinearGradient colors={["#006FFF", "#8B5CF6"]} style={S.passportAvatarGradient}>
                      <Text style={S.passportAvatarInitials}>{initials}</Text>
                    </LinearGradient>
                  )}
                </View>
                <View style={{ flex: 1, gap: 3 }}>
                  <Text style={[S.passportName, { color: colors.text }]} numberOfLines={1}>{profile.displayName}</Text>
                  <Text style={[S.passportHandle, { color: colors.primary }]}>@{profile.username}</Text>
                  {profile.bio ? (
                    <Text style={[S.passportBio, { color: colors.textSecondary }]} numberOfLines={2}>{profile.bio}</Text>
                  ) : null}
                </View>
              </View>

              {/* Stats footer */}
              <View style={[S.passportFooter, { borderTopColor: rank.color + "20" }]}>
                {[
                  { label: "QR CODES", value: formatCompactNumber(profile.stats.qrCount), color: colors.primary },
                  { label: "TOTAL SCANS", value: formatCompactNumber(profile.stats.totalScans), color: "#10B981" },
                  { label: "LIKES", value: formatCompactNumber(profile.stats.totalLikesReceived), color: "#EC4899" },
                ].map((item, i, arr) => (
                  <React.Fragment key={item.label}>
                    <View style={S.passportStat}>
                      <Text style={[S.passportStatNum, { color: item.color }]}>{item.value}</Text>
                      <Text style={[S.passportStatLabel, { color: colors.textMuted }]}>{item.label}</Text>
                    </View>
                    {i < arr.length - 1 && (
                      <View style={[S.passportStatDivider, { backgroundColor: colors.surfaceBorder }]} />
                    )}
                  </React.Fragment>
                ))}
              </View>

              {/* Corner serial */}
              <Text style={[S.passportSerial, { color: rank.color + "35" }]}>
                QRG-{profile.username.slice(0, 4).toUpperCase().padEnd(4, "0")}
              </Text>
            </LinearGradient>
          </Animated.View>

          {/* ══════════════ QR CODES SECTION ══════════════ */}
          {profile.privacy.showQrCodes && (
            <Animated.View entering={FadeInDown.duration(400).delay(220)}>
              <View style={S.sectionHeader}>
                <LinearGradient colors={["#006FFF", "#00CFFF"]} style={S.sectionIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="qr-code-outline" size={13} color="#fff" />
                </LinearGradient>
                <Text style={[S.sectionTitle, { color: colors.text }]}>QR Codes</Text>
                {!qrLoading && qrCodes.length > 0 && (
                  <View style={[S.sectionCount, { backgroundColor: colors.primaryDim }]}>
                    <Text style={[S.sectionCountText, { color: colors.primary }]}>{qrCodes.length}</Text>
                  </View>
                )}
              </View>

              {qrLoading ? (
                <View style={S.loadingRow}>
                  <ActivityIndicator size="small" color={colors.primary} />
                  <Text style={[S.loadingText, { color: colors.textMuted }]}>Loading codes…</Text>
                </View>
              ) : qrCodes.length === 0 ? (
                <View style={[S.emptyCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                  <Ionicons name="qr-code-outline" size={36} color={colors.textMuted} />
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
                          { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.97 : 1 }] },
                        ]}
                      >
                        <LinearGradient colors={[cfg.gradient[0] + "14", "transparent"]} style={StyleSheet.absoluteFill} />
                        <LinearGradient colors={cfg.gradient} style={S.qrCardIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                          <Ionicons name={cfg.icon} size={22} color="#fff" />
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
                          <View style={S.qrScanRow}>
                            <Ionicons name="scan-outline" size={9} color={colors.textMuted} />
                            <Text style={[S.qrScanCount, { color: colors.textMuted }]}>{formatCompactNumber(qr.scanCount)}</Text>
                          </View>
                        )}
                      </Pressable>
                    );
                  })}
                </View>
              )}
            </Animated.View>
          )}

          {/* ══════════════ OWN PROFILE CTA ══════════════ */}
          {isOwnProfile && (
            <Animated.View entering={FadeInDown.duration(400).delay(280)}>
              <Pressable
                onPress={() => router.push("/(tabs)/profile")}
                style={({ pressed }) => [S.ownCta, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40", opacity: pressed ? 0.85 : 1 }]}
              >
                <LinearGradient colors={["#006FFF", "#8B5CF6"]} style={S.ownCtaIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="settings-outline" size={16} color="#fff" />
                </LinearGradient>
                <Text style={[S.ownCtaText, { color: colors.primary }]}>Manage Privacy & Settings</Text>
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

  floatingNav: {
    position: "absolute", left: 16, right: 16, zIndex: 20,
    flexDirection: "row", justifyContent: "space-between",
  },
  navBtn: {
    width: 40, height: 40, borderRadius: 13,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  floatBackBtn: {
    position: "absolute", left: 16, width: 40, height: 40,
    borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  notFoundTitle: { fontSize: 22, fontFamily: "Inter_700Bold", marginTop: 12 },
  notFoundSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21, maxWidth: 260 },
  notFoundBtn: { paddingHorizontal: 28, paddingVertical: 13, borderRadius: 16, marginTop: 10 },
  notFoundBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },

  // Hero
  hero: { overflow: "hidden", position: "relative" },
  heroPattern: { position: "absolute" },
  heroDot: {
    position: "absolute", width: 2, height: 2, borderRadius: 1, backgroundColor: "#fff",
  },
  heroFade: { position: "absolute", bottom: 0, left: 0, right: 0, height: 80 },
  heroContent: { paddingHorizontal: 24, alignItems: "center", gap: 12 },

  avatarZone: { alignItems: "center", justifyContent: "center" },
  avatarGlowRing: {
    position: "absolute", width: 116, height: 116, borderRadius: 58,
    borderWidth: 1.5,
  },
  avatarRing: {
    width: 104, height: 104, borderRadius: 52,
    padding: 3, alignItems: "center", justifyContent: "center",
  },
  avatarInner: {
    width: 98, height: 98, borderRadius: 49,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarPhoto: { width: 98, height: 98, borderRadius: 49 },
  avatarInitials: { fontSize: 38, fontFamily: "Inter_700Bold" },

  rankRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  rankBadge: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 11, paddingVertical: 5, borderRadius: 100, borderWidth: 1,
  },
  rankText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  ownBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1 },
  ownBadgeText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  nameBlock: { alignItems: "center", gap: 3 },
  displayName: { fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.5 },
  usernameText: { fontSize: 15, fontFamily: "Inter_500Medium" },
  bio: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, marginTop: 4, maxWidth: 280 },
  joinDate: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },

  // Body
  body: { paddingHorizontal: 18, paddingTop: 8 },

  // Stats row
  statsRow: { flexDirection: "row", gap: 8, marginBottom: 20 },
  statCard: {
    flex: 1, borderRadius: 18, padding: 12, alignItems: "center",
    gap: 6, borderWidth: 1, overflow: "hidden",
  },
  statIconWrap: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  statValue: { fontSize: 17, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", textAlign: "center", letterSpacing: 0.3 },

  // Passport
  passport: {
    borderRadius: 24, padding: 20, marginBottom: 20,
    borderWidth: 1, overflow: "hidden", gap: 16, position: "relative",
  },
  passportHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  passportLogo: { width: 36, height: 36, borderRadius: 11, alignItems: "center", justifyContent: "center" },
  passportBrand: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 1.5 },
  passportType: { fontSize: 10, fontFamily: "Inter_400Regular" },
  passportRankBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 9, paddingVertical: 5, borderRadius: 100, borderWidth: 1 },
  passportRankText: { fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  passportDivider: { height: 1 },
  passportIdentity: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  passportAvatar: { width: 60, height: 60, borderRadius: 16, overflow: "hidden", flexShrink: 0 },
  passportAvatarImg: { width: 60, height: 60 },
  passportAvatarGradient: { width: 60, height: 60, alignItems: "center", justifyContent: "center" },
  passportAvatarInitials: { fontSize: 22, fontFamily: "Inter_700Bold", color: "#fff" },
  passportName: { fontSize: 17, fontFamily: "Inter_700Bold" },
  passportHandle: { fontSize: 13, fontFamily: "Inter_500Medium" },
  passportBio: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  passportFooter: { flexDirection: "row", alignItems: "center", borderTopWidth: 1, paddingTop: 14 },
  passportStat: { flex: 1, alignItems: "center", gap: 3 },
  passportStatNum: { fontSize: 18, fontFamily: "Inter_700Bold" },
  passportStatLabel: { fontSize: 9, fontFamily: "Inter_400Regular", letterSpacing: 0.5 },
  passportStatDivider: { width: 1, height: 32 },
  passportSerial: {
    position: "absolute", bottom: 14, right: 18,
    fontSize: 9, fontFamily: "Inter_700Bold", letterSpacing: 2,
  },

  // Section header
  sectionHeader: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 14, marginTop: 4 },
  sectionIcon: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold", flex: 1 },
  sectionCount: { paddingHorizontal: 9, paddingVertical: 3, borderRadius: 100 },
  sectionCountText: { fontSize: 12, fontFamily: "Inter_700Bold" },

  loadingRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingVertical: 20 },
  emptyCard: { borderRadius: 20, padding: 36, alignItems: "center", gap: 10, borderWidth: 1, marginBottom: 20 },
  emptyTitle: { fontSize: 14, fontFamily: "Inter_500Medium" },

  // QR grid
  qrGrid: { flexDirection: "row", flexWrap: "wrap", gap: 10, marginBottom: 20 },
  qrCard: {
    width: "47%", borderRadius: 20, padding: 14,
    borderWidth: 1, overflow: "hidden", gap: 8, position: "relative",
  },
  qrCardIcon: { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center" },
  brandedBadge: {
    position: "absolute", top: 10, right: 10,
    flexDirection: "row", alignItems: "center", gap: 3,
    paddingHorizontal: 6, paddingVertical: 2, borderRadius: 100, borderWidth: 1,
  },
  brandedText: { fontSize: 8, fontFamily: "Inter_700Bold" },
  qrCardType: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.8 },
  qrCardName: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  qrScanRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  qrScanCount: { fontSize: 11, fontFamily: "Inter_400Regular" },

  // Own CTA
  ownCta: {
    flexDirection: "row", alignItems: "center", gap: 12,
    borderRadius: 18, padding: 16, borderWidth: 1, marginBottom: 10, overflow: "hidden",
  },
  ownCtaIcon: { width: 32, height: 32, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  ownCtaText: { flex: 1, fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
