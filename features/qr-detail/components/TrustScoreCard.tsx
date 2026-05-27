import React, { useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  withDelay,
  Easing,
  FadeInDown,
} from "react-native-reanimated";
import { formatCompactNumber } from "@/shared/utils/number-format";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { REPORT_TYPES } from "@/features/qr-detail/data/reportTypes";
import { styles } from "./trust-score-card-styles";

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

  const total = REPORT_TYPES.reduce((sum, r) => sum + (reportCounts[r.key] || 0), 0);
  const hasScore = trustInfo.score >= 0;
  const scoreGradient = hasScore ? getScoreGradient(trustInfo.score, colors) : [colors.textMuted, colors.surfaceBorder] as [string, string];

  const votedTypes = REPORT_TYPES.filter((r) => (reportCounts[r.key] || 0) > 0);

  const barProgress = useSharedValue(0);
  useEffect(() => {
    if (hasScore) {
      barProgress.value = withDelay(
        200,
        withTiming(Math.min(100, trustInfo.score) / 100, {
          duration: 900,
          easing: Easing.out(Easing.cubic),
        })
      );
    }
  }, [trustInfo.score, hasScore]);

  const animatedBarStyle = useAnimatedStyle(() => ({
    width: `${barProgress.value * 100}%` as any,
  }));

  const breakdownProgress = useSharedValue(0);
  useEffect(() => {
    breakdownProgress.value = 0;
    breakdownProgress.value = withDelay(
      350,
      withTiming(1, { duration: 700, easing: Easing.out(Easing.cubic) })
    );
  }, [total]);

  const STATS = [
    { icon: "scan-outline" as const,   label: "Scans",     value: totalScans },
    { icon: "people-outline" as const, label: "Followers", value: followCount, onPress: isQrOwner ? onOpenFollowers : undefined },
    { icon: "flag-outline" as const,   label: "Votes",     value: total },
  ];

  return (
    <Animated.View
      entering={FadeInDown.duration(260)}
      style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
    >
      {/* Score hero */}
      <View style={styles.scoreHero}>
        <Animated.View entering={FadeInDown.delay(40).duration(260)} style={styles.scoreRingWrap}>
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
        </Animated.View>

        <Animated.View entering={FadeInDown.delay(50).duration(260)} style={styles.scoreMeta}>
          <Text style={[styles.scoreTitle, { color: colors.text }]} maxFontSizeMultiplier={1}>Trust Score</Text>

          {hasScore ? (
            <>
              <View style={[styles.scoreLabelBadge, { backgroundColor: scoreGradient[0] + (isDark ? "22" : "14"), borderColor: scoreGradient[0] + "35" }]}>
                <Text style={[styles.scoreLabelText, { color: scoreGradient[0] }]} maxFontSizeMultiplier={1}>
                  {trustInfo.label}
                </Text>
              </View>
              <View style={[styles.scoreBar, { backgroundColor: isDark ? colors.surfaceLight : colors.background }]}>
                <Animated.View style={[styles.scoreBarFillBase, animatedBarStyle]}>
                  <LinearGradient
                    colors={scoreGradient}
                    style={StyleSheet.absoluteFill}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                  />
                </Animated.View>
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
        </Animated.View>
      </View>

      {manipulationWarning && (
        <Animated.View entering={FadeInDown.delay(50).duration(260)} style={[styles.manipBanner, { backgroundColor: colors.warningDim, borderColor: colors.warning + "40" }]}>
          <Ionicons name="alert-circle" size={13} color={colors.warning} />
          <Text style={[styles.manipText, { color: colors.warning }]}>
            Unusual voting activity detected — score may not reflect real opinion.
          </Text>
        </Animated.View>
      )}

      {scanCountFrozen && (
        <Animated.View entering={FadeInDown.delay(50).duration(260)} style={[styles.manipBanner, { backgroundColor: colors.dangerDim, borderColor: colors.danger + "40" }]}>
          <Ionicons name="lock-closed" size={13} color={colors.danger} />
          <Text style={[styles.manipText, { color: colors.danger }]}>
            Scan count is temporarily frozen — abnormal activity detected and flagged for review.
          </Text>
        </Animated.View>
      )}

      <Animated.View entering={FadeInDown.delay(70).duration(260)} style={[styles.statsGrid, { borderColor: colors.surfaceBorder }]}>
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
      </Animated.View>

      {votedTypes.length > 0 && (
        <Animated.View entering={FadeInDown.delay(80).duration(260)} style={[styles.voteBreakdown, { borderTopColor: colors.surfaceBorder }]}>
          <Text style={[styles.breakdownTitle, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
            COMMUNITY VOTES
          </Text>
          <View style={styles.breakdownRows}>
            {votedTypes.map((rt, idx) => {
              const count = reportCounts[rt.key] || 0;
              const pct = Math.round((count / total) * 100);
              return (
                <Animated.View key={rt.key} entering={FadeInDown.delay(40 + Math.min(idx, 3) * 20).duration(260)} style={styles.breakdownRow}>
                  <View style={styles.breakdownLabelRow}>
                    <Ionicons name={rt.outlineIcon as any} size={12} color={rt.color(colors)} />
                    <Text style={[styles.breakdownLabel, { color: colors.textSecondary }]} maxFontSizeMultiplier={1}>
                      {rt.label}
                    </Text>
                    <Text style={[styles.breakdownPct, { color: rt.color(colors) }]} maxFontSizeMultiplier={1}>
                      {count} {count === 1 ? "person" : "people"}
                    </Text>
                  </View>
                  <View style={[styles.barTrack, { backgroundColor: isDark ? colors.surfaceLight : colors.background }]}>
                    <BreakdownBar pct={pct} color={rt.color(colors)} />
                  </View>
                </Animated.View>
              );
            })}
          </View>
        </Animated.View>
      )}
    </Animated.View>
  );
});

function BreakdownBar({ pct, color }: { pct: number; color: string }) {
  const progress = useSharedValue(0);
  useEffect(() => {
    progress.value = withDelay(400, withTiming(pct / 100, { duration: 700, easing: Easing.out(Easing.cubic) }));
  }, [pct]);
  const animStyle = useAnimatedStyle(() => ({ width: `${progress.value * 100}%` as any }));
  return <Animated.View style={[styles.barFill, { backgroundColor: color }, animStyle]} />;
}

export default TrustScoreCard;
