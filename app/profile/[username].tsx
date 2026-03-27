import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  StyleSheet, Image, Share, Platform, useWindowDimensions, Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Animated, { FadeIn, FadeInDown, FadeInUp } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePublicProfile } from "@/features/profile/hooks/usePublicProfile";
import { formatCompactNumber } from "@/lib/number-format";
import {
  getFriendsLeaderboard,
  FriendLeaderboardEntry,
} from "@/lib/services/user-service";
import {
  getFriendStatus,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  removeFriend,
  FriendStatus,
} from "@/lib/services/friend-service";

function safeBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)");
}

function formatJoinDate(iso: string | null): string {
  if (!iso) return "QR Guard Member";
  try {
    const d = new Date(iso);
    return `Member since ${d.toLocaleDateString(undefined, { month: "long", year: "numeric" })}`;
  } catch { return "QR Guard Member"; }
}

// Generates a deterministic cover gradient from username using brand colors
function getCoverGradients(username: string, primary: string, accent: string): [string, string, string] {
  const h = username.split("").reduce((acc, c) => acc + c.charCodeAt(0), 0);
  const idx = h % 3;
  if (idx === 0) return [primary + "22", accent + "15", primary + "08"] as [string, string, string];
  if (idx === 1) return [accent + "20", primary + "12", accent + "06"] as [string, string, string];
  return [primary + "18", accent + "18", primary + "06"] as [string, string, string];
}

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width: screenWidth } = useWindowDimensions();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const { profile, loading, notFound, getGuardianRank } = usePublicProfile(username ?? "");
  const isOwnProfile = user?.id === profile?.userId;

  const [friendStatus, setFriendStatus] = useState<FriendStatus>("none");
  const [friendLoading, setFriendLoading] = useState(false);
  const [leaderboard, setLeaderboard] = useState<FriendLeaderboardEntry[]>([]);
  const [leaderboardLoading, setLeaderboardLoading] = useState(false);
  const [leaderboardLoaded, setLeaderboardLoaded] = useState(false);

  useEffect(() => {
    if (!user || !profile || isOwnProfile) return;
    getFriendStatus(user.id, profile.userId).then(setFriendStatus).catch(() => {});
  }, [user?.id, profile?.userId, isOwnProfile]);

  const loadLeaderboard = useCallback(async () => {
    if (!profile || leaderboardLoaded) return;
    const uid = isOwnProfile ? user?.id : profile.userId;
    if (!uid) return;
    setLeaderboardLoading(true);
    try {
      const data = await getFriendsLeaderboard(uid);
      setLeaderboard(data);
      setLeaderboardLoaded(true);
    } catch {}
    finally { setLeaderboardLoading(false); }
  }, [profile, isOwnProfile, user?.id, leaderboardLoaded]);

  useEffect(() => {
    if (!profile) return;
    if (isOwnProfile || friendStatus === "friends") {
      loadLeaderboard();
    }
  }, [profile, isOwnProfile, friendStatus]);

  async function handleShare() {
    try {
      await Share.share({ message: `Check out @${username}'s profile on QR Guard!` });
    } catch {}
  }

  async function handleFriendAction() {
    if (!user) { router.push("/(auth)/login"); return; }
    if (!profile) return;
    setFriendLoading(true);
    try {
      if (friendStatus === "none") {
        await sendFriendRequest(
          user.id, (user as any).username ?? "", user.displayName, null,
          profile.userId, profile.username, profile.displayName, profile.photoURL,
        );
        setFriendStatus("sent");
      } else if (friendStatus === "sent") {
        await cancelFriendRequest(user.id, profile.userId);
        setFriendStatus("none");
      } else if (friendStatus === "received") {
        await acceptFriendRequest(user.id, profile.userId);
        setFriendStatus("friends");
      } else if (friendStatus === "friends") {
        Alert.alert("Remove Friend", `Remove @${profile.username} from your friends?`, [
          { text: "Cancel", style: "cancel" },
          {
            text: "Remove", style: "destructive",
            onPress: async () => {
              await removeFriend(user.id, profile.userId);
              setFriendStatus("none");
            },
          },
        ]);
      }
    } catch {}
    setFriendLoading(false);
  }

  function getFriendBtnLabel() {
    if (friendStatus === "friends") return "Friends";
    if (friendStatus === "sent") return "Requested";
    if (friendStatus === "received") return "Accept Request";
    return "Add Friend";
  }

  function getFriendBtnIcon(): keyof typeof Ionicons.glyphMap {
    if (friendStatus === "friends") return "people";
    if (friendStatus === "sent") return "hourglass-outline";
    if (friendStatus === "received") return "checkmark-circle-outline";
    return "person-add-outline";
  }

  function getFriendBtnColor() {
    if (friendStatus === "friends") return colors.safe;
    if (friendStatus === "sent") return colors.textMuted;
    if (friendStatus === "received") return colors.accent;
    return colors.primary;
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

  // Private profile screen for non-owners
  if (profile.privacy.isPrivate && !isOwnProfile && friendStatus !== "friends") {
    const privInitials = profile.displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
    const firstName = profile.displayName.split(" ")[0];
    const coverCols = getCoverGradients(username ?? "", colors.primary, colors.accent);
    return (
      <View style={[S.container, { backgroundColor: colors.background }]}>
        {/* Floating nav */}
        <View style={[S.floatingNav, { top: topInset + 10 }]}>
          <Pressable onPress={safeBack} style={[S.navBtn, { backgroundColor: "rgba(0,0,0,0.45)", borderColor: "rgba(255,255,255,0.12)" }]}>
            <Ionicons name="chevron-back" size={22} color="#fff" />
          </Pressable>
          <Pressable onPress={handleShare} style={[S.navBtn, { backgroundColor: "rgba(0,0,0,0.45)", borderColor: "rgba(255,255,255,0.12)" }]}>
            <Ionicons name="share-outline" size={20} color="#fff" />
          </Pressable>
        </View>

        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: insets.bottom + 40 }}>
          {/* Hero cover */}
          <View style={[S.privateHero, { height: topInset + 220 }]}>
            <LinearGradient colors={coverCols} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            <LinearGradient colors={[colors.primary + "18", colors.accent + "0D", "transparent"]} style={StyleSheet.absoluteFill} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} />
            {/* Decorative dots */}
            <View style={[StyleSheet.absoluteFill]} pointerEvents="none">
              {Array.from({ length: 4 }).map((_, row) =>
                Array.from({ length: 6 }).map((_, col) => (
                  <View key={`${row}-${col}`} style={[S.heroDot, { top: row * 48 + topInset + 10, left: col * (screenWidth / 5), opacity: 0.05 + (((row + col) % 3) * 0.02) }]} />
                ))
              )}
            </View>
            <LinearGradient colors={["transparent", colors.background]} style={S.heroFade} start={{ x: 0, y: 0 }} end={{ x: 0, y: 1 }} />

            {/* Avatar centred in hero */}
            <View style={[S.privateHeroContent, { paddingTop: topInset + 52 }]}>
              <Animated.View entering={FadeIn.duration(400)} style={S.avatarZone}>
                <View style={[S.avatarGlowRing, { borderColor: colors.accent + "50" }]} />
                <LinearGradient colors={[colors.primary, colors.accent]} style={S.avatarRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <View style={[S.avatarInner, { backgroundColor: colors.background }]}>
                    {profile.photoURL
                      ? <Image source={{ uri: profile.photoURL }} style={S.avatarPhoto} />
                      : <Text style={[S.avatarInitials, { color: colors.primary }]}>{privInitials}</Text>
                    }
                  </View>
                </LinearGradient>
              </Animated.View>
            </View>
          </View>

          {/* Name + username */}
          <Animated.View entering={FadeInDown.duration(400).delay(80)} style={S.privateNameBlock}>
            <Text style={[S.displayName, { color: colors.text }]}>{profile.displayName}</Text>
            <Text style={[S.usernameText, { color: colors.primary }]}>@{profile.username}</Text>
          </Animated.View>

          {/* Branded private card */}
          <Animated.View entering={FadeInDown.duration(400).delay(160)} style={{ paddingHorizontal: 18 }}>
            <View style={[S.privateCard, { backgroundColor: colors.surface, borderColor: colors.accent + "40" }]}>

              {/* Lock icon row */}
              <View style={[S.privateCardIconWrap, { backgroundColor: colors.accentDim }]}>
                <Ionicons name="lock-closed" size={26} color={colors.accent} />
              </View>

              <Text style={[S.privateCardTitle, { color: colors.text }]}>
                {firstName} has made this account private
              </Text>
              <Text style={[S.privateCardSub, { color: colors.textSecondary }]}>
                Add {firstName} as a friend to see their full profile, QR codes, stats, and activity.
              </Text>

              {/* QR Guard branding strip */}
              <View style={[S.privateCardBrand, { borderTopColor: colors.accent + "25" }]}>
                <LinearGradient colors={[colors.primary, colors.accent]} style={S.privateCardBrandIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                  <Ionicons name="shield-checkmark" size={12} color="#fff" />
                </LinearGradient>
                <Text style={[S.privateCardBrandText, { color: colors.textMuted }]}>Protected by QR Guard</Text>
              </View>
            </View>
          </Animated.View>

          {/* Action buttons */}
          {user && (
            <Animated.View entering={FadeInDown.duration(400).delay(240)} style={S.privateActions}>
              <Pressable
                onPress={handleFriendAction}
                disabled={friendLoading}
                style={({ pressed }) => [
                  S.privateFriendBtn,
                  friendStatus === "sent"
                    ? { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, borderWidth: 1 }
                    : friendStatus === "received"
                    ? { backgroundColor: colors.accent }
                    : { backgroundColor: colors.primary },
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                {friendLoading
                  ? <ActivityIndicator size="small" color={friendStatus === "sent" ? colors.text : "#fff"} />
                  : <>
                      <Ionicons name={getFriendBtnIcon()} size={18} color={friendStatus === "sent" ? colors.text : "#fff"} />
                      <Text style={[S.privateFriendBtnText, { color: friendStatus === "sent" ? colors.text : "#fff" }]}>
                        {getFriendBtnLabel()}
                      </Text>
                    </>
                }
              </Pressable>
              {friendStatus === "sent" && (
                <Text style={[S.privateHintText, { color: colors.textMuted }]}>
                  Friend request sent — waiting for {firstName} to accept
                </Text>
              )}
            </Animated.View>
          )}
        </ScrollView>
      </View>
    );
  }

  const initials = profile.displayName
    .split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2);
  const rank = getGuardianRank(profile.stats);
  const coverColors = getCoverGradients(username ?? "", colors.primary, colors.accent);

  const STAT_ITEMS = [
    { label: "Codes",    value: profile.stats.qrCount,            gradient: [colors.primary, colors.primary + "AA"] as [string, string], icon: "qr-code-outline" as const, hidden: false },
    { label: "My Scans", value: profile.stats.personalScanCount,  gradient: [colors.accent, colors.accent + "AA"] as [string, string], icon: "scan-outline" as const, hidden: !profile.privacy.showScanActivity },
    { label: "Friends",  value: profile.stats.friendsCount,       gradient: [colors.safe, colors.safe + "AA"] as [string, string], icon: "people-outline" as const, hidden: !profile.privacy.showFriendsCount },
    { label: "Likes",    value: profile.stats.totalLikesReceived, gradient: [colors.warning, colors.warning + "AA"] as [string, string], icon: "heart-outline" as const, hidden: false },
  ].filter((s) => !s.hidden);

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
            colors={[colors.primary + "18", colors.accent + "0D", "transparent"]}
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
              <LinearGradient colors={[colors.primary, colors.accent]} style={S.avatarRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                <View style={[S.avatarInner, { backgroundColor: colors.background }]}>
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
                    <View style={[S.statIconWrap, { backgroundColor: s.gradient[0] + "18" }]}>
                      <Ionicons name={s.icon} size={12} color={s.gradient[0]} />
                    </View>
                    <Text style={[S.statValue, { color: colors.text }]}>{formatCompactNumber(s.value)}</Text>
                    <Text style={[S.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
                  </View>
                ))}
              </View>
            </Animated.View>
          )}

          {/* ══════════════ GUARDIAN PASSPORT ══════════════ */}
          <Animated.View entering={FadeInDown.duration(400).delay(160)}>
            <View style={[S.passport, { backgroundColor: colors.surface, borderColor: rank.color + "35" }]}>

              {/* Header row */}
              <View style={S.passportHeader}>
                <View style={[S.passportLogo, { backgroundColor: colors.primary }]}>
                  <MaterialCommunityIcons name="shield-check" size={16} color="#fff" />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[S.passportBrand, { color: colors.primary }]}>QR GUARD</Text>
                  <Text style={[S.passportType, { color: colors.textMuted }]}>Guardian Passport</Text>
                </View>
                <View style={[S.passportRankBadge, { backgroundColor: rank.color + "18", borderColor: rank.color + "55" }]}>
                  <Ionicons name={rank.icon as any} size={11} color={rank.color} />
                  <Text style={[S.passportRankText, { color: rank.color }]}>{rank.label.toUpperCase()}</Text>
                </View>
              </View>

              <View style={[S.passportDivider, { backgroundColor: rank.color + "22" }]} />

              {/* Identity row */}
              <View style={S.passportIdentity}>
                <View style={S.passportAvatar}>
                  {profile.photoURL ? (
                    <Image source={{ uri: profile.photoURL }} style={S.passportAvatarImg} />
                  ) : (
                    <View style={[S.passportAvatarGradient, { backgroundColor: colors.primary }]}>
                      <Text style={S.passportAvatarInitials}>{initials}</Text>
                    </View>
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
                  { label: "TOTAL SCANS", value: formatCompactNumber(profile.stats.totalScans), color: colors.safe },
                  { label: "LIKES", value: formatCompactNumber(profile.stats.totalLikesReceived), color: colors.accent },
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
            </View>
          </Animated.View>

          {/* ══════════════ FRIENDS LEADERBOARD ══════════════ */}
          {(isOwnProfile || friendStatus === "friends") && profile.privacy.showRanking && (
            <Animated.View entering={FadeInDown.duration(400).delay(240)}>
              <View style={[S.leaderboardCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <View style={S.leaderboardHeader}>
                  <View style={[S.leaderboardHeaderIcon, { backgroundColor: colors.warningDim }]}>
                    <Ionicons name="trophy" size={16} color={colors.warning} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={[S.leaderboardTitle, { color: colors.text }]}>Scan Competition</Text>
                    <Text style={[S.leaderboardSub, { color: colors.textMuted }]}>How you rank among friends</Text>
                  </View>
                  {leaderboardLoading && <ActivityIndicator size="small" color={colors.primary} />}
                </View>

                {leaderboard.slice(0, 5).map((entry, idx) => {
                  const initials = entry.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
                  const rankColors = ["#FFD700", "#C0C0C0", "#CD7F32"];
                  const rankColor = idx < 3 ? rankColors[idx] : colors.textMuted;
                  return (
                    <View key={entry.userId}>
                      {idx > 0 && <View style={[S.lbDivider, { backgroundColor: colors.surfaceBorder }]} />}
                      <Pressable
                        onPress={() => entry.username && !entry.isMe && router.push(`/profile/${entry.username}` as any)}
                        style={[S.lbRow, entry.isMe && { backgroundColor: colors.primaryDim + "50" }]}
                      >
                        <View style={[S.lbRankBadge, { borderColor: rankColor + (idx < 3 ? "60" : "30") }]}>
                          {idx < 3
                            ? <Ionicons name="trophy" size={10} color={rankColor} />
                            : <Text style={[S.lbRankNum, { color: rankColor }]}>{entry.rank}</Text>
                          }
                        </View>
                        <View style={[S.lbAvatar, { borderColor: rankColor + "40" }]}>
                          {entry.photoURL
                            ? <Image source={{ uri: entry.photoURL }} style={S.lbAvatarImg} />
                            : (
                              <View style={[S.lbAvatarGrad, { backgroundColor: entry.isMe ? colors.primary : colors.textMuted + "60" }]}>
                                <Text style={S.lbAvatarInitials}>{initials}</Text>
                              </View>
                            )
                          }
                        </View>
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
                            <Text style={[S.lbName, { color: colors.text }]} numberOfLines={1}>{entry.displayName}</Text>
                            {entry.isMe && (
                              <View style={[S.lbYouBadge, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}>
                                <Text style={[S.lbYouText, { color: colors.primary }]}>You</Text>
                              </View>
                            )}
                          </View>
                          <Text style={[S.lbUsername, { color: colors.primary }]}>@{entry.username}</Text>
                        </View>
                        <View style={{ alignItems: "center", gap: 1 }}>
                          <Text style={[S.lbCount, { color: rankColor }]}>{formatCompactNumber(entry.scanCount)}</Text>
                          <Text style={[S.lbCountLabel, { color: colors.textMuted }]}>scans</Text>
                        </View>
                      </Pressable>
                    </View>
                  );
                })}

                {leaderboard.length === 0 && !leaderboardLoading && (
                  <View style={S.lbEmpty}>
                    <Text style={[S.lbEmptyText, { color: colors.textMuted }]}>Add friends to see who's scanning the most!</Text>
                  </View>
                )}
              </View>
            </Animated.View>
          )}

          {/* ══════════════ OWN PROFILE CTA ══════════════ */}
          {isOwnProfile ? (
            <Animated.View entering={FadeInDown.duration(400).delay(280)} style={{ gap: 10 }}>
              <Pressable
                onPress={() => router.push("/privacy-settings" as any)}
                style={({ pressed }) => [S.ownCta, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40", opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={[S.ownCtaIcon, { backgroundColor: colors.primary }]}>
                  <Ionicons name="shield-checkmark-outline" size={16} color={colors.primaryText} />
                </View>
                <Text style={[S.ownCtaText, { color: colors.primary }]}>Manage Privacy & Settings</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.primary} />
              </Pressable>
              <Pressable
                onPress={() => router.push("/friends" as any)}
                style={({ pressed }) => [S.ownCta, { backgroundColor: colors.safeDim, borderColor: colors.safe + "40", opacity: pressed ? 0.85 : 1 }]}
              >
                <View style={[S.ownCtaIcon, { backgroundColor: colors.safe }]}>
                  <Ionicons name="people-outline" size={16} color="#fff" />
                </View>
                <Text style={[S.ownCtaText, { color: colors.safe }]}>My Friends</Text>
                <Ionicons name="chevron-forward" size={16} color={colors.safe} />
              </Pressable>
            </Animated.View>
          ) : user ? (
            <Animated.View entering={FadeInDown.duration(400).delay(280)} style={S.friendRow}>
              {friendStatus === "friends" ? (
                <View style={S.friendsBtnRow}>
                  <View style={[S.friendsStatusBadge, { backgroundColor: colors.safeDim, borderColor: colors.safe + "50" }]}>
                    <Ionicons name="people" size={15} color={colors.safe} />
                    <Text style={[S.friendsStatusText, { color: colors.safe }]}>Friends</Text>
                  </View>
                  <Pressable
                    onPress={handleFriendAction}
                    disabled={friendLoading}
                    style={({ pressed }) => [S.unfriendBtn, { backgroundColor: colors.surface, borderColor: colors.dangerDim ?? colors.textMuted + "40", opacity: pressed ? 0.8 : 1 }]}
                  >
                    {friendLoading
                      ? <ActivityIndicator size="small" color={colors.danger ?? colors.textMuted} />
                      : <>
                          <Ionicons name="person-remove-outline" size={14} color={colors.danger ?? colors.textMuted} />
                          <Text style={[S.unfriendBtnText, { color: colors.danger ?? colors.textMuted }]}>Unfriend</Text>
                        </>
                    }
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={handleFriendAction}
                  disabled={friendLoading}
                  style={({ pressed }) => [
                    S.friendBtn,
                    { backgroundColor: getFriendBtnColor() + (friendStatus === "sent" ? "18" : ""), borderColor: getFriendBtnColor() + "50", opacity: pressed ? 0.85 : 1 },
                    friendStatus !== "sent" && { backgroundColor: getFriendBtnColor() },
                  ]}
                >
                  {friendLoading
                    ? <ActivityIndicator size="small" color={friendStatus === "sent" ? getFriendBtnColor() : colors.primaryText} />
                    : <>
                        <Ionicons name={getFriendBtnIcon()} size={16} color={friendStatus === "sent" ? getFriendBtnColor() : colors.primaryText} />
                        <Text style={[S.friendBtnText, { color: friendStatus === "sent" ? getFriendBtnColor() : colors.primaryText }]}>
                          {getFriendBtnLabel()}
                        </Text>
                      </>
                  }
                </Pressable>
              )}
            </Animated.View>
          ) : null}

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

  // Leaderboard
  leaderboardCard: { borderRadius: 20, borderWidth: 1, marginBottom: 16, overflow: "hidden" },
  leaderboardHeader: { flexDirection: "row", alignItems: "center", gap: 12, padding: 16 },
  leaderboardHeaderIcon: { width: 38, height: 38, borderRadius: 12, alignItems: "center", justifyContent: "center" },
  leaderboardTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  leaderboardSub: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  lbDivider: { height: 1, marginHorizontal: 16 },
  lbRow: { flexDirection: "row", alignItems: "center", gap: 12, paddingHorizontal: 16, paddingVertical: 12 },
  lbRankBadge: {
    width: 26, height: 26, borderRadius: 8, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  lbRankNum: { fontSize: 11, fontFamily: "Inter_700Bold" },
  lbAvatar: { width: 40, height: 40, borderRadius: 13, overflow: "hidden", borderWidth: 1.5 },
  lbAvatarImg: { width: 40, height: 40 },
  lbAvatarGrad: { width: 40, height: 40, alignItems: "center", justifyContent: "center" },
  lbAvatarInitials: { fontSize: 14, fontFamily: "Inter_700Bold", color: "#fff" },
  lbName: { fontSize: 13, fontFamily: "Inter_700Bold", flexShrink: 1 },
  lbUsername: { fontSize: 11, fontFamily: "Inter_500Medium", marginTop: 1 },
  lbYouBadge: { paddingHorizontal: 6, paddingVertical: 1, borderRadius: 7, borderWidth: 1 },
  lbYouText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  lbCount: { fontSize: 15, fontFamily: "Inter_700Bold", textAlign: "center" },
  lbCountLabel: { fontSize: 9, fontFamily: "Inter_400Regular", textAlign: "center" },
  lbEmpty: { paddingHorizontal: 20, paddingVertical: 20, alignItems: "center" },
  lbEmptyText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },

  // Friend row (non-own profile)
  friendRow: { marginBottom: 20 },
  friendBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20,
    justifyContent: "center", borderWidth: 1,
  },
  friendBtnText: { fontSize: 15, fontFamily: "Inter_700Bold" },

  // Friends status + unfriend row
  friendsBtnRow: {
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  friendsStatusBadge: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, borderRadius: 16, paddingVertical: 14, paddingHorizontal: 20, borderWidth: 1,
  },
  friendsStatusText: { fontSize: 15, fontFamily: "Inter_700Bold" },
  unfriendBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 16, paddingVertical: 14, paddingHorizontal: 18,
    borderWidth: 1,
  },
  unfriendBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },

  // Private profile redesign
  privateHero: { overflow: "hidden", position: "relative" },
  privateHeroContent: { alignItems: "center" },
  privateNameBlock: { alignItems: "center", gap: 4, paddingTop: 16, paddingBottom: 20 },
  privateCard: {
    borderRadius: 24, padding: 24, borderWidth: 1,
    overflow: "hidden", alignItems: "center", gap: 12, position: "relative",
  },
  privateCardIconWrap: {
    width: 60, height: 60, borderRadius: 20,
    alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  privateCardTitle: {
    fontSize: 17, fontFamily: "Inter_700Bold", textAlign: "center", lineHeight: 24,
  },
  privateCardSub: {
    fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center",
    lineHeight: 21, maxWidth: 280,
  },
  privateCardBrand: {
    flexDirection: "row", alignItems: "center", gap: 8, paddingTop: 14,
    borderTopWidth: 1, width: "100%", justifyContent: "center", marginTop: 4,
  },
  privateCardBrandIcon: {
    width: 22, height: 22, borderRadius: 7, alignItems: "center", justifyContent: "center",
  },
  privateCardBrandText: { fontSize: 12, fontFamily: "Inter_500Medium" },
  privateActions: {
    paddingHorizontal: 18, paddingTop: 20, gap: 12, alignItems: "center",
  },
  privateFriendBtn: {
    flexDirection: "row", alignItems: "center", gap: 10,
    borderRadius: 16, paddingVertical: 15, paddingHorizontal: 28,
    justifyContent: "center", width: "100%",
  },
  privateFriendBtnText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  privateHintText: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
});
