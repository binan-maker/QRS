import React, { useState, memo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import type { AppColors } from "@/shared/constants/colors";
import {
  USERNAME_RULES_LIST,
  type UsernameRuleDefinition,
} from "@/shared/utils/username-rules";

export const USERNAME_RULES = USERNAME_RULES_LIST;

interface Props {
  colors: AppColors;
  currentUsername: string | null;
  canChangeUsername: boolean;
  daysUntilUsernameChange: number;
  lastChangedAt: Date | null;
  onEditPress?: () => void;
}

function UsernameRulesCardComponent({
  colors,
  currentUsername,
  canChangeUsername,
  daysUntilUsernameChange,
  lastChangedAt,
  onEditPress,
}: Props) {
  const [expanded, setExpanded] = useState(true);

  const formattedDate = lastChangedAt
    ? new Date(lastChangedAt).toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : null;

  return (
    <Animated.View
      entering={FadeInDown.delay(70).duration(260)}
      style={[
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.surfaceBorder,
        },
      ]}
    >
      {/* Header */}
      <Pressable
        onPress={() => setExpanded((prev) => !prev)}
        style={styles.cardHeader}
        accessibilityRole="button"
        accessibilityLabel="Toggle username rules"
      >
        <View style={styles.headerTitleRow}>
          <View
            style={[
              styles.iconWrap,
              { backgroundColor: colors.primaryDim },
            ]}
          >
            <Ionicons name="at-circle-outline" size={19} color={colors.primary} />
          </View>
          <View style={styles.headerTextCol}>
            <Text style={[styles.cardTitle, { color: colors.text }]}>
              Username Rules
            </Text>
            <Text style={[styles.cardSubtitle, { color: colors.textMuted }]}>
              Handle criteria & changing policy
            </Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <View
            style={[
              styles.statusPill,
              {
                backgroundColor: canChangeUsername ? colors.safeDim : colors.warningDim,
                borderColor: canChangeUsername ? colors.safe + "40" : colors.warning + "40",
              },
            ]}
          >
            <Ionicons
              name={canChangeUsername ? "checkmark-circle" : "time"}
              size={12}
              color={canChangeUsername ? colors.safe : colors.warning}
            />
            <Text
              style={[
                styles.statusPillText,
                { color: canChangeUsername ? colors.safe : colors.warning },
              ]}
            >
              {canChangeUsername
                ? "Can change"
                : `${daysUntilUsernameChange}d left`}
            </Text>
          </View>
          <Ionicons
            name={expanded ? "chevron-up" : "chevron-down"}
            size={16}
            color={colors.textMuted}
          />
        </View>
      </Pressable>

      {/* Expanded Content */}
      {expanded && (
        <View style={styles.contentWrap}>
          {/* Status banner */}
          <View
            style={[
              styles.statusBanner,
              {
                backgroundColor: canChangeUsername
                  ? colors.safeDim
                  : colors.surfaceLight,
                borderColor: canChangeUsername
                  ? colors.safe + "35"
                  : colors.surfaceBorder,
              },
            ]}
          >
            <Ionicons
              name={canChangeUsername ? "shield-checkmark" : "hourglass-outline"}
              size={17}
              color={canChangeUsername ? colors.safe : colors.warning}
            />
            <View style={{ flex: 1 }}>
              <Text
                style={[
                  styles.statusBannerTitle,
                  {
                    color: canChangeUsername ? colors.safe : colors.text,
                  },
                ]}
              >
                {canChangeUsername
                  ? "Eligible to change username"
                  : `Cooldown Active (${daysUntilUsernameChange} day${daysUntilUsernameChange === 1 ? "" : "s"} left)`}
              </Text>
              <Text style={[styles.statusBannerSub, { color: colors.textMuted }]}>
                {canChangeUsername
                  ? currentUsername
                    ? `Your handle @${currentUsername} is active. You may update it now.`
                    : "You haven't set a username yet. Choose an available handle."
                  : formattedDate
                  ? `Last changed on ${formattedDate}. Next change available once 15 days pass.`
                  : "Username can only be updated once every 15 days."}
              </Text>
            </View>
          </View>

          {/* Rules list */}
          <View style={styles.rulesList}>
            {USERNAME_RULES.map((rule, idx) => (
              <View
                key={rule.title}
                style={[
                  styles.ruleRow,
                  idx < USERNAME_RULES.length - 1 && [
                    styles.ruleRowBorder,
                    { borderBottomColor: colors.surfaceBorder },
                  ],
                ]}
              >
                <View
                  style={[
                    styles.ruleIconCircle,
                    { backgroundColor: colors.surfaceLight },
                  ]}
                >
                  <Ionicons name={rule.icon as any} size={15} color={colors.primary} />
                </View>
                <View style={styles.ruleTextContainer}>
                  <Text style={[styles.ruleTitle, { color: colors.text }]}>
                    {rule.title}
                  </Text>
                  <Text style={[styles.ruleDesc, { color: colors.textSecondary }]}>
                    {rule.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Action button if eligible */}
          {onEditPress && (
            <Pressable
              onPress={onEditPress}
              style={({ pressed }) => [
                styles.actionBtn,
                {
                  backgroundColor: canChangeUsername
                    ? colors.primary
                    : colors.surfaceLight,
                  borderColor: canChangeUsername
                    ? colors.primary
                    : colors.surfaceBorder,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons
                name={canChangeUsername ? "create-outline" : "lock-closed-outline"}
                size={15}
                color={canChangeUsername ? colors.primaryText : colors.textMuted}
              />
              <Text
                style={[
                  styles.actionBtnText,
                  {
                    color: canChangeUsername
                      ? colors.primaryText
                      : colors.textMuted,
                  },
                ]}
              >
                {canChangeUsername
                  ? "Change Username Now"
                  : `Locked (${daysUntilUsernameChange}d left)`}
              </Text>
            </Pressable>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 20,
  },
  cardHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 14,
  },
  headerTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  iconWrap: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTextCol: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
  },
  cardSubtitle: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 1,
  },
  headerRight: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3.5,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusPillText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
  },
  contentWrap: {
    paddingHorizontal: 14,
    paddingBottom: 14,
    gap: 12,
  },
  statusBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  statusBannerTitle: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  statusBannerSub: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    lineHeight: 16,
  },
  rulesList: {
    borderRadius: 12,
    overflow: "hidden",
  },
  ruleRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    paddingVertical: 10,
  },
  ruleRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  ruleIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 1,
  },
  ruleTextContainer: {
    flex: 1,
  },
  ruleTitle: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  ruleDesc: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    marginTop: 2,
    lineHeight: 15,
  },
  actionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 4,
  },
  actionBtnText: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
});

export const UsernameRulesCard = memo(UsernameRulesCardComponent);
export default UsernameRulesCard;
