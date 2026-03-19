import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { formatCompactNumber } from "@/lib/number-format";
import Colors from "@/constants/colors";

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

const REPORT_TYPES = [
  { key: "safe", label: "Safe", icon: "shield-checkmark", color: Colors.dark.safe, bg: Colors.dark.safeDim },
  { key: "scam", label: "Scam", icon: "warning", color: Colors.dark.danger, bg: Colors.dark.dangerDim },
  { key: "fake", label: "Fake", icon: "close-circle", color: Colors.dark.warning, bg: Colors.dark.warningDim },
  { key: "spam", label: "Spam", icon: "mail-unread", color: Colors.dark.accent, bg: Colors.dark.accentDim },
];

const TrustScoreCard = React.memo(function TrustScoreCard({
  trustInfo,
  reportCounts,
  totalScans,
  totalComments,
  isQrOwner,
  followCount,
  onOpenFollowers,
  manipulationWarning,
}: Props) {
  const total = REPORT_TYPES.reduce((sum, r) => sum + (reportCounts[r.key] || 0), 0);

  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>Community Trust Score</Text>
        {trustInfo.score >= 0 ? (
          <View style={[styles.scoreBadge, { backgroundColor: trustInfo.color + "22", borderColor: trustInfo.color + "60" }]}>
            <Text style={[styles.scoreBadgeText, { color: trustInfo.color }]}>{trustInfo.label}</Text>
          </View>
        ) : null}
      </View>

      {manipulationWarning ? (
        <View style={styles.manipulationBanner}>
          <Ionicons name="alert-circle" size={14} color={Colors.dark.warning} />
          <Text style={styles.manipulationText}>
            Unusual voting activity detected. Score may not reflect genuine community opinion.
          </Text>
        </View>
      ) : null}

      {trustInfo.score >= 0 ? (
        <View style={styles.scoreBarWrap}>
          <View style={styles.scoreBarBg}>
            <View style={[styles.scoreBarFill, { width: `${Math.min(100, trustInfo.score)}%`, backgroundColor: trustInfo.color }]} />
          </View>
          <Text style={[styles.scoreNum, { color: trustInfo.color }]}>{Math.round(trustInfo.score)}%</Text>
        </View>
      ) : (
        <Text style={styles.noReportsText}>No community reports yet</Text>
      )}

      <View style={styles.statsRow}>
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{formatCompactNumber(totalScans)}</Text>
          <Text style={styles.statLabel}>Scans</Text>
        </View>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{formatCompactNumber(totalComments)}</Text>
          <Text style={styles.statLabel}>Comments</Text>
        </View>
        <View style={styles.statDivider} />
        <Pressable style={styles.statItem} onPress={isQrOwner ? onOpenFollowers : undefined}>
          <Text style={styles.statNum}>{formatCompactNumber(followCount)}</Text>
          <Text style={[styles.statLabel, isQrOwner && { color: Colors.dark.primary }]}>
            {isQrOwner ? "Followers ›" : "Followers"}
          </Text>
        </Pressable>
        <View style={styles.statDivider} />
        <View style={styles.statItem}>
          <Text style={styles.statNum}>{formatCompactNumber(total)}</Text>
          <Text style={styles.statLabel}>Reports</Text>
        </View>
      </View>

      {total > 0 ? (
        <View style={styles.reportBreakdown}>
          {REPORT_TYPES.map((r) => {
            const count = reportCounts[r.key] || 0;
            if (count === 0) return null;
            return (
              <View key={r.key} style={[styles.reportChip, { backgroundColor: r.bg }]}>
                <Ionicons name={r.icon as any} size={12} color={r.color} />
                <Text style={[styles.reportChipText, { color: r.color }]}>{count} {r.label}</Text>
              </View>
            );
          })}
        </View>
      ) : null}
    </View>
  );
});

export default TrustScoreCard;

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.dark.surface, borderRadius: 16, padding: 18,
    marginBottom: 16, borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  cardHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 12 },
  cardTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  scoreBadge: {
    paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10,
    borderWidth: 1,
  },
  scoreBadgeText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  scoreBarWrap: { flexDirection: "row", alignItems: "center", gap: 10, marginBottom: 16 },
  scoreBarBg: { flex: 1, height: 6, borderRadius: 3, backgroundColor: Colors.dark.surfaceLight },
  scoreBarFill: { height: "100%", borderRadius: 3 },
  scoreNum: { fontSize: 13, fontFamily: "Inter_700Bold", minWidth: 38, textAlign: "right" },
  noReportsText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted, marginBottom: 16 },
  statsRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-around" },
  statItem: { alignItems: "center", gap: 2, flex: 1 },
  statNum: { fontSize: 17, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  statLabel: { fontSize: 11, fontFamily: "Inter_400Regular", color: Colors.dark.textMuted },
  statDivider: { width: 1, height: 32, backgroundColor: Colors.dark.surfaceBorder },
  reportBreakdown: { flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 14 },
  reportChip: {
    flexDirection: "row", alignItems: "center", gap: 5,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20,
  },
  reportChipText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
  manipulationBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 8, marginBottom: 12,
    backgroundColor: Colors.dark.warningDim, borderRadius: 10, padding: 10,
    borderWidth: 1, borderColor: Colors.dark.warning + "40",
  },
  manipulationText: {
    fontSize: 12, fontFamily: "Inter_400Regular",
    color: Colors.dark.warning, flex: 1, lineHeight: 17,
  },
});
