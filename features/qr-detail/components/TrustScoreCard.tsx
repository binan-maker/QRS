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
  if (score >= 75) return [colors.safe, colors.safeShade];
  if (score >= 50) return [colors.warning, colors.warningShade];
  if (score >= 25) return [colors.danger, colors.warning];
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
    { icon: "people-outline" as const,     label: isQrOwner ? "Followers ›" : "Followers", value: followCount, onPress: isQrOwner ? onOpenFollowers : undefined },
    { icon: "flag-outline" as const,       label: "Votes",     value: total         },
  ];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      {/* Score hero */}
      <View style={styles.scoreHero}>
        <LinearGradient colors={scoreGradient} style={styles.scoreRing} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <View style={[styles.scoreInner, { backgroundColor: isDark ? colors.surface : "#fff" }]}>
            {hasScore ? (
              <>
                <Text style={[styles.scoreNum, { color: scoreGradient[0] }]}>{Math.round(trustInfo.score)}</Text>
                <Text style={[styles.scorePct, { color: scoreGradient[0] }]}>%</Text>
              </>
            ) : (
              <Ionicons name="help-outline" size={26} color={colors.textMuted} />
            )}
          </View>
        </LinearGradient>

        <View style={styles.scoreMeta}>
          <Text style={[styles.scoreTitle, { color: colors.text }]}>Trust Score</Text>
          {hasScore ? (
            <View style={[styles.scoreLabelBadge, { backgroundColor: scoreGradient[0] + (isDark ? "22" : "14"), borderColor: scoreGradient[0] + "30" }]}>
              <Text style={[styles.scoreLabelText, { color: scoreGradient[0] }]}>
                {trustInfo.label}
                {total > 0 ? `  ·  ${formatCompactNumber(total)} voted` : ""}
              </Text>
            </View>
          ) : (
            <Text style={[styles.noScoreText, { color: colors.textMuted }]}>No votes yet</Text>
          )}
          {hasScore && (
            <View style={[styles.scoreBar, { backgroundColor: colors.surfaceLight }]}>
              <LinearGradient
                colors={scoreGradient}
                style={[styles.scoreBarFill, { width: `${Math.min(100, trustInfo.score)}%` as any }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              />
            </View>
          )}
        </View>
      </View>

      {/* Manipulation warning */}
      {manipulationWarning && (
        <View style={[styles.manipBanner, { backgroundColor: colors.warningDim, borderColor: colors.warning + "40" }]}>
          <Ionicons name="alert-circle" size={14} color={colors.warning} />
          <Text style={[styles.manipText, { color: colors.warning }]}>
            Unusual voting activity detected — score may not reflect real community opinion.
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
              styles.statCard,
              { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder },
              pressed && s.onPress && { opacity: 0.7 },
            ]}
          >
            <Text style={[styles.statNum, { color: colors.text }]}>{formatCompactNumber(s.value)}</Text>
            <Text style={[styles.statLabel, { color: s.onPress ? colors.primary : colors.textMuted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Vote breakdown — shows people count */}
      {total > 0 && (
        <View style={styles.breakdown}>
          {REPORT_TYPES.map((r) => {
            const count = reportCounts[r.key] || 0;
            if (count === 0) return null;
            const pct = Math.round((count / total) * 100);
            return (
              <View key={r.key} style={styles.breakdownItem}>
                <View style={styles.breakdownRow}>
                  <View style={[styles.breakdownDot, { backgroundColor: r.color }]} />
                  <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>{r.label}</Text>
                  <Text style={[styles.breakdownCount, { color: r.color }]}>{count} {count === 1 ? "person" : "people"}</Text>
                </View>
                <View style={[styles.breakdownBar, { backgroundColor: colors.surfaceLight }]}>
                  <View style={[styles.breakdownBarFill, { width: `${pct}%` as any, backgroundColor: r.color + (isDark ? "90" : "70") }]} />
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
  card: { borderRadius: 20, padding: 18, marginBottom: 16, borderWidth: 1, gap: 16 },
  scoreHero: { flexDirection: "row", alignItems: "center", gap: 16 },
  scoreRing: { width: 76, height: 76, borderRadius: 38, padding: 2.5, flexShrink: 0, alignItems: "center", justifyContent: "center" },
  scoreInner: { width: 71, height: 71, borderRadius: 35.5, alignItems: "center", justifyContent: "center", flexDirection: "row", alignItems: "baseline" as any },
  scoreNum: { fontSize: 26, fontFamily: "Inter_700Bold", lineHeight: 32 },
  scorePct: { fontSize: 13, fontFamily: "Inter_700Bold", marginLeft: 1 },
  scoreMeta: { flex: 1, gap: 7 },
  scoreTitle: { fontSize: 16, fontFamily: "Inter_700Bold" },
  scoreLabelBadge: { alignSelf: "flex-start", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 100, borderWidth: 1 },
  scoreLabelText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.3 },
  noScoreText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  scoreBar: { height: 5, borderRadius: 3, overflow: "hidden" },
  scoreBarFill: { height: "100%", borderRadius: 3 },
  manipBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    borderRadius: 12, padding: 11, borderWidth: 1,
  },
  manipText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  statsGrid: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1, borderRadius: 12, padding: 10, alignItems: "center",
    gap: 3, borderWidth: 1,
  },
  statNum: { fontSize: 15, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 9, fontFamily: "Inter_500Medium", textAlign: "center" },
  breakdown: { gap: 8 },
  breakdownItem: { gap: 5 },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  breakdownDot: { width: 6, height: 6, borderRadius: 3 },
  breakdownLabel: { fontSize: 12, fontFamily: "Inter_500Medium", flex: 1 },
  breakdownCount: { fontSize: 11, fontFamily: "Inter_700Bold" },
  breakdownBar: { height: 4, borderRadius: 2, overflow: "hidden" },
  breakdownBarFill: { height: "100%", borderRadius: 2 },
});
