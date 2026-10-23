import React, { memo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";

export const HomeRewardsBanner = memo(function HomeRewardsBanner() {
  const { colors, isDark } = useTheme();

  return (
    <Pressable
      onPress={() => {
        Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
        router.push("/(tabs)/rewards");
      }}
      style={({ pressed }) => [
        styles.banner,
        {
          backgroundColor: colors.surface,
          borderColor: colors.surfaceBorder,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
      accessibilityRole="button"
      accessibilityLabel="Open Scratch Cards & Rewards"
    >
      <View
        style={[
          styles.iconWrap,
          {
            backgroundColor: isDark ? colors.primary + "20" : colors.primary + "12",
          },
        ]}
      >
        <Ionicons name="gift-outline" size={20} color={colors.primary} />
      </View>

      <View style={styles.textCol}>
        <View style={styles.titleRow}>
          <Text style={[styles.title, { color: colors.text }]}>
            Scratch Cards & Rewards
          </Text>
          <View style={[styles.badge, { backgroundColor: isDark ? "#1E3A8A" : "#DBEAFE" }]}>
            <Text style={[styles.badgeText, { color: colors.primary }]}>NEW</Text>
          </View>
        </View>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Scan eligible QR codes to unlock exclusive coupons
        </Text>
      </View>

      <Ionicons name="chevron-forward" size={18} color={colors.textMuted} />
    </Pressable>
  );
});

const styles = StyleSheet.create({
  banner: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginVertical: 10,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 2,
  },
  title: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  badge: {
    paddingHorizontal: 5,
    paddingVertical: 1,
    borderRadius: 6,
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 9,
    letterSpacing: 0.5,
  },
  subtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
});
