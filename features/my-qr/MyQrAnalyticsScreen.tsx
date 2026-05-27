import { useState, useEffect } from "react";
import { View, Text, ScrollView, Pressable, ActivityIndicator, StyleSheet } from "react-native";
import { StatusBar } from "expo-status-bar";
import { useLocalSearchParams, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeIn, FadeInDown } from "react-native-reanimated";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useTopInset } from "@/shared/utils/platform";
import { useScaleFns } from "@/shared/utils/use-scale";
import { useAuth } from "@/shared/contexts/AuthContext";
import { getGeneratedQrById, type GeneratedQrItem } from "@/services/generator-service";
import { getQrFollowCount } from "@/lib/firestore-service";
import { getDetailDisplayTitle, getDetailContentType } from "@/services/qr-display-utils";

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

  const NavBar = ({ subtitle }: { subtitle?: string }) => (
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
        {subtitle && (
          <Text style={{ fontSize: rf(10), fontFamily: "Inter_500Medium", color: colors.textMuted, marginTop: sp(1) }}>
            {subtitle}
          </Text>
        )}
      </View>
      <View style={{ width: sp(38) }} />
    </View>
  );

  if (!qrItem) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />
        <View style={{ paddingTop: topInset }}>
          <NavBar />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: sp(10) }}>
          <Ionicons name="bar-chart-outline" size={rf(44)} color={colors.textMuted} />
          <Text style={{ color: colors.textMuted, fontSize: rf(14), fontFamily: "Inter_500Medium" }}>QR code not found</Text>
        </View>
      </View>
    );
  }

  const displayTitle = getDetailDisplayTitle(qrItem as any);
  const primaryColor = isGuardQr ? colors.primary : isStandardQr ? "#22c55e" : colors.textSecondary;

  const topStats = [
    { icon: "scan-outline" as const,        label: "Total Scans",  value: String(scanCount),    color: colors.primary },
    { icon: "people-outline" as const,      label: "Followers",    value: String(followCount),  color: "#a855f7" },
    { icon: "chatbubble-outline" as const,  label: "Comments",     value: String(commentCount), color: "#f59e0b" },
    { icon: "trending-up-outline" as const, label: "Scans / Day",  value: avgScansPerDay,       color: "#22c55e" },
  ];

  const lifecycleRows = [
    { icon: "calendar-outline" as const,        label: "Created",      value: formatDate(createdAt) },
    { icon: "time-outline" as const,            label: "Last updated", value: formatDateTime(updatedAt) },
    { icon: "hourglass-outline" as const,       label: "Age",          value: ageInDays === 1 ? "1 day" : `${ageInDays} days` },
    { icon: "checkmark-circle-outline" as const,label: "Status",       value: isActive ? "Active" : "Paused" },
    { icon: "flash-outline" as const,           label: "Type",         value: isDynamic ? "Dynamic" : "Static QR" },
  ];

  const engagementRows = [
    { icon: "scan-outline" as const,        label: "Total scans",      value: scanCount === 0 ? "No scans yet" : `${scanCount} scan${scanCount === 1 ? "" : "s"}`,                   color: colors.primary },
    { icon: "trending-up-outline" as const, label: "Avg / day",        value: `${avgScansPerDay} per day`,                                                                              color: "#22c55e" },
    { icon: "people-outline" as const,      label: "Followers",        value: followCount === 0 ? "No followers yet" : `${followCount} follower${followCount === 1 ? "" : "s"}`,       color: "#a855f7" },
    { icon: "chatbubble-outline" as const,  label: "Comments",         value: commentCount === 0 ? "No comments yet" : `${commentCount} comment${commentCount === 1 ? "" : "s"}`,     color: "#f59e0b" },
  ];

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar style={isDark ? "light" : "dark"} backgroundColor={colors.background} />

      <View style={{ paddingTop: topInset }}>
        <NavBar subtitle="QR Performance" />
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingHorizontal: sp(20), paddingBottom: insets.bottom + sp(100) }}
      >
        {/* ── HERO ── */}
        <Animated.View entering={FadeIn.duration(160)} style={{ marginBottom: sp(20) }}>
          <View style={{
            borderRadius: sp(20), borderWidth: 1,
            borderColor: colors.surfaceBorder,
            backgroundColor: colors.surface,
            padding: sp(18), overflow: "hidden",
          }}>
            <LinearGradient
              colors={[primaryColor + "22", primaryColor + "06"]}
              style={StyleSheet.absoluteFill}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            />
            <View style={{ flexDirection: "row", alignItems: "flex-start", gap: sp(14) }}>
              <View style={{
                width: sp(50), height: sp(50), borderRadius: sp(15),
                borderWidth: 1, borderColor: primaryColor + "40",
                backgroundColor: primaryColor + "20",
                alignItems: "center", justifyContent: "center", flexShrink: 0,
              }}>
                <Ionicons name="bar-chart" size={rf(24)} color={primaryColor} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: rf(15), fontFamily: "Inter_700Bold", color: colors.text, lineHeight: rf(22) }} numberOfLines={2}>
                  {displayTitle}
                </Text>
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp(6), marginTop: sp(6), flexWrap: "wrap" }}>
                  <View style={{ flexDirection: "row", alignItems: "center", paddingHorizontal: sp(8), paddingVertical: sp(3), borderRadius: sp(100), borderWidth: 1, backgroundColor: primaryColor + "20", borderColor: primaryColor + "40" }}>
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
          <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase", color: colors.textMuted, marginBottom: sp(10) }}>
            Performance Overview
          </Text>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: sp(10) }}>
            {topStats.map((stat) => (
              <View key={stat.label} style={{
                width: "47%", borderRadius: sp(16), borderWidth: 1,
                borderColor: colors.surfaceBorder, backgroundColor: colors.surface,
                padding: sp(16), alignItems: "center", gap: sp(6),
              }}>
                <View style={{ width: sp(36), height: sp(36), borderRadius: sp(10), backgroundColor: stat.color + "18", alignItems: "center", justifyContent: "center", marginBottom: sp(2) }}>
                  <Ionicons name={stat.icon} size={rf(16)} color={stat.color} />
                </View>
                <Text style={{ fontSize: rf(22), fontFamily: "Inter_800ExtraBold", color: colors.text }}>
                  {stat.value}
                </Text>
                <Text style={{ fontSize: rf(10), fontFamily: "Inter_400Regular", color: colors.textMuted, textAlign: "center" }}>
                  {stat.label}
                </Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── LIFECYCLE ── */}
        <Animated.View entering={FadeInDown.duration(170)} style={{ marginBottom: sp(18) }}>
          <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase", color: colors.textMuted, marginBottom: sp(10) }}>
            QR Lifecycle
          </Text>
          <View style={{ borderRadius: sp(16), borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, overflow: "hidden" }}>
            {lifecycleRows.map((row, i, arr) => (
              <View
                key={row.label}
                style={{ flexDirection: "row", alignItems: "center", gap: sp(12), paddingHorizontal: sp(16), paddingVertical: sp(13), borderBottomWidth: i < arr.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: colors.surfaceBorder }}
              >
                <View style={{ width: sp(28), height: sp(28), borderRadius: sp(8), backgroundColor: colors.surfaceLight, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Ionicons name={row.icon} size={rf(14)} color={colors.textSecondary} />
                </View>
                <Text style={{ fontSize: rf(12), fontFamily: "Inter_500Medium", color: colors.textSecondary, width: sp(100), flexShrink: 0 }}>{row.label}</Text>
                <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.text, flex: 1, textAlign: "right" }} numberOfLines={1}>{row.value}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── ENGAGEMENT ── */}
        <Animated.View entering={FadeInDown.duration(180)} style={{ marginBottom: sp(18) }}>
          <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase", color: colors.textMuted, marginBottom: sp(10) }}>
            Engagement
          </Text>
          <View style={{ borderRadius: sp(16), borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, overflow: "hidden" }}>
            {engagementRows.map((row, i, arr) => (
              <View
                key={row.label}
                style={{ flexDirection: "row", alignItems: "center", gap: sp(12), paddingHorizontal: sp(16), paddingVertical: sp(13), borderBottomWidth: i < arr.length - 1 ? StyleSheet.hairlineWidth : 0, borderBottomColor: colors.surfaceBorder }}
              >
                <View style={{ width: sp(28), height: sp(28), borderRadius: sp(8), backgroundColor: row.color + "18", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Ionicons name={row.icon} size={rf(14)} color={row.color} />
                </View>
                <Text style={{ fontSize: rf(12), fontFamily: "Inter_500Medium", color: colors.textSecondary, width: sp(100), flexShrink: 0 }}>{row.label}</Text>
                <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: colors.text, flex: 1, textAlign: "right" }} numberOfLines={1}>{row.value}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* ── IDENTIFIERS ── */}
        {qrItem.qrCodeId && (
          <Animated.View entering={FadeInDown.duration(190)} style={{ marginBottom: sp(18) }}>
            <Text style={{ fontSize: rf(11), fontFamily: "Inter_600SemiBold", letterSpacing: 0.8, textTransform: "uppercase", color: colors.textMuted, marginBottom: sp(10) }}>
              Identifiers
            </Text>
            <View style={{ borderRadius: sp(16), borderWidth: 1, borderColor: colors.surfaceBorder, backgroundColor: colors.surface, overflow: "hidden" }}>
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(12), paddingHorizontal: sp(16), paddingVertical: sp(13), borderBottomWidth: (qrItem as any).guardUuid ? StyleSheet.hairlineWidth : 0, borderBottomColor: colors.surfaceBorder }}>
                <View style={{ width: sp(28), height: sp(28), borderRadius: sp(8), backgroundColor: colors.surfaceLight, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <Ionicons name="key-outline" size={rf(14)} color={colors.textSecondary} />
                </View>
                <Text style={{ fontSize: rf(12), fontFamily: "Inter_500Medium", color: colors.textSecondary, width: sp(100), flexShrink: 0 }}>QR Code ID</Text>
                <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, flex: 1, textAlign: "right" }} numberOfLines={1} selectable>
                  {qrItem.qrCodeId}
                </Text>
              </View>
              {(qrItem as any).guardUuid && (
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp(12), paddingHorizontal: sp(16), paddingVertical: sp(13) }}>
                  <View style={{ width: sp(28), height: sp(28), borderRadius: sp(8), backgroundColor: colors.surfaceLight, alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                    <Ionicons name="shield-outline" size={rf(14)} color={colors.primary} />
                  </View>
                  <Text style={{ fontSize: rf(12), fontFamily: "Inter_500Medium", color: colors.textSecondary, width: sp(100), flexShrink: 0 }}>Guard UUID</Text>
                  <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textMuted, flex: 1, textAlign: "right" }} numberOfLines={1} selectable>
                    {(qrItem as any).guardUuid}
                  </Text>
                </View>
              )}
            </View>
          </Animated.View>
        )}

        {/* ── NOTE ── */}
        <Animated.View entering={FadeInDown.duration(200)} style={{ marginBottom: sp(8) }}>
          <View style={{ flexDirection: "row", alignItems: "flex-start", gap: sp(10), borderRadius: sp(14), borderWidth: 1, borderColor: colors.primary + "30", backgroundColor: colors.primaryDim, padding: sp(14) }}>
            <Ionicons name="information-circle-outline" size={rf(16)} color={colors.primary} />
            <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textSecondary, flex: 1, lineHeight: rf(17) }}>
              Scan counts update in real time. Follower counts refresh when you open this page. Detailed scan heatmaps and location analytics are coming soon.
            </Text>
          </View>
        </Animated.View>
      </ScrollView>
    </View>
  );
}
