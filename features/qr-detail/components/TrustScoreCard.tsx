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

function getScoreGradient(score: number, color: string): [string, string] {
  if (score >= 75) return ["#10B981", "#06B6D4"];
  if (score >= 50) return ["#F59E0B", "#F97316"];
  if (score >= 25) return ["#F97316", "#EF4444"];
  return ["#EF4444", "#DC2626"];
}

const TrustScoreCard = React.memo(function TrustScoreCard({
  trustInfo, reportCounts, totalScans, totalComments,
  isQrOwner, followCount, onOpenFollowers, manipulationWarning,
}: Props) {
  const { colors, isDark } = useTheme();

  const REPORT_TYPES = [
    { key: "safe", label: "Safe",  icon: "shield-checkmark" as const, gradient: ["#10B981", "#06B6D4"] as [string, string] },
    { key: "scam", label: "Scam",  icon: "warning" as const,          gradient: ["#EF4444", "#DC2626"] as [string, string] },
    { key: "fake", label: "Fake",  icon: "close-circle" as const,     gradient: ["#F59E0B", "#F97316"] as [string, string] },
    { key: "spam", label: "Spam",  icon: "mail-unread" as const,      gradient: ["#8B5CF6", "#EC4899"] as [string, string] },
  ];

  const total = REPORT_TYPES.reduce((sum, r) => sum + (reportCounts[r.key] || 0), 0);
  const hasScore = trustInfo.score >= 0;
  const scoreGradient = hasScore ? getScoreGradient(trustInfo.score, trustInfo.color) : ["#6B7280", "#9CA3AF"] as [string, string];

  const STATS = [
    { icon: "scan-outline" as const,    label: "Scans",     value: totalScans,    gradient: ["#006FFF", "#00CFFF"] as [string, string], onPress: undefined },
    { icon: "chatbubbles-outline" as const, label: "Comments", value: totalComments, gradient: ["#8B5CF6", "#EC4899"] as [string, string], onPress: undefined },
    { icon: "people-outline" as const,  label: isQrOwner ? "Followers ›" : "Followers", value: followCount, gradient: ["#10B981", "#06B6D4"] as [string, string], onPress: isQrOwner ? onOpenFollowers : undefined },
    { icon: "flag-outline" as const,    label: "Reports",   value: total,         gradient: ["#F59E0B", "#F97316"] as [string, string], onPress: undefined },
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
              <Ionicons name="help-outline" size={28} color={colors.textMuted} />
            )}
          </View>
        </LinearGradient>
        <View style={styles.scoreMeta}>
          <Text style={[styles.scoreTitle, { color: colors.text }]}>Community Trust</Text>
          {hasScore ? (
            <LinearGradient colors={scoreGradient} style={styles.scoreLabelBadge} start={{ x: 0, y: 0 }} end={{ x: 1, y: 0 }}>
              <Text style={styles.scoreLabelText}>{trustInfo.label}</Text>
            </LinearGradient>
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
          <Ionicons name="alert-circle" size={15} color={colors.warning} />
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
              pressed && s.onPress && { opacity: 0.75 },
            ]}
          >
            <LinearGradient colors={s.gradient} style={styles.statIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Ionicons name={s.icon} size={14} color="#fff" />
            </LinearGradient>
            <Text style={[styles.statNum, { color: colors.text }]}>{formatCompactNumber(s.value)}</Text>
            <Text style={[styles.statLabel, { color: s.onPress ? s.gradient[0] : colors.textMuted }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>{s.label}</Text>
          </Pressable>
        ))}
      </View>

      {/* Report breakdown */}
      {total > 0 && (
        <View style={styles.breakdown}>
          {REPORT_TYPES.map((r) => {
            const count = reportCounts[r.key] || 0;
            if (count === 0) return null;
            const pct = Math.round((count / total) * 100);
            return (
              <View key={r.key} style={styles.breakdownItem}>
                <View style={styles.breakdownRow}>
                  <LinearGradient colors={r.gradient} style={styles.breakdownIcon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
                    <Ionicons name={r.icon} size={10} color="#fff" />
                  </LinearGradient>
                  <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]}>{r.label}</Text>
                  <Text style={[styles.breakdownCount, { color: r.gradient[0] }]}>{count}</Text>
                </View>
                <View style={[styles.breakdownBar, { backgroundColor: colors.surfaceLight }]}>
                  <LinearGradient
                    colors={r.gradient}
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
  card: { borderRadius: 24, padding: 20, marginBottom: 16, borderWidth: 1, gap: 18 },
  scoreHero: { flexDirection: "row", alignItems: "center", gap: 18 },
  scoreRing: { width: 88, height: 88, borderRadius: 44, padding: 3, flexShrink: 0, alignItems: "center", justifyContent: "center" },
  scoreInner: { width: 82, height: 82, borderRadius: 41, alignItems: "center", justifyContent: "center", flexDirection: "row", alignItems: "baseline" as any },
  scoreNum: { fontSize: 28, fontFamily: "Inter_700Bold", lineHeight: 34 },
  scorePct: { fontSize: 14, fontFamily: "Inter_700Bold", marginLeft: 1 },
  scoreMeta: { flex: 1, gap: 8 },
  scoreTitle: { fontSize: 18, fontFamily: "Inter_700Bold" },
  scoreLabelBadge: { alignSelf: "flex-start", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 100 },
  scoreLabelText: { fontSize: 11, fontFamily: "Inter_700Bold", color: "#fff", letterSpacing: 0.5 },
  noScoreText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  scoreBar: { height: 6, borderRadius: 3, overflow: "hidden" },
  scoreBarFill: { height: "100%", borderRadius: 3 },
  manipBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderRadius: 14, padding: 12, borderWidth: 1,
  },
  manipText: { flex: 1, fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 17 },
  statsGrid: { flexDirection: "row", gap: 8 },
  statCard: {
    flex: 1, borderRadius: 16, padding: 12, alignItems: "center",
    gap: 5, borderWidth: 1,
  },
  statIcon: { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  statNum: { fontSize: 16, fontFamily: "Inter_700Bold" },
  statLabel: { fontSize: 9, fontFamily: "Inter_600SemiBold", textAlign: "center" },
  breakdown: { gap: 10 },
  breakdownItem: { gap: 5 },
  breakdownRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  breakdownIcon: { width: 20, height: 20, borderRadius: 6, alignItems: "center", justifyContent: "center" },
  breakdownLabel: { flex: 1, fontSize: 12, fontFamily: "Inter_500Medium" },
  breakdownCount: { fontSize: 12, fontFamily: "Inter_700Bold" },
  breakdownBar: { height: 5, borderRadius: 3, overflow: "hidden" },
  breakdownBarFill: { height: "100%", borderRadius: 3 },
});
