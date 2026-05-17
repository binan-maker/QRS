import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/contexts/ThemeContext";
import { useTopInset } from "@/lib/utils/platform";
import { useScaleFns } from "@/lib/utils/use-scale";
import { useAuth } from "@/contexts/AuthContext";
import { getGeneratedQrById, type GeneratedQrItem } from "@/lib/services/generator-service";
import { getQrFollowCount } from "@/lib/firestore-service";

function formatDate(iso: string | number | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso as any).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  } catch { return "—"; }
}

function formatDateTime(iso: string | number | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso as any).toLocaleString("en-US", {
      month: "short", day: "numeric", year: "numeric",
      hour: "numeric", minute: "2-digit",
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

export default function MyQrAnalyticsScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { rf, sp } = useScaleFns();
  const topInset = useTopInset();
  const { user } = useAuth();

  const [qrItem, setQrItem] = useState<GeneratedQrItem | null>(null);
  const [followCount, setFollowCount] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    if (!user?.id) { setLoading(false); return; }
    getGeneratedQrById(user.id, id as string).then((item) => {
      setQrItem(item);
    }).catch(() => {}).finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    if (!qrItem?.qrCodeId) return;
    getQrFollowCount(qrItem.qrCodeId).then(setFollowCount).catch(() => {});
  }, [qrItem?.qrCodeId]);

  const scanCount = qrItem?.scanCount ?? 0;
  const commentCount = qrItem?.commentCount ?? 0;
  const createdAt = (qrItem as any)?.createdAt;
  const updatedAt = (qrItem as any)?.updatedAt;
  const ageInDays = daysSince(createdAt);
  const avgScansPerDay = ageInDays > 0 ? (scanCount / ageInDays).toFixed(1) : "0";
  const isActive = qrItem?.isActive !== false;
  const isGuardQr = !!(qrItem as any)?.guardUuid;
  const isStandardQr = !isGuardQr && ((qrItem?.content || "").includes("/go/"));
  const isDynamic = isGuardQr || isStandardQr;

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
        <View style={{ paddingTop: topInset }}>
          <View style={styles.navBar}>
            <Pressable onPress={() => router.back()} style={styles.backBtn}>
              <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
            </Pressable>
            <Text style={[styles.navTitle, { color: colors.text, fontSize: rf(16) }]}>Analytics</Text>
            <View style={{ width: sp(38) }} />
          </View>
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>
          <Ionicons name="bar-chart-outline" size={48} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: rf(14), fontFamily: "Inter_500Medium", marginTop: 12 }}>QR code not found</Text>
        </View>
      </View>
    );
  }

  const primaryColor = isGuardQr ? colors.primary : isStandardQr ? "#22c55e" : colors.textSecondary;

  const topStats = [
    { icon: "scan-outline" as const,      label: "Total Scans",     value: String(scanCount),       color: colors.primary },
    { icon: "people-outline" as const,    label: "Followers",       value: String(followCount),     color: "#a855f7" },
    { icon: "chatbubble-outline" as const, label: "Comments",       value: String(commentCount),    color: "#f59e0b" },
    { icon: "trending-up-outline" as const, label: "Scans / Day",   value: avgScansPerDay,          color: "#22c55e" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />

      {/* Nav bar */}
      <View style={{ paddingTop: topInset }}>
        <View style={styles.navBar}>
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
          >
            <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
          </Pressable>
          <View style={{ alignItems: "center" }}>
            <Text style={[styles.navTitle, { color: colors.text, fontSize: rf(16) }]}>Analytics</Text>
            <Text style={{ fontSize: rf(10), fontFamily: "Inter_500Medium", color: colors.textMuted, marginTop: 1 }}>
              QR Performance
            </Text>
          </View>
          <View style={{ width: sp(38) }} />
        </View>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: sp(20), paddingBottom: insets.bottom + 100 }}
      >
        {/* Hero section */}
        <Animated.View entering={FadeIn.duration(160)}>
          <View style={[styles.heroCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            <LinearGradient
              colors={[primaryColor + "22", primaryColor + "06"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
            <View style={styles.heroRow}>
              <View style={[styles.heroIconWrap, { backgroundColor: primaryColor + "20", borderColor: primaryColor + "40" }]}>
                <Ionicons name="bar-chart" size={26} color={primaryColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[styles.heroTitle, { color: colors.text }]} numberOfLines={2}>
                  {(qrItem as any).displayTitle || qrItem.content || "QR Code"}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 }}>
                  <View style={[styles.typeBadge, { backgroundColor: primaryColor + "20", borderColor: primaryColor + "40" }]}>
                    <Text style={[styles.typeBadgeText, { color: primaryColor }]}>
                      {isDynamic ? (isGuardQr ? "Guard Link" : "Standard Link") : "Static QR"}
                    </Text>
                  </View>
                  <View style={[styles.typeBadge, { backgroundColor: isActive ? colors.safe + "20" : colors.danger + "20", borderColor: isActive ? colors.safe + "40" : colors.danger + "40" }]}>
                    <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: isActive ? colors.safe : colors.danger, marginRight: 3 }} />
                    <Text style={[styles.typeBadgeText, { color: isActive ? colors.safe : colors.danger }]}>
                      {isActive ? "Active" : "Deactivated"}
                    </Text>
                  </View>
                </View>
              </View>
            </View>
          </View>
        </Animated.View>

        {/* Top stats grid */}
        <Animated.View entering={FadeInDown.duration(160)} style={{ marginBottom: sp(14) }}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Performance Overview</Text>
          <View style={styles.statsGrid}>
            {topStats.map((stat, i) => (
              <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
                <View style={[styles.statIconWrap, { backgroundColor: stat.color + "18" }]}>
                  <Ionicons name={stat.icon} size={rf(16)} color={stat.color} />
                </View>
                <Text style={[styles.statValue, { color: colors.text, fontSize: rf(22) }]}>
                  {stat.value}
                </Text>
                <Text style={[styles.statLabel, { color: colors.textMuted, fontSize: rf(10) }]}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Lifecycle info */}
        <Animated.View entering={FadeInDown.duration(170)}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>QR Lifecycle</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            {[
              { icon: "calendar-outline" as const,        label: "Created",       value: formatDate(createdAt) },
              { icon: "time-outline" as const,             label: "Last updated",  value: formatDateTime(updatedAt) },
              { icon: "hourglass-outline" as const,        label: "Age",           value: ageInDays === 1 ? "1 day" : `${ageInDays} days` },
              { icon: "checkmark-circle-outline" as const, label: "Status",        value: isActive ? "Active" : "Deactivated" },
              { icon: "flash-outline" as const,            label: "Type",          value: isDynamic ? "Dynamic (editable destination)" : "Static QR" },
            ].map((row, i, arr) => (
              <View
                key={row.label}
                style={[
                  styles.infoRow,
                  i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surfaceBorder },
                ]}
              >
                <View style={[styles.infoIconWrap, { backgroundColor: colors.surfaceLight }]}>
                  <Ionicons name={row.icon} size={rf(14)} color={colors.textSecondary} />
                </View>
                <Text style={[styles.infoLabel, { color: colors.textSecondary, fontSize: rf(12) }]}>{row.label}</Text>
                <Text style={[styles.infoValue, { color: colors.text, fontSize: rf(12) }]} numberOfLines={1}>{row.value}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* Engagement summary */}
        <Animated.View entering={FadeInDown.duration(180)}>
          <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Engagement</Text>
          <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
            {[
              {
                icon: "scan-outline" as const,
                label: "Total scans",
                value: scanCount === 0 ? "No scans yet" : `${scanCount} scan${scanCount === 1 ? "" : "s"}`,
                color: colors.primary,
              },
              {
                icon: "trending-up-outline" as const,
                label: "Avg scans / day",
                value: `${avgScansPerDay} per day`,
                color: "#22c55e",
              },
              {
                icon: "people-outline" as const,
                label: "Creator followers",
                value: followCount === 0 ? "No followers yet" : `${followCount} follower${followCount === 1 ? "" : "s"}`,
                color: "#a855f7",
              },
              {
                icon: "chatbubble-outline" as const,
                label: "Comments",
                value: commentCount === 0 ? "No comments yet" : `${commentCount} comment${commentCount === 1 ? "" : "s"}`,
                color: "#f59e0b",
              },
            ].map((row, i, arr) => (
              <View
                key={row.label}
                style={[
                  styles.infoRow,
                  i < arr.length - 1 && { borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: colors.surfaceBorder },
                ]}
              >
                <View style={[styles.infoIconWrap, { backgroundColor: row.color + "18" }]}>
                  <Ionicons name={row.icon} size={rf(14)} color={row.color} />
                </View>
                <Text style={[styles.infoLabel, { color: colors.textSecondary, fontSize: rf(12) }]}>{row.label}</Text>
                <Text style={[styles.infoValue, { color: colors.text, fontSize: rf(12) }]} numberOfLines={1}>{row.value}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* QR ID */}
        {qrItem.qrCodeId && (
          <Animated.View entering={FadeInDown.duration(190)}>
            <Text style={[styles.sectionLabel, { color: colors.textMuted }]}>Identifiers</Text>
            <View style={[styles.infoCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <View style={styles.infoRow}>
                <View style={[styles.infoIconWrap, { backgroundColor: colors.surfaceLight }]}>
                  <Ionicons name="key-outline" size={rf(14)} color={colors.textSecondary} />
                </View>
                <Text style={[styles.infoLabel, { color: colors.textSecondary, fontSize: rf(12) }]}>QR Code ID</Text>
                <Text style={[styles.infoValue, { color: colors.textMuted, fontSize: rf(11), fontFamily: "Inter_400Regular" }]} numberOfLines={1} selectable>
                  {qrItem.qrCodeId}
                </Text>
              </View>
              {(qrItem as any).guardUuid && (
                <View style={[styles.infoRow, { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: colors.surfaceBorder }]}>
                  <View style={[styles.infoIconWrap, { backgroundColor: colors.surfaceLight }]}>
                    <Ionicons name="shield-outline" size={rf(14)} color={colors.primary} />
                  </View>
                  <Text style={[styles.infoLabel, { color: colors.textSecondary, fontSize: rf(12) }]}>Guard UUID</Text>
                  <Text style={[styles.infoValue, { color: colors.textMuted, fontSize: rf(11), fontFamily: "Inter_400Regular" }]} numberOfLines={1} selectable>
                    {(qrItem as any).guardUuid}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* Note about real-time analytics */}
        <Animated.View entering={FadeInDown.duration(200)}>
          <View style={[styles.noteCard, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
            <Ionicons name="information-circle-outline" size={rf(16)} color={colors.primary} />
            <Text style={[styles.noteText, { color: colors.textSecondary, fontSize: rf(11) }]}>
              Scan counts are updated in real time. Follower counts refresh when you open this page. Detailed scan heatmaps and location analytics are coming soon.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  navBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 6,
    paddingBottom: 10,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  navTitle: { fontFamily: "Inter_700Bold" },
  heroCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 18,
    marginBottom: 20,
    overflow: "hidden",
  },
  heroRow: { flexDirection: "row", alignItems: "flex-start", gap: 14 },
  heroIconWrap: {
    width: 52,
    height: 52,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  heroTitle: { fontSize: 15, fontFamily: "Inter_700Bold", lineHeight: 22 },
  typeBadge: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
    borderWidth: 1,
  },
  typeBadgeText: { fontSize: 10, fontFamily: "Inter_700Bold" },
  sectionLabel: {
    fontSize: 11,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.8,
    textTransform: "uppercase",
    marginBottom: 10,
    marginTop: 4,
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  statCard: {
    width: "47%",
    borderRadius: 16,
    borderWidth: 1,
    padding: 16,
    alignItems: "center",
    gap: 6,
  },
  statIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  statValue: { fontFamily: "Inter_800ExtraBold" },
  statLabel: { fontFamily: "Inter_400Regular", textAlign: "center" },
  infoCard: {
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 18,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },
  infoIconWrap: {
    width: 28,
    height: 28,
    borderRadius: 8,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  infoLabel: { fontFamily: "Inter_500Medium", width: 110, flexShrink: 0 },
  infoValue: { fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "right" },
  noteCard: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 10,
    borderRadius: 14,
    borderWidth: 1,
    padding: 14,
    marginBottom: 8,
  },
  noteText: { fontFamily: "Inter_400Regular", flex: 1, lineHeight: 17 },
});
