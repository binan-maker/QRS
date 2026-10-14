import React, { memo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { router } from "expo-router";
import HistoryItemSkeleton from "@/features/history/components/HistoryItemSkeleton";
import { useTheme } from "@/shared/contexts/ThemeContext";

// Static indices array — avoids Array.from() allocation on every render.
const SKELETON_INDICES = [0, 1, 2, 3, 4, 5, 6, 7] as const;

interface Props {
  user:         any;
  cloudLoading: boolean;
  searchQuery:  string;
}

const EmptyState = memo(function EmptyState({
  user,
  cloudLoading,
  searchQuery,
}: Props) {
  const { colors } = useTheme();

  if (!user) {
    return (
      <View style={styles.wrap}>
        <LinearGradient
          colors={[colors.primary + "20", colors.primary + "08"]}
          style={styles.iconWrap}
        >
          <Ionicons name="person-outline" size={32} color={colors.primary} />
        </LinearGradient>
        <Text style={[styles.title, { color: colors.text }]}>
          Sign in to view history
        </Text>
        <Text style={[styles.sub, { color: colors.textSecondary }]}>
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
          <Text style={styles.signInText}>Sign In</Text>
        </Pressable>
      </View>
    );
  }

  if (cloudLoading) {
    return (
      <View style={{ paddingTop: 4 }}>
        {SKELETON_INDICES.map((i) => (
          <HistoryItemSkeleton key={i} index={i} />
        ))}
      </View>
    );
  }

  if (searchQuery.trim()) {
    return (
      <View style={styles.wrap}>
        <LinearGradient
          colors={[colors.surfaceBorder + "80", colors.surfaceBorder + "30"]}
          style={styles.iconWrap}
        >
          <Ionicons name="search-outline" size={32} color={colors.textMuted} />
        </LinearGradient>
        <Text style={[styles.title, { color: colors.textSecondary }]}>
          No results for "{searchQuery}"
        </Text>
        <Text style={[styles.sub, { color: colors.textMuted }]}>
          Try searching by domain, name, or QR content
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.wrap}>
      <LinearGradient
        colors={[colors.surfaceBorder + "80", colors.surfaceBorder + "30"]}
        style={styles.iconWrap}
      >
        <Ionicons name="time-outline" size={32} color={colors.textMuted} />
      </LinearGradient>
      <Text style={[styles.title, { color: colors.textSecondary }]}>
        No scans yet
      </Text>
      <Text style={[styles.sub, { color: colors.textMuted }]}>
        Scanned QR codes will appear here
      </Text>
    </View>
  );
});

export default EmptyState;

const styles = StyleSheet.create({
  wrap: {
    alignItems:        "center",
    gap:               10,
    paddingVertical:   60,
    paddingHorizontal: 36,
  },
  iconWrap: {
    width:          80,
    height:         80,
    borderRadius:   24,
    alignItems:     "center",
    justifyContent: "center",
    marginBottom:   8,
  },
  title: {
    fontFamily:    "Inter_700Bold",
    fontSize:      17,
    textAlign:     "center",
    letterSpacing: -0.3,
  },
  sub: {
    fontFamily: "Inter_400Regular",
    fontSize:   13,
    textAlign:  "center",
    lineHeight: 20,
  },
  signInBtn: {
    flexDirection:     "row",
    alignItems:        "center",
    gap:               8,
    marginTop:         10,
    paddingHorizontal: 28,
    paddingVertical:   13,
    borderRadius:      14,
  },
  signInText: {
    fontFamily:    "Inter_700Bold",
    fontSize:      14,
    color:         "#fff",
    letterSpacing: 0.2,
  },
});
