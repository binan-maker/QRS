/**
 * QR Engine — FeedRenderer
 * ─────────────────────────────────────────────────────────────────────────────
 * Social-style rich card used on home feed, search results, and any list
 * where more visual context is needed than a simple row.
 *
 * Mode: "feed"
 */

import React, { memo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { getQrTypeMeta, getDisplayLabel, getSubtitle } from "../registry";
import { trustLevelColor, trustLevelIcon } from "../trust/trust-scorer";
import { formatScanCount } from "../analytics";
import type { QrRenderProps } from "../types";

function FeedRendererComponent({
  content,
  contentType,
  templateKey,
  onOpen,
  risk,
  isDynamic,
  analytics,
  trustSummary,
  isDeactivated,
}: QrRenderProps) {
  const { colors, isDark } = useTheme();
  const effectiveType = templateKey ?? contentType;
  const meta = getQrTypeMeta(effectiveType);
  const displayLabel = getDisplayLabel(content, effectiveType);
  const subtitle = getSubtitle(content, effectiveType);

  const accentColor = isDeactivated ? "#9CA3AF" : meta.color;

  return (
    <Animated.View entering={FadeInDown.duration(240)}>
      <Pressable
        onPress={onOpen}
        style={({ pressed }) => [
          styles.card,
          {
            backgroundColor: isDark ? colors.surface : "#FFFFFF",
            borderColor: accentColor + "25",
            opacity: isDeactivated ? 0.6 : pressed ? 0.93 : 1,
          },
        ]}
        android_ripple={{ color: accentColor + "15" }}
      >
        {/* Gradient header strip */}
        <LinearGradient
          colors={isDeactivated
            ? ["#9CA3AF20", "#9CA3AF10"]
            : [meta.gradient[0] + "22", meta.gradient[1] + "0A"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.headerStrip}
        >
          <View style={[styles.iconCircle, { backgroundColor: accentColor + "18" }]}>
            <Ionicons name={meta.icon as any} size={24} color={accentColor} />
          </View>
          <View style={styles.headerText}>
            <Text style={[styles.typeLabel, { color: accentColor }]}>{meta.label}</Text>
            {isDynamic && (
              <View style={[styles.dynamicBadge, { backgroundColor: "#6366F118", borderColor: "#6366F130" }]}>
                <Ionicons name="git-branch-outline" size={10} color="#6366F1" />
                <Text style={styles.dynamicText}>Dynamic</Text>
              </View>
            )}
          </View>
          {trustSummary && (
            <View style={[styles.trustBadge, { backgroundColor: trustLevelColor(trustSummary.level) + "15" }]}>
              <Ionicons
                name={trustLevelIcon(trustSummary.level) as any}
                size={13}
                color={trustLevelColor(trustSummary.level)}
              />
              <Text style={[styles.trustScore, { color: trustLevelColor(trustSummary.level) }]}>
                {trustSummary.score}
              </Text>
            </View>
          )}
        </LinearGradient>

        {/* Content body */}
        <View style={styles.body}>
          <Text
            style={[styles.displayLabel, { color: colors.text }]}
            numberOfLines={2}
            ellipsizeMode="tail"
          >
            {displayLabel}
          </Text>
          {subtitle && (
            <Text
              style={[styles.subtitle, { color: colors.textMuted }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {subtitle}
            </Text>
          )}
        </View>

        {/* Footer */}
        {analytics && analytics.scan_count > 0 && (
          <View style={[styles.footer, { borderTopColor: colors.surfaceBorder }]}>
            <Ionicons name="scan-outline" size={12} color={colors.textMuted} />
            <Text style={[styles.scanCount, { color: colors.textMuted }]}>
              {formatScanCount(analytics.scan_count)} scans
            </Text>
          </View>
        )}
      </Pressable>
    </Animated.View>
  );
}

export const FeedRenderer = memo(FeedRendererComponent);
export default FeedRenderer;

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1.5,
    overflow: "hidden",
    marginBottom: 10,
  },
  headerStrip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
  },
  iconCircle: {
    width: 44,
    height: 44,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  headerText: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  typeLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.3,
    textTransform: "uppercase",
  },
  dynamicBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 6,
    paddingHorizontal: 6,
    paddingVertical: 3,
    borderWidth: 1,
  },
  dynamicText: {
    fontSize: 10,
    fontFamily: "Inter_500Medium",
    color: "#6366F1",
  },
  trustBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  trustScore: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  body: {
    paddingHorizontal: 14,
    paddingVertical: 12,
    gap: 4,
  },
  displayLabel: {
    fontSize: 15,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 21,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
  footer: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  scanCount: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
});
