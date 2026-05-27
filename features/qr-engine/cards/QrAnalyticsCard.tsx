/**
 * QR Engine — QrAnalyticsCard
 * ─────────────────────────────────────────────────────────────────────────────
 * Displays scan count, trust score, and trend data for a QR code.
 * Used in My QR management, owner dashboards, and analytics views.
 */

import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { formatScanCount, formatLastScanned, trendIcon, trendColor } from "../analytics";
import { trustLevelColor, trustLevelLabel, trustLevelIcon } from "../trust/trust-scorer";
import type { QrAnalyticsSummary, QrTrustSummary } from "../types";

interface QrAnalyticsCardProps {
  analytics: QrAnalyticsSummary;
  trustSummary?: QrTrustSummary;
  showTrustBreakdown?: boolean;
}

function QrAnalyticsCardComponent({
  analytics,
  trustSummary,
  showTrustBreakdown = false,
}: QrAnalyticsCardProps) {
  const { colors, isDark } = useTheme();
  const tColor = trustSummary ? trustLevelColor(trustSummary.level) : "#6B7280";

  return (
    <View style={[styles.card, {
      backgroundColor: isDark ? colors.surface : "#FFFFFF",
      borderColor: isDark ? colors.surfaceBorder : "#E5E7EB",
    }]}>
      {/* Scan stats row */}
      <View style={styles.statsRow}>
        <StatBox
          icon="scan-outline"
          value={formatScanCount(analytics.scan_count)}
          label="Total Scans"
          color="#6366F1"
          isDark={isDark}
          colors={colors}
        />
        {analytics.unique_scanners !== undefined && (
          <StatBox
            icon="people-outline"
            value={formatScanCount(analytics.unique_scanners)}
            label="Unique Scanners"
            color="#0891B2"
            isDark={isDark}
            colors={colors}
          />
        )}
        {analytics.last_scanned_at && (
          <StatBox
            icon="time-outline"
            value={formatLastScanned(analytics.last_scanned_at)}
            label="Last Scanned"
            color="#059669"
            isDark={isDark}
            colors={colors}
          />
        )}
      </View>

      {/* Trust summary row */}
      {trustSummary && (
        <View style={[styles.trustRow, { borderTopColor: colors.surfaceBorder }]}>
          <View style={[styles.trustIcon, { backgroundColor: tColor + "15" }]}>
            <Ionicons name={trustLevelIcon(trustSummary.level) as any} size={16} color={tColor} />
          </View>
          <View style={styles.trustBody}>
            <Text style={[styles.trustLabel, { color: colors.text }]}>
              Trust Score: <Text style={{ color: tColor }}>{trustSummary.score}/100</Text>
            </Text>
            <Text style={[styles.trustLevelText, { color: tColor }]}>
              {trustLevelLabel(trustSummary.level)}
            </Text>
          </View>
          {/* Score bar */}
          <View style={[styles.scoreBarTrack, { backgroundColor: colors.surfaceBorder }]}>
            <LinearGradient
              colors={[tColor + "AA", tColor]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={[styles.scoreBarFill, { width: `${trustSummary.score}%` as any }]}
            />
          </View>
        </View>
      )}

      {/* Trust flags */}
      {showTrustBreakdown && trustSummary && trustSummary.flags.length > 0 && (
        <View style={[styles.flagsRow, { borderTopColor: colors.surfaceBorder }]}>
          {trustSummary.flags.map((flag) => (
            <FlagPill key={flag} flag={flag} colors={colors} />
          ))}
        </View>
      )}
    </View>
  );
}

function StatBox({
  icon, value, label, color, isDark, colors,
}: {
  icon: string; value: string; label: string; color: string; isDark: boolean; colors: any;
}) {
  return (
    <View style={[styles.statBox, { backgroundColor: color + "0F" }]}>
      <Ionicons name={icon as any} size={16} color={color} />
      <Text style={[styles.statValue, { color: colors.text }]}>{value}</Text>
      <Text style={[styles.statLabel, { color: colors.textMuted }]}>{label}</Text>
    </View>
  );
}

const FLAG_LABELS: Record<string, string> = {
  safe_browsing_clear: "✓ Safe Browsing",
  verified_merchant: "✓ Verified",
  community_trusted: "✓ Community",
  community_reported: "⚠ Reported",
  phishing_pattern: "⚠ Phishing",
  malicious_url: "✗ Malicious",
  suspicious_domain: "⚠ Suspicious",
  url_shortener: "~ Shortened",
  redirect_chain: "~ Redirect",
  typosquatting: "⚠ Squatting",
  ip_address_url: "⚠ IP URL",
};

const FLAG_COLORS: Record<string, string> = {
  safe_browsing_clear: "#10B981",
  verified_merchant: "#10B981",
  community_trusted: "#10B981",
  community_reported: "#F59E0B",
  phishing_pattern: "#EF4444",
  malicious_url: "#DC2626",
  suspicious_domain: "#EF4444",
  url_shortener: "#6B7280",
  redirect_chain: "#6B7280",
  typosquatting: "#EF4444",
  ip_address_url: "#EF4444",
};

function FlagPill({ flag, colors }: { flag: string; colors: any }) {
  const label = FLAG_LABELS[flag] ?? flag;
  const color = FLAG_COLORS[flag] ?? "#6B7280";
  return (
    <View style={[styles.flagPill, { backgroundColor: color + "15", borderColor: color + "30" }]}>
      <Text style={[styles.flagText, { color }]}>{label}</Text>
    </View>
  );
}

export const QrAnalyticsCard = memo(QrAnalyticsCardComponent);

const styles = StyleSheet.create({
  card: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 14,
  },
  statsRow: {
    flexDirection: "row",
    gap: 8,
    padding: 14,
  },
  statBox: {
    flex: 1,
    borderRadius: 12,
    padding: 12,
    alignItems: "center",
    gap: 4,
  },
  statValue: {
    fontSize: 16,
    fontFamily: "Inter_700Bold",
  },
  statLabel: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    textAlign: "center",
  },
  trustRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  trustIcon: {
    width: 34,
    height: 34,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  trustBody: {
    flex: 1,
  },
  trustLabel: {
    fontSize: 13,
    fontFamily: "Inter_600SemiBold",
  },
  trustLevelText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    marginTop: 1,
  },
  scoreBarTrack: {
    width: 60,
    height: 6,
    borderRadius: 3,
    overflow: "hidden",
  },
  scoreBarFill: {
    height: "100%",
    borderRadius: 3,
  },
  flagsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 6,
    paddingHorizontal: 14,
    paddingBottom: 14,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 10,
  },
  flagPill: {
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
  },
  flagText: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
  },
});
