/**
 * QR Engine — QrCard (Universal Feed Card)
 * ─────────────────────────────────────────────────────────────────────────────
 * The canonical card component for displaying a QR code in any list or feed.
 * Replaces all ad-hoc card implementations across History, Home, Favorites,
 * and Search screens.
 *
 * Usage:
 *   <QrCard content={qr.rawContent} contentType={qr.contentType} />
 *   <QrCard content={qr.rawContent} contentType={qr.contentType} onPress={...} showTrust />
 */

import React, { memo, type ReactNode } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { getQrTypeMeta, getDisplayLabel, getSubtitle } from "../registry";
import { trustLevelColor, trustLevelIcon } from "../trust/trust-scorer";
import type { QrTrustSummary } from "../types";

interface QrCardProps {
  content: string;
  contentType: string;
  templateKey?: string;
  title?: string;
  onPress?: () => void;
  onLongPress?: () => void;
  showTrust?: boolean;
  trustSummary?: QrTrustSummary;
  isDynamic?: boolean;
  isActive?: boolean;
  rightAction?: ReactNode;
  animationDelay?: number;
  testID?: string;
}

function QrCardComponent({
  content,
  contentType,
  templateKey,
  title,
  onPress,
  onLongPress,
  showTrust = false,
  trustSummary,
  isDynamic = false,
  isActive = true,
  rightAction,
  animationDelay = 0,
  testID,
}: QrCardProps) {
  const { colors, isDark } = useTheme();
  const effectiveType = templateKey ?? contentType;
  const meta = getQrTypeMeta(effectiveType);
  const displayLabel = title ?? getDisplayLabel(content, effectiveType);
  const subtitle = getSubtitle(content, effectiveType);

  const accentColor = isActive ? meta.color : "#9CA3AF";

  return (
    <Animated.View
      entering={FadeInDown.duration(220).delay(animationDelay)}
      testID={testID}
    >
      <Pressable
        onPress={onPress}
        onLongPress={onLongPress}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: isDark ? colors.surface : "#FFFFFF",
            borderColor: isDark ? colors.surfaceBorder : accentColor + "20",
            opacity: pressed ? 0.92 : 1,
          },
        ]}
        android_ripple={{ color: accentColor + "18", borderless: false }}
      >
        {/* Left: icon */}
        <View style={[styles.iconWrap, { backgroundColor: accentColor + "15" }]}>
          <Ionicons name={meta.icon as any} size={22} color={accentColor} />
        </View>

        {/* Center: label + subtitle */}
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text
              style={[styles.label, { color: colors.text }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {displayLabel}
            </Text>
            {isDynamic && (
              <View style={[styles.dynamicPill, { backgroundColor: "#6366F115", borderColor: "#6366F130" }]}>
                <Ionicons name="git-branch-outline" size={10} color="#6366F1" />
              </View>
            )}
            {!isActive && (
              <View style={[styles.inactivePill, { backgroundColor: "#9CA3AF20" }]}>
                <Text style={styles.inactivePillText}>Inactive</Text>
              </View>
            )}
          </View>

          {subtitle ? (
            <Text
              style={[styles.subtitle, { color: colors.textMuted }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {subtitle}
            </Text>
          ) : (
            <Text style={[styles.typeBadge, { color: accentColor }]}>
              {meta.label}
            </Text>
          )}

        </View>

        {/* Right: trust badge or custom action */}
        {rightAction ? (
          rightAction
        ) : showTrust && trustSummary ? (
          <View style={[
            styles.trustBadge,
            { backgroundColor: trustLevelColor(trustSummary.level) + "15" },
          ]}>
            <Ionicons
              name={trustLevelIcon(trustSummary.level) as any}
              size={14}
              color={trustLevelColor(trustSummary.level)}
            />
          </View>
        ) : onPress ? (
          <Ionicons name="chevron-forward" size={16} color={colors.textMuted} />
        ) : null}
      </Pressable>
    </Animated.View>
  );
}

export const QrCard = memo(QrCardComponent);

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingVertical: 13,
    paddingHorizontal: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 8,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  body: {
    flex: 1,
    gap: 2,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  label: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    flex: 1,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  typeBadge: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
  dynamicPill: {
    borderRadius: 6,
    paddingHorizontal: 5,
    paddingVertical: 3,
    borderWidth: 1,
    flexShrink: 0,
  },
  inactivePill: {
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 2,
    flexShrink: 0,
  },
  inactivePillText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "#9CA3AF",
  },
  trustBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
});
