import React from "react";
import {
  View,
  Text,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Pressable,
} from "react-native";
import { Image } from "expo-image";
import { useLocalSearchParams, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { usePublicProfile } from "@/features/profile/hooks/usePublicProfile";
import { formatCompactNumber } from "@/shared/utils/formatters";

export default function PublicProfileScreen() {
  const { username } = useLocalSearchParams<{ username: string }>();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { profile, loading, notFound } = usePublicProfile(username ?? "");

  function handleBack() {
    if (router.canGoBack()) router.back();
    else router.replace("/(tabs)");
  }

  if (loading) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator color={colors.primary} size="large" />
      </View>
    );
  }

  if (notFound || !profile) {
    return (
      <View style={[styles.centered, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <Pressable onPress={handleBack} style={[styles.backBtn, { top: insets.top + 8 }]}>
          <Ionicons name="chevron-back" size={22} color={colors.text} />
        </Pressable>
        <Ionicons name="person-outline" size={48} color={colors.textMuted} />
        <Text style={[styles.notFoundTitle, { color: colors.text }]}>User not found</Text>
        <Text style={[styles.notFoundSub, { color: colors.textMuted }]}>
          @{username} doesn't exist or may have been removed.
        </Text>
      </View>
    );
  }

  const initials = profile.displayName
    .split(" ")
    .map((w) => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const showStats = profile.privacy.showStats;

  const stats = [
    { label: "QR Codes", value: profile.stats.qrCount },
    { label: "Scans", value: profile.stats.totalScans },
    { label: "Safe reports", value: profile.stats.safeReportsGiven },
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Back button */}
      <Pressable
        onPress={handleBack}
        style={[styles.backBtn, { top: insets.top + 8, backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
        hitSlop={8}
      >
        <Ionicons name="chevron-back" size={20} color={colors.text} />
      </Pressable>

      <ScrollView
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 56, paddingBottom: insets.bottom + 32 }]}
        showsVerticalScrollIndicator={false}
      >
        {/* Avatar */}
        <View style={styles.avatarSection}>
          <View style={[styles.avatarRing, { borderColor: colors.primary + "40" }]}>
            <View style={[styles.avatarInner, { backgroundColor: colors.surfaceLight }]}>
              {profile.photoURL ? (
                <Image
                  source={{ uri: profile.photoURL }}
                  style={styles.avatarPhoto}
                  cachePolicy="memory-disk"
                  contentFit="cover"
                />
              ) : (
                <Text style={[styles.avatarInitials, { color: colors.primary }]}>{initials}</Text>
              )}
            </View>
          </View>

          <Text style={[styles.displayName, { color: colors.text }]} numberOfLines={1}>
            {profile.displayName}
          </Text>
          <Text style={[styles.username, { color: colors.primary }]}>@{profile.username}</Text>

          {profile.joinedAt && (
            <Text style={[styles.joined, { color: colors.textMuted }]}>
              Joined {new Date(profile.joinedAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
            </Text>
          )}
        </View>

        {/* Stats */}
        {showStats && (
          <View style={[styles.statsRow, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            {stats.map((s, i) => (
              <React.Fragment key={s.label}>
                {i > 0 && <View style={[styles.statDivider, { backgroundColor: colors.surfaceBorder }]} />}
                <View style={styles.statCell}>
                  <Text style={[styles.statValue, { color: colors.primary }]}>
                    {formatCompactNumber(s.value)}
                  </Text>
                  <Text style={[styles.statLabel, { color: colors.textMuted }]}>{s.label}</Text>
                </View>
              </React.Fragment>
            ))}
          </View>
        )}

        {profile.privacy.isPrivate && (
          <View style={[styles.privateBanner, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <Ionicons name="lock-closed-outline" size={16} color={colors.textMuted} />
            <Text style={[styles.privateText, { color: colors.textMuted }]}>This profile is private</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { flex: 1, alignItems: "center", justifyContent: "center", gap: 12, paddingHorizontal: 32 },
  scroll: { paddingHorizontal: 20 },
  backBtn: {
    position: "absolute",
    left: 16,
    zIndex: 10,
    width: 36,
    height: 36,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  avatarSection: { alignItems: "center", gap: 6, marginBottom: 24 },
  avatarRing: {
    width: 96, height: 96,
    borderRadius: 48, borderWidth: 2.5,
    padding: 3,
  },
  avatarInner: {
    flex: 1, borderRadius: 45,
    alignItems: "center", justifyContent: "center",
  },
  avatarPhoto: { width: "100%", height: "100%", borderRadius: 45 },
  avatarInitials: { fontSize: 30, fontFamily: "Inter_700Bold" },
  displayName: { fontSize: 22, fontFamily: "Inter_700Bold", letterSpacing: -0.4, marginTop: 8 },
  username: { fontSize: 14, fontFamily: "Inter_500Medium" },
  joined: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  statsRow: {
    flexDirection: "row",
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 16,
  },
  statCell: { flex: 1, alignItems: "center", paddingVertical: 16, gap: 3 },
  statDivider: { width: 1 },
  statValue: { fontSize: 18, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular" },
  privateBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    padding: 14, borderRadius: 12, borderWidth: 1,
  },
  privateText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  notFoundTitle: { fontSize: 20, fontFamily: "Inter_700Bold", textAlign: "center" },
  notFoundSub: { fontSize: 14, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 20 },
});
