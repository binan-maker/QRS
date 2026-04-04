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
  totalComments: number;
  isQrOwner: boolean;
  followCount: number;
  followersModalOpen: boolean;
  onOpenFollowers: () => void;
  manipulationWarning?: boolean;
}

function getScoreGradient(score: number, colors: any): [string, string] {
  if (score >= 70) return [colors.safe, colors.safeShade];
  if (score >= 40) return [colors.warning, colors.warningShade];
  return [colors.danger, colors.dangerShade];
}

const TrustScoreCard = React.memo(function TrustScoreCard({
  trustInfo, reportCounts, totalScans, totalComments,
  isQrOwner, followCount, onOpenFollowers, manipulationWarning,
}: Props) {
  const { colors, isDark } = useTheme();

  const REPORT_TYPES = [
    { key: "safe", label: "Safe",  color: colors.safe    },
    { key: "scam", label: "Scam",  color: colors.danger  },
    { key: "fake", label: "Fake",  color: colors.warning },
    { key: "spam", label: "Spam",  color: colors.primary },
  ];

  const total = REPORT_TYPES.reduce((sum, r) => sum + (reportCounts[r.key] || 0), 0);
  const hasScore = trustInfo.score >= 0;
  const scoreGradient = hasScore ? getScoreGradient(trustInfo.score, colors) : [colors.textMuted, colors.surfaceBorder] as [string, string];

  const STATS = [
    { icon: "scan-outline" as const,       label: "Scans",     value: totalScans    },
    { icon: "chatbubbles-outline" as const, label: "Comments",  value: totalComments },
    { icon: "people-outline" as const,     label: "Followers", value: followCount, onPress: isQrOwner ? onOpenFollowers : undefined },
    { icon: "flag-outline" as const,       label: "Votes",     value: total         },
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

      {/* Stats row */}
      <View style={styles.statsGrid}>
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

      {/* Vote breakdown */}
      {total > 0 && (
        <View style={[styles.breakdown, { borderTopColor: colors.surfaceBorder }]}>
          {REPORT_TYPES.map((r) => {
            const count = reportCounts[r.key] || 0;
            if (count === 0) return null;
            const pct = Math.round((count / total) * 100);
            return (
              <View key={r.key} style={styles.breakdownItem}>
                <View style={styles.breakdownRow}>
                  <View style={[styles.breakdownDot, { backgroundColor: r.color }]} />
                  <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]} maxFontSizeMultiplier={1}>{r.label}</Text>
                  <Text style={[styles.breakdownPct, { color: r.color }]} maxFontSizeMultiplier={1}>{pct}%</Text>
                  <Text style={[styles.breakdownCount, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>· {count}</Text>
                </View>
                <View style={[styles.breakdownBar, { backgroundColor: isDark ? colors.surfaceLight : colors.background }]}>
                  <LinearGradient
                    colors={[r.color, r.color + "99"]}
                    style={[styles.breakdownBarFill, { width: `${pct}%` as any }]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </View>
              </View>
            );
          })}
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
  statsGrid: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "transparent",
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
  breakdown: {
    gap: 10,
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingTop: 14,
  },
  breakdownItem: { gap: 5 },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  breakdownDot: { width: 7, height: 7, borderRadius: 3.5 },
  breakdownLabel: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  breakdownPct: { fontSize: 12, fontFamily: "Inter_700Bold" },
  breakdownCount: { fontSize: 12, fontFamily: "Inter_400Regular" },
  breakdownBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  breakdownBarFill: { height: "100%", borderRadius: 2 },
});
