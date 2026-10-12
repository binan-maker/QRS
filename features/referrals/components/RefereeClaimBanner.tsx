import React, { memo } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { styles } from "../styles";

interface RefereeClaimBannerProps {
  onPress: () => void;
}

export const RefereeClaimBanner = memo(function RefereeClaimBanner({ onPress }: RefereeClaimBannerProps) {
  const { colors } = useTheme();

  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.haveCodeCard,
        {
          backgroundColor: colors.surface,
          borderColor: colors.surfaceBorder,
          opacity: pressed ? 0.9 : 1,
        },
      ]}
    >
      <View style={[styles.haveCodeIconWrap, { backgroundColor: `${colors.primary}14` }]}>
        <Ionicons name="gift-outline" size={20} color={colors.primary} />
      </View>
      <View style={styles.haveCodeContent}>
        <Text style={[styles.haveCodeTitle, { color: colors.text }]}>
          Have a friend&apos;s code?
        </Text>
        <Text style={[styles.haveCodeSubtitle, { color: colors.textSecondary }]}>
          Enter before your 1st scan to link accounts
        </Text>
      </View>
      <View style={[styles.haveCodeArrowWrap, { backgroundColor: colors.surfaceLight }]}>
        <Ionicons name="chevron-forward" size={15} color={colors.primary} />
      </View>
    </Pressable>
  );
});
