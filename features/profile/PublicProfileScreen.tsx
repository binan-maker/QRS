import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  Image, Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/shared/utils/platform";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { usePublicProfile } from "@/features/profile/hooks/usePublicProfile";
import { formatCompactNumber } from "@/lib/number-format";
import {
  getFriendStatus,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  removeFriend,
  FriendStatus,
} from "@/services/friend-service";
import { publicStyles as S } from "@/features/profile/styles";

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)");
}

function formatJoinDate(iso: string | null): string {
  if (!iso) return "QR Guard Member";
  try {
    const d = new Date(iso);
    return `Member since ${d.toLocaleDateString(undefined, { month: "long", year: "numeric" })}`;
  } catch {
    return "QR Guard Member";
  }
}

function getFriendBtnLabel(friendStatus: FriendStatus): string {
  if (friendStatus === "friends") return "Friends";
  if (friendStatus === "sent") return "Request Sent";
  if (friendStatus === "received") return "Accept Request";
  return "Add Friend";
}

function getFriendBtnIcon(friendStatus: FriendStatus): keyof typeof Ionicons.glyphMap {
  if (friendStatus === "friends") return "people";
  if (friendStatus === "sent") return "hourglass-outline";
  if (friendStatus === "received") return "checkmark-circle-outline";
  return "person-add-outline";
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();

  const { profile, loading, notFound, getGuardianRank } = usePublicProfile(username ?? "");
  const isOwnProfile = user?.id === profile?.userId;

  const [friendStatus, setFriendStatus] = useState<FriendStatus>("none");
  const [friendLoading, setFriendLoading] = useState(false);

  useEffect(() => {
    if (!user || !profile || isOwnProfile) return;
    getFriendStatus(user.id, profile.userId).then(setFriendStatus).catch(() => {});
  }, [user?.id, profile?.userId, isOwnProfile]);

  const handleFriendAction = useCallback(async () => {
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
  }, [user, profile, friendStatus]);

  // ── Loading state ─────────────────────────────────────────────────────────

  if (loading) {
    return (
      <View style={[S.centered, { backgroundColor: colors.background, paddingTop: topInset }]}>
        <Pressable
          onPress={safeBack}
          style={[S.backBtn, { top: topInset + 10, left: 16, backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  // ── Not found state ───────────────────────────────────────────────────────

  if (notFound || !profile) {
    return (
      <View style={[S.centered, { backgroundColor: colors.background, paddingTop: topInset }]}>
        <Pressable
          onPress={safeBack}
          style={[S.backBtn, { top: topInset + 10, left: 16, backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Ionicons name="person-remove-outline" size={48} color={colors.textMuted} />
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

  // ── Private account state ─────────────────────────────────────────────────

  if (profile.privacy.isPrivate && !isOwnProfile && friendStatus !== "friends") {
    return (
      <View style={[S.container, { backgroundColor: colors.background, paddingTop: topInset }]}>
        <View style={[S.navBar, { borderBottomColor: colors.surfaceBorder }]}>
          <Pressable
            onPress={safeBack}
            style={[S.navBackBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[S.navTitle, { color: colors.text }]} numberOfLines={1}>@{username}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(180)} style={S.privateAvatar}>
            <View style={[S.avatarRing, { borderColor: colors.primary + "40" }]}>
              <View style={[S.avatarInner, { backgroundColor: colors.surfaceLight }]}>
                {profile.photoURL
                  ? <Image source={{ uri: profile.photoURL }} style={S.avatarPhoto} />
                  : <Text style={[S.avatarInitials, { color: colors.primary }]}>{initials}</Text>
                }
              </View>
            </View>
            <Text style={[S.displayName, { color: colors.text }]}>{profile.displayName}</Text>
            <Text style={[S.usernameText, { color: colors.primary }]}>@{profile.username}</Text>
          </Animated.View>

          <Animated.View entering={FadeInDown.duration(180)}>
            <View style={[S.privateCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <View style={[S.privateIconWrap, { backgroundColor: colors.accentDim }]}>
                <Ionicons name="lock-closed" size={22} color={colors.accent} />
              </View>
              <Text style={[S.privateTitle, { color: colors.text }]}>Private Account</Text>
              <Text style={[S.privateSub, { color: colors.textSecondary }]}>
                Add {profile.displayName.split(" ")[0]} as a friend to see their full profile and activity.
              </Text>
            </View>
          </Animated.View>

          {user && (
            <Animated.View entering={FadeInDown.duration(180)}>
              <Pressable
                onPress={handleFriendAction}
                disabled={friendLoading}
                style={({ pressed }) => [
                  S.friendBtn,
                  {
                    backgroundColor: friendStatus === "sent" ? colors.surface : colors.primary,
                    borderColor: friendStatus === "sent" ? colors.surfaceBorder : colors.primary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                {friendLoading
                  ? <ActivityIndicator size="small" color={friendStatus === "sent" ? colors.text : colors.primaryText} />
                  : (
                    <>
                      <Ionicons
                        name={getFriendBtnIcon(friendStatus)}
                        size={17}
                        color={friendStatus === "sent" ? colors.text : colors.primaryText}
                      />
                      <Text style={[S.friendBtnText, { color: friendStatus === "sent" ? colors.text : colors.primaryText }]}>
                        {getFriendBtnLabel(friendStatus)}
                      </Text>
                    </>
                  )
                }
              </Pressable>
            </Animated.View>
          )}
        </ScrollView>
      </View>
    );
  }

  // ── Full public profile ───────────────────────────────────────────────────

  const STAT_ITEMS = [
    { label: "QR Codes", value: profile.stats.qrCount, color: colors.primary },
    { label: "Scans", value: profile.stats.personalScanCount, color: colors.accent },
    { label: "Friends", value: profile.stats.friendsCount, color: colors.safe },
  ].filter((_, i) => {
    if (i === 1) return profile.privacy.showScanActivity !== false;
    if (i === 2) return profile.privacy.showFriendsCount !== false;
    return true;
  });

  return (
    <View style={[S.container, { backgroundColor: colors.background, paddingTop: topInset }]}>
      <View style={[S.navBar, { borderBottomColor: colors.surfaceBorder }]}>
        <Pressable
          onPress={safeBack}
          style={[S.navBackBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        >
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[S.navTitle, { color: colors.text }]} numberOfLines={1}>@{username}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[S.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* ── Avatar + Identity ── */}
        <Animated.View entering={FadeInDown.duration(180)} style={S.identityBlock}>
          <View style={[S.avatarRing, { borderColor: colors.primary + "40" }]}>
            <View style={[S.avatarInner, { backgroundColor: colors.surfaceLight }]}>
              {profile.photoURL
                ? <Image source={{ uri: profile.photoURL }} style={S.avatarPhoto} />
                : <Text style={[S.avatarInitials, { color: colors.primary }]}>{initials}</Text>
              }
            </View>
          </View>
          {isOwnProfile && (
            <View style={[S.ownBadge, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}>
              <Text style={[S.ownBadgeText, { color: colors.primary }]}>Your Profile</Text>
            </View>
          )}
          <Text style={[S.displayName, { color: colors.text }]}>{profile.displayName}</Text>
          <Text style={[S.usernameText, { color: colors.primary }]}>@{profile.username}</Text>
          {profile.bio ? (
            <Text style={[S.bio, { color: colors.textSecondary }]}>{profile.bio}</Text>
          ) : null}
          <Text style={[S.joinDate, { color: colors.textMuted }]}>{formatJoinDate(profile.joinedAt)}</Text>
        </Animated.View>

        {/* ── Stats ── */}
        {profile.privacy.showStats !== false && STAT_ITEMS.length > 0 && (
          <Animated.View entering={FadeInDown.duration(180)} style={S.statsRow}>
            {STAT_ITEMS.map((s, i) => (
              <View key={i} style={[S.statItem, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <Text style={[S.statValue, { color: s.color }]}>{formatCompactNumber(s.value)}</Text>
                <Text style={[S.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* ── Friend action (non-own profiles only) ── */}
        {!isOwnProfile && user && (
          <Animated.View entering={FadeInDown.duration(180)}>
            {friendStatus === "friends" ? (
              <View style={S.friendedRow}>
                <View style={[S.friendedBadge, { backgroundColor: colors.safeDim, borderColor: colors.safe + "40" }]}>
                  <Ionicons name="people" size={15} color={colors.safe} />
                  <Text style={[S.friendedText, { color: colors.safe }]}>Friends</Text>
                </View>
                <Pressable
                  onPress={handleFriendAction}
                  disabled={friendLoading}
                  style={({ pressed }) => [
                    S.unfriendBtn,
                    { borderColor: colors.surfaceBorder, backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 },
                  ]}
                >
                  {friendLoading
                    ? <ActivityIndicator size="small" color={colors.danger} />
                    : (
                      <>
                        <Ionicons name="person-remove-outline" size={14} color={colors.danger} />
                        <Text style={[S.unfriendText, { color: colors.danger }]}>Unfriend</Text>
                      </>
                    )
                  }
                </Pressable>
              </View>
            ) : (
              <Pressable
                onPress={handleFriendAction}
                disabled={friendLoading}
                style={({ pressed }) => [
                  S.friendBtn,
                  {
                    backgroundColor: friendStatus === "sent" ? colors.surface : colors.primary,
                    borderColor: friendStatus === "sent" ? colors.surfaceBorder : colors.primary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                {friendLoading
                  ? <ActivityIndicator size="small" color={friendStatus === "sent" ? colors.text : colors.primaryText} />
                  : (
                    <>
                      <Ionicons
                        name={getFriendBtnIcon(friendStatus)}
                        size={17}
                        color={friendStatus === "sent" ? colors.text : colors.primaryText}
                      />
                      <Text style={[S.friendBtnText, { color: friendStatus === "sent" ? colors.text : colors.primaryText }]}>
                        {getFriendBtnLabel(friendStatus)}
                      </Text>
                    </>
                  )
                }
              </Pressable>
            )}
            {friendStatus === "sent" && (
              <Text style={[S.sentHint, { color: colors.textMuted }]}>
                Friend request sent — waiting for {profile.displayName.split(" ")[0]} to accept
              </Text>
            )}
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
