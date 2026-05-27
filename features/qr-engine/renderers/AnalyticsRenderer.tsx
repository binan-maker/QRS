/**
 * QR Engine — AnalyticsRenderer
 * ─────────────────────────────────────────────────────────────────────────────
 * Compact card showing scan count + trust score, used in lists where
 * analytics context is important (My QR management, leaderboard).
 *
 * Mode: "analytics"
 */

import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { getQrTypeMeta, getDisplayLabel } from "../registry";
import { trustLevelColor, trustLevelIcon } from "../trust/trust-scorer";
import { formatScanCount, formatLastScanned } from "../analytics";
import type { QrRenderProps } from "../types";

function AnalyticsRendererComponent({
  content,
  contentType,
  templateKey,
  analytics,
  trustSummary,
}: QrRenderProps) {
  const { colors, isDark } = useTheme();
  const effectiveType = templateKey ?? contentType;
  const meta = getQrTypeMeta(effectiveType);
  const displayLabel = getDisplayLabel(content, effectiveType);

  return (
    <View style={[styles.card, {
      backgroundColor: isDark ? colors.surface : "#FFFFFF",
      borderColor: meta.color + "20",
    }]}>
      {/* Left: type icon */}
      <View style={[styles.iconWrap, { backgroundColor: meta.color + "15" }]}>
        <Ionicons name={meta.icon as any} size={18} color={meta.color} />
      </View>

      {/* Center: label + stats */}
      <View style={styles.body}>
        <Text style={[styles.label, { color: colors.text }]} numberOfLines={1}>
          {displayLabel}
        </Text>
        <View style={styles.statsRow}>
          {analytics && (
            <>
              <Ionicons name="scan-outline" size={11} color={colors.textMuted} />
              <Text style={[styles.stat, { color: colors.textMuted }]}>
                {formatScanCount(analytics.scan_count)}
              </Text>
              {analytics.last_scanned_at && (
                <>
                  <Text style={[styles.dot, { color: colors.textMuted }]}>·</Text>
                  <Text style={[styles.stat, { color: colors.textMuted }]}>
                    {formatLastScanned(analytics.last_scanned_at)}
                  </Text>
                </>
              )}
            </>
          )}
        </View>
      </View>

      {/* Right: trust score */}
      {trustSummary && (
        <View style={styles.trustBlock}>
          <View style={[styles.trustIcon, { backgroundColor: trustLevelColor(trustSummary.level) + "15" }]}>
            <Ionicons
              name={trustLevelIcon(trustSummary.level) as any}
              size={14}
              color={trustLevelColor(trustSummary.level)}
            />
          </View>
          <Text style={[styles.trustScore, { color: trustLevelColor(trustSummary.level) }]}>
            {trustSummary.score}
          </Text>
        </View>
      )}
    </View>
  );
}

export const AnalyticsRenderer = memo(AnalyticsRendererComponent);
export default AnalyticsRenderer;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 11,
    paddingHorizontal: 13,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 7,
  },
  iconWrap: {
    width: 38,
    height: 38,
    borderRadius: 11,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  body: {
    flex: 1,
    gap: 3,
  },
  label: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  statsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  stat: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  dot: {
    fontSize: 11,
  },
  trustBlock: {
    alignItems: "center",
    gap: 2,
  },
  trustIcon: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
  trustScore: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
  },
});
