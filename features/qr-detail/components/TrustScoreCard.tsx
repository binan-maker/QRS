import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { formatCompactNumber } from "@/lib/number-format";
import { useTheme } from "@/contexts/ThemeContext";

interface TrustInfo {
  score: number;
  label: string;
  color: string;
}

interface Props {
  trustInfo: TrustInfo;
  reportCounts: Record<string, number>;
  totalScans: number;
  isQrOwner: boolean;
  followCount: number;
  followersModalOpen: boolean;
  onOpenFollowers: () => void;
  manipulationWarning?: boolean;
  scanCountFrozen?: boolean;
  ownerScanCount?: number;
}

function getScoreGradient(score: number, colors: any): [string, string] {
  if (score >= 70) return [colors.safe, colors.safeShade];
  if (score >= 40) return [colors.warning, colors.warningShade];
  return [colors.danger, colors.dangerShade];
}

const TrustScoreCard = React.memo(function TrustScoreCard({
  trustInfo, reportCounts, totalScans,
  isQrOwner, followCount, onOpenFollowers, manipulationWarning,
  scanCountFrozen, ownerScanCount,
}: Props) {
  const { colors, isDark } = useTheme();

  const REPORT_TYPES = [
    { key: "safe", label: "Safe",  icon: "shield-checkmark-outline" as const, color: colors.safe    },
    { key: "scam", label: "Scam",  icon: "warning-outline" as const,          color: colors.danger  },
    { key: "fake", label: "Fake",  icon: "close-circle-outline" as const,     color: colors.warning },
    { key: "spam", label: "Spam",  icon: "mail-unread-outline" as const,      color: colors.primary },
  ];

  const total = REPORT_TYPES.reduce((sum, r) => sum + (reportCounts[r.key] || 0), 0);
  const hasScore = trustInfo.score >= 0;
  const scoreGradient = hasScore ? getScoreGradient(trustInfo.score, colors) : [colors.textMuted, colors.surfaceBorder] as [string, string];

  const votedTypes = REPORT_TYPES.filter((r) => (reportCounts[r.key] || 0) > 0);

  const STATS = [
    { icon: "scan-outline" as const,   label: "Scans",     value: totalScans },
    { icon: "people-outline" as const, label: "Followers", value: followCount, onPress: isQrOwner ? onOpenFollowers : undefined },
    { icon: "flag-outline" as const,   label: "Votes",     value: total },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      {/* Score hero */}
      <View style={styles.scoreHero}>
        <View style={styles.scoreRingWrap}>
          <LinearGradient colors={scoreGradient} style={styles.scoreRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
            <View style={[styles.scoreInner, { backgroundColor: isDark ? colors.surface : "#fff" }]}>
              {hasScore ? (
                <View style={styles.scoreNumRow}>
                  <Text style={[styles.scoreNum, { color: scoreGradient[0] }]} maxFontSizeMultiplier={1}>{Math.round(trustInfo.score)}</Text>
                  <Text style={[styles.scorePct, { color: scoreGradient[0] }]} maxFontSizeMultiplier={1}>%</Text>
                </View>
              ) : (
                <Ionicons name="help-outline" size={28} color={colors.textMuted} />
              )}
            </View>
          </LinearGradient>
        </View>

        <View style={styles.scoreMeta}>
          <Text style={[styles.scoreTitle, { color: colors.text }]} maxFontSizeMultiplier={1}>Trust Score</Text>

          {hasScore ? (
            <>
              <View style={[styles.scoreLabelBadge, { backgroundColor: scoreGradient[0] + (isDark ? "22" : "14"), borderColor: scoreGradient[0] + "35" }]}>
                <Text style={[styles.scoreLabelText, { color: scoreGradient[0] }]} maxFontSizeMultiplier={1}>
                  {trustInfo.label}
                </Text>
              </View>
              <View style={[styles.scoreBar, { backgroundColor: isDark ? colors.surfaceLight : colors.background }]}>
                <LinearGradient
                  colors={scoreGradient}
                  style={[styles.scoreBarFill, { width: `${Math.min(100, trustInfo.score)}%` as any }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                />
              </View>
              {total > 0 && (
                <Text style={[styles.voteCount, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
                  {formatCompactNumber(total)} {total === 1 ? "vote" : "votes"} cast
                </Text>
              )}
            </>
          ) : (
            <View style={[styles.firstVoteBadge, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "40" }]}>
              <Ionicons name="thumbs-up-outline" size={12} color={colors.primary} />
              <Text style={[styles.firstVoteText, { color: colors.primary }]} maxFontSizeMultiplier={1}>Be the first to vote</Text>
            </View>
          )}
        </View>
      </View>

      {/* Manipulation warning */}
      {manipulationWarning && (
        <View style={[styles.manipBanner, { backgroundColor: colors.warningDim, borderColor: colors.warning + "40" }]}>
          <Ionicons name="alert-circle" size={13} color={colors.warning} />
          <Text style={[styles.manipText, { color: colors.warning }]}>
            Unusual voting activity detected — score may not reflect real opinion.
          </Text>
        </View>
      )}

      {/* Scan count frozen badge */}
      {scanCountFrozen && (
        <View style={[styles.manipBanner, { backgroundColor: colors.dangerDim, borderColor: colors.danger + "40" }]}>
          <Ionicons name="lock-closed" size={13} color={colors.danger} />
          <Text style={[styles.manipText, { color: colors.danger }]}>
            Scan count is temporarily frozen — abnormal activity detected and flagged for review.
          </Text>
        </View>
      )}

      {/* Owner-only analytics panel */}
      {isQrOwner && ownerScanCount !== undefined && ownerScanCount > 0 && (
        <View style={[styles.ownerPanel, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "35" }]}>
          <Ionicons name="eye-outline" size={14} color={colors.primary} />
          <Text style={[styles.ownerPanelText, { color: colors.primary }]}>
            Your own scans: <Text style={{ fontFamily: "Inter_700Bold" }}>{formatCompactNumber(ownerScanCount)}</Text>
            {" "}(tracked separately — not counted in public total)
          </Text>
        </View>
      )}

      {/* Stats row */}
      <View style={[styles.statsGrid, { borderColor: colors.surfaceBorder }]}>
        {STATS.map((s, i) => (
          <Pressable
            key={i}
            onPress={s.onPress}
            disabled={!s.onPress}
            style={({ pressed }) => [
              styles.statCell,
              { borderColor: colors.surfaceBorder },
              i < STATS.length - 1 && styles.statCellBorder,
              pressed && s.onPress && { opacity: 0.6 },
            ]}
          >
            <Text style={[styles.statNum, { color: colors.text }]} maxFontSizeMultiplier={1}>
              {formatCompactNumber(s.value)}
            </Text>
            <Text
              style={[styles.statLabel, { color: s.onPress ? colors.primary : colors.textMuted }]}
              numberOfLines={1}
              maxFontSizeMultiplier={1}
            >
              {s.label}{s.onPress ? " ›" : ""}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Vote breakdown — only shown when there are any votes */}
      {votedTypes.length > 0 && (
        <View style={[styles.voteBreakdown, { borderTopColor: colors.surfaceBorder }]}>
          <Text style={[styles.breakdownTitle, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
            COMMUNITY VOTES
          </Text>
          <View style={styles.breakdownRows}>
            {votedTypes.map((rt) => {
              const count = reportCounts[rt.key] || 0;
              const pct = Math.round((count / total) * 100);
              return (
                <View key={rt.key} style={styles.breakdownRow}>
                  <View style={styles.breakdownLabelRow}>
                    <Ionicons name={rt.icon} size={12} color={rt.color} />
                    <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]} maxFontSizeMultiplier={1}>
                      {rt.label}
                    </Text>
                    <Text style={[styles.breakdownPct, { color: rt.color }]} maxFontSizeMultiplier={1}>
                      {count} {count === 1 ? "person" : "people"}
                    </Text>
                  </View>
                  <View style={[styles.barTrack, { backgroundColor: isDark ? colors.surfaceLight : colors.background }]}>
                    <View
                      style={[
                        styles.barFill,
                        { width: `${pct}%` as any, backgroundColor: rt.color },
                      ]}
                    />
                  </View>
                </View>
              );
            })}
          </View>
        </View>
      )}
    </View>
  );
});

export default TrustScoreCard;

const styles = StyleSheet.create({
  card: {
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
    padding: 18,
    gap: 16,
  },
  scoreHero: { flexDirection: "row", alignItems: "center", gap: 18 },
  scoreRingWrap: { flexShrink: 0 },
  scoreRing: {
    width: 82,
    height: 82,
    borderRadius: 41,
    padding: 3,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreInner: {
    width: 76,
    height: 76,
    borderRadius: 38,
    alignItems: "center",
    justifyContent: "center",
  },
  scoreNumRow: { flexDirection: "row", alignItems: "baseline" },
  scoreNum: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 34 },
  scorePct: { fontSize: 13, fontFamily: "Inter_700Bold", marginLeft: 1 },
  scoreMeta: { flex: 1, gap: 8 },
  scoreTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  scoreLabelBadge: {
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  scoreLabelText: { fontSize: 12, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  firstVoteBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    alignSelf: "flex-start",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
    borderWidth: 1,
  },
  firstVoteText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  voteCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  scoreBar: { height: 5, borderRadius: 3, overflow: "hidden" },
  scoreBarFill: { height: "100%", borderRadius: 3 },
  manipBanner: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
  },
  manipText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  ownerPanel: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    borderRadius: 12,
    padding: 11,
    borderWidth: 1,
  },
  ownerPanelText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  statsGrid: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
  },
  statCell: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 12,
    gap: 3,
  },
  statCellBorder: {
    borderRightWidth: StyleSheet.hairlineWidth,
  },
  statNum: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold", textAlign: "center" },

  /* Vote breakdown */
  voteBreakdown: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
    gap: 10,
  },
  breakdownTitle: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.2,
  },
  breakdownRows: { gap: 8 },
  breakdownRow: { gap: 5 },
  breakdownLabelRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  breakdownLabel: {
    flex: 1,
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  breakdownPct: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  barTrack: {
    height: 5,
    borderRadius: 3,
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: 3,
  },
});
