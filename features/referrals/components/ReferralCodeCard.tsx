import React, { memo } from "react";
import { View, Text, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { styles } from "../styles";

interface ReferralCodeCardProps {
  inviteCode: string;
  displaySignupLink: string;
  codeCopied: boolean;
  linkCopied: boolean;
  onCopyCode: () => void;
  onCopyLink: () => void;
  onShare: () => void;
}

export const ReferralCodeCard = memo(function ReferralCodeCard({
  inviteCode,
  displaySignupLink,
  codeCopied,
  linkCopied,
  onCopyCode,
  onCopyLink,
  onShare,
}: ReferralCodeCardProps) {
  const { colors, isDark } = useTheme();

  return (
    <View
      style={[
        styles.vipCodeCard,
        { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
      ]}
    >
      <View style={styles.codeHeaderRow}>
        <View style={styles.codeLabelWrap}>
          <Ionicons name="sparkles" size={13} color={colors.primary} />
          <Text style={[styles.codeLabel, { color: colors.textMuted }]}>
            YOUR REFERRAL CODE
          </Text>
        </View>
        <View style={[styles.codeActiveBadge, { backgroundColor: `${colors.primary}14` }]}>
          <Text style={[styles.codeActiveText, { color: colors.primary }]}>ACTIVE</Text>
        </View>
      </View>

      <View
        style={[
          styles.codeBox,
          {
            backgroundColor: colors.inputBackground || colors.surfaceLight,
            borderColor: colors.surfaceBorder,
          },
        ]}
      >
        <Text style={[styles.codeText, { color: colors.primary }]}>
          {inviteCode.toUpperCase()}
        </Text>
        <Pressable
          onPress={onCopyCode}
          style={({ pressed }) => [
            styles.copyActionBtn,
            { backgroundColor: codeCopied ? "#10B981" : colors.primary, opacity: pressed ? 0.88 : 1 },
          ]}
        >
          <Ionicons name={codeCopied ? "checkmark" : "copy-outline"} size={15} color="#FFFFFF" />
          <Text style={styles.copyActionBtnText}>{codeCopied ? "Copied" : "Copy"}</Text>
        </Pressable>
      </View>

      <View
        style={[
          styles.linkBox,
          {
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.03)" : "rgba(0, 0, 0, 0.02)",
            borderColor: colors.surfaceBorder,
          },
        ]}
      >
        <View style={styles.linkInfo}>
          <Text style={[styles.linkLabel, { color: colors.textMuted }]}>SIGNUP LINK</Text>
          <Text style={[styles.linkValue, { color: colors.text }]} numberOfLines={1}>
            {displaySignupLink}
          </Text>
        </View>
        <Pressable
          onPress={onCopyLink}
          hitSlop={8}
          style={({ pressed }) => [
            styles.linkCopyIconBtn,
            {
              backgroundColor: linkCopied
                ? "#10B981"
                : isDark
                ? "rgba(255, 255, 255, 0.08)"
                : "#E2E8F0",
              opacity: pressed ? 0.8 : 1,
            },
          ]}
        >
          <Ionicons
            name={linkCopied ? "checkmark" : "link-outline"}
            size={16}
            color={linkCopied ? "#FFFFFF" : colors.text}
          />
        </Pressable>
      </View>

      <Pressable
        onPress={onShare}
        style={({ pressed }) => [
          styles.singleShareBtn,
          {
            backgroundColor: isDark ? "rgba(255, 255, 255, 0.06)" : "#F1F5F9",
            borderColor: colors.surfaceBorder,
            opacity: pressed ? 0.85 : 1,
          },
        ]}
      >
        <Ionicons name="share-social-outline" size={17} color={colors.text} />
        <Text style={[styles.singleShareBtnText, { color: colors.text }]}>Share Code</Text>
      </Pressable>
    </View>
  );
});
