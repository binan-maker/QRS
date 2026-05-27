import { useState, useEffect, useCallback } from "react";
import {
  View, Text, ScrollView, Pressable, ActivityIndicator,
  StyleSheet, useWindowDimensions, RefreshControl,
} from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import Svg, { Rect, Text as SvgText, G } from "react-native-svg";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useTopInset } from "@/shared/utils/platform";
import { useScaleFns } from "@/shared/utils/use-scale";
import { useAuth } from "@/shared/contexts/AuthContext";
import { getGeneratedQrById, type GeneratedQrItem } from "@/services/generator-service";
import { getQrFollowCount } from "@/lib/firestore-service";
import { getDetailDisplayTitle } from "@/services/qr-display-utils";
import { getQrAnalyticsSummary, type QrAnalyticsSummary } from "@/services/qr-detail-service";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatDate(iso: string | number | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso as any).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return "—"; }
}

function daysSince(iso: string | number | undefined): number {
  if (!iso) return 0;
  try {
    const ms = Date.now() - new Date(iso as any).getTime();
    return Math.max(1, Math.floor(ms / (1000 * 60 * 60 * 24)));
  } catch { return 0; }
}

function formatNumber(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(n);
}

function pct(part: number, total: number): number {
  if (total === 0) return 0;
  return Math.round((part / total) * 100);
}

function ScanBarChart({ data, color, chartWidth }: { data: number[]; color: string; chartWidth: number }) {
  const reversed = [...data].reverse();
  const maxVal = Math.max(...reversed, 1);
  const today = new Date().getDay();
  const n = reversed.length;
  const gap = 6;
  const barW = Math.floor((chartWidth - gap * (n - 1)) / n);
  const chartH = 90;

  return (
    <Svg width={chartWidth} height={chartH + 22}>
      {reversed.map((val, i) => {
        const barH = Math.max(3, Math.round((val / maxVal) * chartH));
        const x = i * (barW + gap);
        const y = chartH - barH;
        const dayOffset = n - 1 - i;
        const dayLabel = DAY_LABELS[(today - dayOffset + 7) % 7].slice(0, 1);
        const isToday = i === n - 1;
        return (
          <G key={i}>
            <Rect
              x={x} y={y} width={barW} height={barH}
              rx={4}
              fill={color}
              opacity={isToday ? 1 : 0.38}
            />
            <SvgText
              x={x + barW / 2} y={chartH + 16}
              fontSize={10} fill={color}
              textAnchor="middle"
              opacity={isToday ? 1 : 0.5}
            >
              {dayLabel}
            </SvgText>
          </G>
        );
      })}
    </Svg>
  );
}

function HorizontalBar({ label, value, total, color }: { label: string; value: number; total: number; color: string }) {
  const p = pct(value, total);
  return (
    <View style={{ gap: 4, marginBottom: 10 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between" }}>
        <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color }}>{label}</Text>
        <Text style={{ fontSize: 12, fontFamily: "Inter_600SemiBold", color }}>{formatNumber(value)} ({p}%)</Text>
      </View>
      <View style={{ height: 6, borderRadius: 3, backgroundColor: color + "22", overflow: "hidden" }}>
        <View style={{ width: `${p}%`, height: "100%", backgroundColor: color, borderRadius: 3 }} />
      </View>
    </View>
  );
}

export default function MyQrAnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { rf, sp } = useScaleFns();
  const topInset = useTopInset();
  const { user } = useAuth();
  const { width: screenWidth } = useWindowDimensions();
  const chartWidth = screenWidth - sp(40) - 32;

  const [qrItem, setQrItem] = useState<GeneratedQrItem | null>(null);
  const [followCount, setFollowCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [analytics, setAnalytics] = useState<QrAnalyticsSummary | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async (silent = false) => {
    if (!id || !user?.id) { setLoading(false); return; }
    if (!silent) setLoading(true);
    try {
      const item = await getGeneratedQrById(user.id, id as string);
      setQrItem(item);
      if (item?.qrCodeId) {
        setAnalyticsLoading(true);
        getQrFollowCount(item.qrCodeId).then(setFollowCount).catch(() => {});
        getQrAnalyticsSummary(item.qrCodeId, user.id)
          .then(setAnalytics)
          .catch(() => {})
          .finally(() => setAnalyticsLoading(false));
      }
    } catch {} finally { setLoading(false); }
  }, [id, user?.id]);

  useEffect(() => { loadData(); }, [loadData]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadData(true);
    setRefreshing(false);
  }, [loadData]);

  const NavBar = () => (
    <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: sp(20), paddingTop: sp(6), paddingBottom: sp(10) }}>
      <Pressable
        onPress={() => router.back()}
        style={({ pressed }) => ({
          width: sp(38), height: sp(38), borderRadius: sp(19),
          borderWidth: 1, borderColor: colors.surfaceBorder,
          backgroundColor: colors.surface,
          alignItems: "center", justifyContent: "center",
          opacity: pressed ? 0.7 : 1,
        })}
      >
        <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
      </Pressable>
      <View style={{ alignItems: "center" }}>
        <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: colors.text }}>Analytics</Text>
        <Text style={{ fontSize: rf(10), fontFamily: "Inter_500Medium", color: colors.textMuted, marginTop: sp(1) }}>QR Performance</Text>
      </View>
      <View style={{ width: sp(38) }} />
    </View>
  );

  if (loading) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background, alignItems: "center", justifyContent: "center" }}>
        <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!qrItem) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />
        <View style={{ paddingTop: topInset }}><NavBar /></View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: sp(10) }}>
          <Ionicons name="bar-chart-outline" size={rf(44)} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: rf(14), fontFamily: "Inter_500Medium" }}>QR code not found</Text>
        </View>
      </View>
    );
  }

  const displayTitle = getDetailDisplayTitle(qrItem as any);
  const isGuardQr  = !!(qrItem as any)?.guardUuid;
  const isStandardQr = !isGuardQr && ((qrItem?.content || "").includes("/go/"));
  const isDynamic  = isGuardQr || isStandardQr;
  const isActive   = qrItem?.isActive !== false;
  const primaryColor = isGuardQr ? colors.primary : isStandardQr ? "#22c55e" : colors.textSecondary;

  const scanCount    = analytics?.totalScans ?? (qrItem?.scanCount ?? 0);
  const scans7d      = analytics?.scans7d ?? 0;
  const scans30d     = analytics?.scans30d ?? 0;
  const commentCount = qrItem?.commentCount ?? 0;
  const createdAt    = (qrItem as any)?.createdAt;
  const updatedAt    = (qrItem as any)?.updatedAt;
  const ageInDays    = daysSince(createdAt);
  const avgScansPerDay = ageInDays > 0 ? (scanCount / ageInDays).toFixed(1) : "0";

  const trend7d       = analytics?.trend7d ?? new Array(7).fill(0);
  const platforms     = analytics?.platformBreakdown ?? { android: 0, ios: 0, web: 0, unknown: 0 };
  const verdicts      = analytics?.verdictBreakdown  ?? { safe: 0, flagged: 0, unknown: 0 };
  const totalEvents   = analytics?.totalScans ?? 0;
  const totalVerdicts = verdicts.safe + verdicts.flagged + verdicts.unknown;

  const topStats = [
    { icon: "scan-outline" as const,        label: "All time",  value: formatNumber(scanCount),   color: colors.primary },
    { icon: "today-outline" as const,       label: "Last 7d",   value: formatNumber(scans7d),     color: "#6366f1" },
    { icon: "calendar-outline" as const,    label: "Last 30d",  value: formatNumber(scans30d),    color: "#a855f7" },
    { icon: "trending-up-outline" as const, label: "Scans/day", value: avgScansPerDay,            color: "#22c55e" },
    { icon: "people-outline" as const,      label: "Followers", value: formatNumber(followCount), color: "#f59e0b" },
    { icon: "chatbubble-outline" as const,  label: "Comments",  value: formatNumber(commentCount),color: "#ef4444" },
  ];

  const InfoRow = ({ icon, label, value, color }: { icon: any; label: string; value: string; color?: string }) => (
    <View style={{ flexDirection: "row", alignItems: "center", gap: sp(12), paddingHorizontal: sp(16), paddingVertical: sp(13), borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surfaceBorder }}>
      <View style={{ width: sp(28), height: sp(28), borderRadius: sp(8), backgroundColor: (color || colors.primary) + "18", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
        <Ionicons name={icon} size={rf(14)} color={color || colors.textSecondary} />
      </View>
      <Text style={{ fontSize: rf(12), fontFamily: "Inter_500Medium", color: colors.textSecondary, width: sp(110), flexShrink: 0 }}>{label}</Text>
      <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.text, flex: 1, textAlign: "right" }} numberOfLines={1}>{value}</Text>
    </View>
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />

      <View style={{ paddingTop: topInset }}><NavBar /></View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: sp(20), paddingBottom: insets.bottom + sp(100) }}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        {/* ── HERO ── */}
        <Animated.View entering={FadeIn.duration(160)} style={{ marginBottom: sp(18) }}>
          <View style={{ borderRadius: sp(20), borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, padding: sp(18), overflow: "hidden" }}>
            <LinearGradient
              colors={[primaryColor + "22", primaryColor + "06"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: sp(14) }}>
              <View style={{ width: sp(50), height: sp(50), borderRadius: sp(15), borderWidth: 1, borderColor: primaryColor + "40", backgroundColor: primaryColor + "20", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ionicons name="bar-chart" size={rf(24)} color={primaryColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: rf(15), fontFamily: "Inter_700Bold", color: colors.text, lineHeight: rf(22) }} numberOfLines={2}>
                  {displayTitle}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6), marginTop: sp(6), flexWrap: "wrap" }}>
                  <View style={{ paddingHorizontal: sp(8), paddingVertical: sp(3), borderRadius: sp(100), borderWidth: 1, backgroundColor: primaryColor + "20", borderColor: primaryColor + "40" }}>
                    <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: primaryColor }}>
                      {isDynamic ? (isGuardQr ? "Guard Link" : "Standard Link") : "Static QR"}
                    </Text>
                  </View>
                  <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: sp(8), paddingVertical: sp(3), borderRadius: sp(100), borderWidth: 1, backgroundColor: isActive ? colors.safe + "20" : colors.danger + "20", borderColor: isActive ? colors.safe + "40" : colors.danger + "40" }}>
                    <View style={{ width: sp(5), height: sp(5), borderRadius: sp(3), backgroundColor: isActive ? colors.safe : colors.danger, marginRight: sp(4) }} />
                    <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: isActive ? colors.safe : colors.danger }}>
                      {isActive ? "Active" : "Paused"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* ── TOP STATS GRID ── */}
        <Animated.View entering={FadeInDown.duration(160)} style={{ marginBottom: sp(18) }}>
          <Text style={[sectionLabel, { color: colors.textMuted, marginBottom: sp(10) }]}>Performance Overview</Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(10) }}>
            {topStats.map((stat) => (
              <View key={stat.label} style={{ width: "30.5%", minWidth: sp(90), borderRadius: sp(14), borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, padding: sp(12), alignItems: "center", gap: sp(4) }}>
                <View style={{ width: sp(32), height: sp(32), borderRadius: sp(9), backgroundColor: stat.color + "18", alignItems: "center", justifyContent: "center" }}>
                  <Ionicons name={stat.icon} size={rf(15)} color={stat.color} />
                </View>
                <Text style={{ fontSize: rf(18), fontFamily: "Inter_800ExtraBold", color: colors.text }}>{stat.value}</Text>
                <Text style={{ fontSize: rf(9), fontFamily: "Inter_400Regular", color: colors.textMuted, textAlign: "center" }}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── 7-DAY TREND ── */}
        <Animated.View entering={FadeInDown.duration(165)} style={{ marginBottom: sp(18) }}>
          <Text style={[sectionLabel, { color: colors.textMuted, marginBottom: sp(10) }]}>7-Day Scan Trend</Text>
          <View style={{ borderRadius: sp(16), borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, padding: sp(16) }}>
            {analyticsLoading ? (
              <View style={{ height: 112, alignItems: "center", justifyContent: "center" }}>
                <ActivityIndicator size="small" color={colors.primary} />
              </View>
            ) : (
              <>
                <View style={{ flexDirection: "row", justifyContent: "space-between", marginBottom: sp(12) }}>
                  <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: colors.text }}>
                    {scans7d} scan{scans7d !== 1 ? "s" : ""}
                  </Text>
                  <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted }}>Past 7 days</Text>
                </View>
                <ScanBarChart data={trend7d} color={colors.primary} chartWidth={chartWidth} />
              </>
            )}
          </View>
        </Animated.View>

        {/* ── PLATFORM BREAKDOWN ── */}
        {totalEvents > 0 && (
          <Animated.View entering={FadeInDown.duration(170)} style={{ marginBottom: sp(18) }}>
            <Text style={[sectionLabel, { color: colors.textMuted, marginBottom: sp(10) }]}>Platform Breakdown</Text>
            <View style={{ borderRadius: sp(16), borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, padding: sp(16) }}>
              <HorizontalBar label="Android" value={platforms.android} total={totalEvents} color="#22c55e" />
              <HorizontalBar label="iOS"     value={platforms.ios}     total={totalEvents} color="#6366f1" />
              <HorizontalBar label="Web"     value={platforms.web}     total={totalEvents} color="#f59e0b" />
              {platforms.unknown > 0 && (
                <HorizontalBar label="Unknown" value={platforms.unknown} total={totalEvents} color={colors.textMuted} />
              )}
            </View>
          </Animated.View>
        )}

        {/* ── SAFETY VERDICT ── */}
        {totalVerdicts > 0 && (
          <Animated.View entering={FadeInDown.duration(175)} style={{ marginBottom: sp(18) }}>
            <Text style={[sectionLabel, { color: colors.textMuted, marginBottom: sp(10) }]}>Safety Verdict Breakdown</Text>
            <View style={{ borderRadius: sp(16), borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, padding: sp(16) }}>
              <HorizontalBar label="Safe"    value={verdicts.safe}    total={totalVerdicts} color={colors.safe} />
              <HorizontalBar label="Flagged" value={verdicts.flagged} total={totalVerdicts} color={colors.danger} />
              {verdicts.unknown > 0 && (
                <HorizontalBar label="Unknown" value={verdicts.unknown} total={totalVerdicts} color={colors.textMuted} />
              )}
            </View>
          </Animated.View>
        )}

        {/* ── LIFECYCLE ── */}
        <Animated.View entering={FadeInDown.duration(180)} style={{ marginBottom: sp(18) }}>
          <Text style={[sectionLabel, { color: colors.textMuted, marginBottom: sp(10) }]}>QR Lifecycle</Text>
          <View style={{ borderRadius: sp(16), borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, overflow: "hidden" }}>
            <InfoRow icon="calendar-outline"         label="Created"      value={formatDate(createdAt)} />
            <InfoRow icon="hourglass-outline"        label="Age"          value={ageInDays === 1 ? "1 day" : `${ageInDays} days`} />
            <InfoRow icon="flash-outline"            label="Type"         value={isDynamic ? "Dynamic" : "Static QR"} />
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(12), paddingHorizontal: sp(16), paddingVertical: sp(13) }}>
              <View style={{ width: sp(28), height: sp(28), borderRadius: sp(8), backgroundColor: (isActive ? colors.safe : colors.danger) + "18", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <Ionicons name={isActive ? "checkmark-circle-outline" : "pause-circle-outline"} size={rf(14)} color={isActive ? colors.safe : colors.danger} />
              </View>
              <Text style={{ fontSize: rf(12), fontFamily: "Inter_500Medium", color: colors.textSecondary, width: sp(110), flexShrink: 0 }}>Status</Text>
              <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: isActive ? colors.safe : colors.danger, flex: 1, textAlign: "right" }}>
                {isActive ? "Active" : "Paused"}
              </Text>
            </View>
          </View>
        </Animated.View>

        {/* ── IDENTIFIERS ── */}
        {qrItem.qrCodeId && (
          <Animated.View entering={FadeInDown.duration(185)} style={{ marginBottom: sp(18) }}>
            <Text style={[sectionLabel, { color: colors.textMuted, marginBottom: sp(10) }]}>Identifiers</Text>
            <View style={{ borderRadius: sp(16), borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, overflow: "hidden" }}>
              <InfoRow icon="key-outline" label="QR Code ID" value={qrItem.qrCodeId.slice(0, 20) + "…"} />
              {(qrItem as any).guardUuid && (
                <InfoRow icon="shield-outline" label="Guard UUID" value={(qrItem as any).guardUuid} color={colors.primary} />
              )}
            </View>
          </Animated.View>
        )}

        {/* ── INFO NOTE ── */}
        <Animated.View entering={FadeInDown.duration(190)} style={{ marginBottom: sp(8) }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: sp(10), borderRadius: sp(14), borderWidth: 1, borderColor: colors.primary + "30", backgroundColor: colors.primaryDim, padding: sp(14) }}>
            <Ionicons name="information-circle-outline" size={rf(16)} color={colors.primary} />
            <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textSecondary, flex: 1, lineHeight: rf(17) }}>
              Scan events are anonymous — no personal data is collected. Pull down to refresh. Data updates within a few seconds of each scan.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const sectionLabel: any = {
  fontSize: 11,
  fontFamily: "Inter_600SemiBold",
  letterSpacing: 0.8,
  textTransform: "uppercase",
};
