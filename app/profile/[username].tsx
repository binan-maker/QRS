import React, { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  StyleSheet, Image, Platform, Alert,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
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

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const { profile, loading, notFound, getGuardianRank } = usePublicProfile(username ?? "");
  const isOwnProfile = user?.id === profile?.userId;

  const [friendStatus, setFriendStatus] = useState<FriendStatus>("none");
  const [friendLoading, setFriendLoading] = useState(false);

  useEffect(() => {
    if (!user || !profile || isOwnProfile) return;
    getFriendStatus(user.id, profile.userId).then(setFriendStatus).catch(() => {});
  }, [user?.id, profile?.userId, isOwnProfile]);

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
    if (friendStatus === "sent") return "Request Sent";
    if (friendStatus === "received") return "Accept Request";
    return "Add Friend";
  }

  function getFriendBtnIcon(): keyof typeof Ionicons.glyphMap {
    if (friendStatus === "friends") return "people";
    if (friendStatus === "sent") return "hourglass-outline";
    if (friendStatus === "received") return "checkmark-circle-outline";
    return "person-add-outline";
  }

  if (loading) {
    return (
      <View style={[S.centered, { backgroundColor: colors.background, paddingTop: topInset }]}>
        <Pressable onPress={safeBack} style={[S.backBtn, { top: topInset + 10, left: 16, backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (notFound || !profile) {
    return (
      <View style={[S.centered, { backgroundColor: colors.background, paddingTop: topInset }]}>
        <Pressable onPress={safeBack} style={[S.backBtn, { top: topInset + 10, left: 16, backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
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

  // Private profile for non-friends
  if (profile.privacy.isPrivate && !isOwnProfile && friendStatus !== "friends") {
    return (
      <View style={[S.container, { backgroundColor: colors.background, paddingTop: topInset }]}>
        <View style={[S.navBar, { borderBottomColor: colors.surfaceBorder }]}>
          <Pressable onPress={safeBack} style={[S.navBackBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <Text style={[S.navTitle, { color: colors.text }]} numberOfLines={1}>@{username}</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView contentContainerStyle={{ padding: 24, gap: 20 }} showsVerticalScrollIndicator={false}>
          <Animated.View entering={FadeInDown.duration(400)} style={S.privateAvatar}>
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

          <Animated.View entering={FadeInDown.duration(400).delay(80)}>
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
            <Animated.View entering={FadeInDown.duration(400).delay(140)}>
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
                  : <>
                      <Ionicons name={getFriendBtnIcon()} size={17} color={friendStatus === "sent" ? colors.text : colors.primaryText} />
                      <Text style={[S.friendBtnText, { color: friendStatus === "sent" ? colors.text : colors.primaryText }]}>
                        {getFriendBtnLabel()}
                      </Text>
                    </>
                }
              </Pressable>
            </Animated.View>
          )}
        </ScrollView>
      </View>
    );
  }

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
        <Pressable onPress={safeBack} style={[S.navBackBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Text style={[S.navTitle, { color: colors.text }]} numberOfLines={1}>@{username}</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[S.scrollContent, { paddingBottom: insets.bottom + 40 }]}
      >
        {/* Avatar + Identity */}
        <Animated.View entering={FadeInDown.duration(400)} style={S.identityBlock}>
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

        {/* Stats */}
        {profile.privacy.showStats !== false && STAT_ITEMS.length > 0 && (
          <Animated.View entering={FadeInDown.duration(400).delay(60)} style={S.statsRow}>
            {STAT_ITEMS.map((s, i) => (
              <View key={i} style={[S.statItem, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <Text style={[S.statValue, { color: s.color }]}>{formatCompactNumber(s.value)}</Text>
                <Text style={[S.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
              </View>
            ))}
          </Animated.View>
        )}

        {/* Friend action (non-own profiles) */}
        {!isOwnProfile && user && (
          <Animated.View entering={FadeInDown.duration(400).delay(100)}>
            {friendStatus === "friends" ? (
              <View style={S.friendedRow}>
                <View style={[S.friendedBadge, { backgroundColor: colors.safeDim, borderColor: colors.safe + "40" }]}>
                  <Ionicons name="people" size={15} color={colors.safe} />
                  <Text style={[S.friendedText, { color: colors.safe }]}>Friends</Text>
                </View>
                <Pressable
                  onPress={handleFriendAction}
                  disabled={friendLoading}
                  style={({ pressed }) => [S.unfriendBtn, { borderColor: colors.surfaceBorder, backgroundColor: colors.surface, opacity: pressed ? 0.8 : 1 }]}
                >
                  {friendLoading
                    ? <ActivityIndicator size="small" color={colors.danger} />
                    : <>
                        <Ionicons name="person-remove-outline" size={14} color={colors.danger} />
                        <Text style={[S.unfriendText, { color: colors.danger }]}>Unfriend</Text>
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
                  {
                    backgroundColor: friendStatus === "sent" ? colors.surface : colors.primary,
                    borderColor: friendStatus === "sent" ? colors.surfaceBorder : colors.primary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                {friendLoading
                  ? <ActivityIndicator size="small" color={friendStatus === "sent" ? colors.text : colors.primaryText} />
                  : <>
                      <Ionicons name={getFriendBtnIcon()} size={17} color={friendStatus === "sent" ? colors.text : colors.primaryText} />
                      <Text style={[S.friendBtnText, { color: friendStatus === "sent" ? colors.text : colors.primaryText }]}>
                        {getFriendBtnLabel()}
                      </Text>
                    </>
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

const S = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 14 },

  backBtn: {
    position: "absolute", width: 40, height: 40,
    borderRadius: 13, alignItems: "center", justifyContent: "center", borderWidth: 1, zIndex: 10,
  },
  notFoundTitle: { fontSize: 20, fontFamily: "Inter_700Bold", marginTop: 10 },
  notFoundSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20, maxWidth: 260 },
  notFoundBtn: { paddingHorizontal: 28, paddingVertical: 12, borderRadius: 14, marginTop: 8 },
  notFoundBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },

  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1,
  },
  navBackBtn: {
    width: 38, height: 38, borderRadius: 12,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  navTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "center", marginHorizontal: 8 },

  scrollContent: { paddingHorizontal: 20, paddingTop: 28, gap: 20 },

  identityBlock: { alignItems: "center", gap: 5 },
  privateAvatar: { alignItems: "center", gap: 6 },

  avatarRing: {
    width: 86, height: 86, borderRadius: 43, borderWidth: 2,
    padding: 3, alignItems: "center", justifyContent: "center", marginBottom: 4,
  },
  avatarInner: {
    width: 78, height: 78, borderRadius: 39,
    alignItems: "center", justifyContent: "center", overflow: "hidden",
  },
  avatarPhoto: { width: 78, height: 78, borderRadius: 39 },
  avatarInitials: { fontSize: 28, fontFamily: "Inter_700Bold" },

  ownBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100, borderWidth: 1, marginBottom: 2 },
  ownBadgeText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },

  displayName: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  usernameText: { fontSize: 13, fontFamily: "Inter_500Medium" },
  bio: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19, maxWidth: 280, marginTop: 4 },
  joinDate: { fontSize: 11, fontFamily: "Inter_400Regular", marginTop: 2 },

  statsRow: { flexDirection: "row", gap: 8 },
  statItem: {
    flex: 1, borderRadius: 14, padding: 14, alignItems: "center",
    gap: 3, borderWidth: 1,
  },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },

  friendBtn: {
    flexDirection: "row", alignItems: "center", gap: 9,
    borderRadius: 14, paddingVertical: 13, paddingHorizontal: 20,
    justifyContent: "center", borderWidth: 1,
  },
  friendBtnText: { fontSize: 14, fontFamily: "Inter_700Bold" },

  friendedRow: { flexDirection: "row", gap: 10 },
  friendedBadge: {
    flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 7, borderRadius: 14, paddingVertical: 13, borderWidth: 1,
  },
  friendedText: { fontSize: 14, fontFamily: "Inter_700Bold" },
  unfriendBtn: {
    flexDirection: "row", alignItems: "center", gap: 6,
    borderRadius: 14, paddingVertical: 13, paddingHorizontal: 16, borderWidth: 1,
  },
  unfriendText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },

  sentHint: { fontSize: 12, fontFamily: "Inter_400Regular", textAlign: "center", marginTop: 8 },

  privateCard: {
    borderRadius: 18, padding: 22, borderWidth: 1,
    alignItems: "center", gap: 10,
  },
  privateIconWrap: { width: 52, height: 52, borderRadius: 16, alignItems: "center", justifyContent: "center" },
  privateTitle: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" },
  privateSub: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19, maxWidth: 270 },
});
