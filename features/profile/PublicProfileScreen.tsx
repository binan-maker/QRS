import { useCallback, useMemo } from "react";
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  Image,
} from "react-native";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/shared/utils/platform";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import { usePublicProfile } from "@/features/profile/hooks/usePublicProfile";
import { formatCompactNumber } from "@/shared/utils/number-format";
import { publicStyles as S } from "@/features/profile/styles";

// ── Helpers ──────────────────────────────────────────────────────────────────

function safeBack() {
  if (router.canGoBack()) router.back();
  else router.replace("/(tabs)");
}

function formatJoinDate(iso: string | null): string {
  if (!iso) return "BinRo Member";
  try {
    const d = new Date(iso);
    return `Member since ${d.toLocaleDateString(undefined, { month: "long", year: "numeric" })}`;
  } catch {
    return "BinRo Member";
  }
}

// ── Screen ───────────────────────────────────────────────────────────────────

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();

  const { profile, loading, notFound } = usePublicProfile(username ?? "");
  const isOwnProfile = user?.id === profile?.userId;

  // Friend feature is deprecated — action navigates unauthenticated users to login
  const handleFriendAction = useCallback(() => {
    if (!user) router.push("/(auth)/login");
  }, [user]);

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

  if (profile.privacy.isPrivate && !isOwnProfile) {
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
                style={({ pressed }) => [
                  S.friendBtn,
                  { backgroundColor: colors.primary, borderColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Ionicons name="person-add-outline" size={17} color={colors.primaryText} />
                <Text style={[S.friendBtnText, { color: colors.primaryText }]}>Add Friend</Text>
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

        {/* ── Add Friend (non-own profiles, logged-in users only) ── */}
        {!isOwnProfile && user && (
          <Animated.View entering={FadeInDown.duration(180)}>
            <Pressable
              onPress={handleFriendAction}
              style={({ pressed }) => [
                S.friendBtn,
                { backgroundColor: colors.primary, borderColor: colors.primary, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Ionicons name="person-add-outline" size={17} color={colors.primaryText} />
              <Text style={[S.friendBtnText, { color: colors.primaryText }]}>Add Friend</Text>
            </Pressable>
          </Animated.View>
        )}
      </ScrollView>
    </View>
  );
}
