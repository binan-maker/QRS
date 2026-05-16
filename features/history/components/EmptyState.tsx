import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import HistoryItemSkeleton from "@/features/history/components/HistoryItemSkeleton";
import { SKELETON_COUNT } from "@/features/history/utils/constants";
import type { Filter } from "@/features/history/types";

interface Props {
  user:         any;
  cloudLoading: boolean;
  searchQuery:  string;
  filter:       Filter;
  colors:       any;
  fontSize:     (n: number) => number;
}

const EmptyState = React.memo(function EmptyState({
  user,
  cloudLoading,
  searchQuery,
  filter,
  colors,
  fontSize,
}: Props) {
  // ── Unauthenticated ─────────────────────────────────────────────────────────
  if (!user) {
    return (
      <View style={styles.wrap}>
        <LinearGradient
          colors={[colors.primary + "20", colors.primary + "08"]}
          style={styles.iconWrap}
        >
          <Ionicons name="person-outline" size={32} color={colors.primary} />
        </LinearGradient>
        <Text style={[styles.title, { color: colors.text, fontSize: fontSize(18) }]}>
          Sign in to view history
        </Text>
        <Text style={[styles.sub, { color: colors.textSecondary, fontSize: fontSize(13) }]}>
          Your scan history is saved to your account and synced across all your devices.
        </Text>
        <Pressable
          onPress={() => router.push("/(auth)/login")}
          style={({ pressed }) => [
            styles.signInBtn,
            {
              backgroundColor: colors.primary,
              opacity:         pressed ? 0.85 : 1,
              transform:       [{ scale: pressed ? 0.97 : 1 }],
            },
          ]}
        >
          <Ionicons name="log-in-outline" size={17} color="#fff" />
          <Text style={[styles.signInText, { fontSize: fontSize(14) }]}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  // ── Cloud loading skeleton ───────────────────────────────────────────────────
  if (cloudLoading) {
    return (
      <View style={{ paddingTop: 4 }}>
        {Array.from({ length: SKELETON_COUNT }).map((_, i) => (
          <HistoryItemSkeleton key={i} />
        ))}
      </View>
    );
  }

  // ── No search results ────────────────────────────────────────────────────────
  if (searchQuery.trim()) {
    return (
      <View style={styles.wrap}>
        <LinearGradient
          colors={[colors.surfaceBorder + "80", colors.surfaceBorder + "30"]}
          style={styles.iconWrap}
        >
          <Ionicons name="search-outline" size={32} color={colors.textMuted} />
        </LinearGradient>
        <Text style={[styles.title, { color: colors.textSecondary, fontSize: fontSize(17) }]}>
          No results for "{searchQuery}"
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted, fontSize: fontSize(13) }]}>
          Try searching by URL, payment name, or QR content
        </Text>
      </View>
    );
  }

  // ── Filter empty ─────────────────────────────────────────────────────────────
  const isFavorites  = filter === "favorites";
  const emptyIcon: React.ComponentProps<typeof Ionicons>["name"] =
    isFavorites ? "heart-outline" : "time-outline";
  const emptyTitle   = isFavorites ? "No favorites yet" : "No scans yet";
  const emptySub     = isFavorites
    ? "Tap the heart on a QR detail to save it here"
    : "Scanned QR codes will appear here";

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[colors.surfaceBorder + "80", colors.surfaceBorder + "30"]}
        style={styles.iconWrap}
      >
        <Ionicons name={emptyIcon} size={32} color={colors.textMuted} />
      </LinearGradient>
      <Text style={[styles.title, { color: colors.textSecondary, fontSize: fontSize(17) }]}>
        {emptyTitle}
      </Text>
      <Text style={[styles.sub, { color: colors.textMuted, fontSize: fontSize(13) }]}>
        {emptySub}
      </Text>
    </View>
  );
});

export default EmptyState;

const styles = StyleSheet.create({
  wrap: {
    alignItems:      "center",
    gap:             10,
    paddingVertical: 60,
    paddingHorizontal: 36,
  },
  iconWrap: {
    width:         80,
    height:        80,
    borderRadius:  24,
    alignItems:    "center",
    justifyContent: "center",
    marginBottom:  8,
  },
  title: {
    fontFamily:   "Inter_700Bold",
    textAlign:    "center",
    letterSpacing: -0.3,
  },
  sub: {
    fontFamily: "Inter_400Regular",
    textAlign:  "center",
    lineHeight: 20,
  },
  signInBtn: {
    flexDirection:   "row",
    alignItems:      "center",
    gap:             8,
    marginTop:       10,
    paddingHorizontal: 28,
    paddingVertical: 13,
    borderRadius:    14,
  },
  signInText: {
    fontFamily:   "Inter_700Bold",
    color:        "#fff",
    letterSpacing: 0.2,
  },
});
