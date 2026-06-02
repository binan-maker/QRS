import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View, Text, Pressable, ScrollView, StyleSheet,
  RefreshControl, useWindowDimensions, TextInput, LayoutChangeEvent,
  Animated,
} from "react-native";
import { FlashList as _FlashList } from "@shopify/flash-list";
const FlashList = _FlashList as any;
import { router, useFocusEffect } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/shared/utils/platform";
import * as Haptics from "@/shared/utils/haptics";
import ReAnimated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useHeaderHide } from "@/shared/utils/use-header-hide";
import { useTabBarScroll } from "@/shared/contexts/TabBarContext";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import {
  getUserGeneratedQrs,
  type GeneratedQrItem,
} from "@/lib/firestore-service";
import { readCache, writeCache } from "@/services/cache/local-cache";
import { getEffectiveContentType, getDisplayText } from "@/features/my-qr/utils/qr-display";
import { getQrTypeMeta as getContentTypeMeta } from "@/features/qr-engine";

const MY_QRS_CACHE_TTL = 5 * 60 * 1000;
const PAGE_SIZE = 15;
function qrsCacheKey(userId: string) { return `myqrs_v1_${userId}`; }

type SortKey = "newest" | "oldest" | "mostScanned";
const SORT_OPTIONS: { key: SortKey; label: string; icon: string }[] = [
  { key: "newest",      label: "Newest",       icon: "time-outline"        },
  { key: "mostScanned", label: "Top scanned",  icon: "trending-up-outline" },
  { key: "oldest",      label: "Oldest",       icon: "hourglass-outline"   },
];

function formatScanCount(n: number): string {
  if (n >= 1000) return (n / 1000).toFixed(1).replace(/\.0$/, "") + "k";
  return String(n);
}

function SkeletonQrCard({ index = 0 }: { index?: number }) {
  const { colors, isDark } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.65] });
  const cardBg = isDark ? colors.surface : "#ffffff";

  const bone = (style: object) => (
    <Animated.View style={[{ backgroundColor: colors.surfaceBorder, borderRadius: 8, opacity }, style]} />
  );

  return (
    <ReAnimated.View entering={FadeInDown.delay(Math.min(index, 4) * 22).duration(260)}>
      <View style={{
        flexDirection: "row", alignItems: "center",
        borderRadius: 20, marginBottom: 10, borderWidth: 1,
        borderColor: colors.surfaceBorder, backgroundColor: cardBg,
        paddingHorizontal: 14, paddingVertical: 13, gap: 13,
      }}>
        {bone({ width: 48, height: 48, borderRadius: 15, flexShrink: 0 })}
        <View style={{ flex: 1, minWidth: 0, gap: 5 }}>
          {bone({ height: 14, width: "68%", borderRadius: 7 })}
          {bone({ height: 11, width: "45%", borderRadius: 6 })}
        </View>
        <View style={{ alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
          {bone({ height: 10, width: 42, borderRadius: 6 })}
          {bone({ width: 28, height: 28, borderRadius: 9 })}
        </View>
      </View>
    </ReAnimated.View>
  );
}

export default function MyQrCodesScreen() {
  const { colors } = useTheme();
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();

  const s  = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (size: number) => Math.round(size * s);
  const sp = (v: number)    => Math.round(v * s);

  const topInset             = useTopInset();
  const contentPaddingBottom = insets.bottom + sp(36);
  const { headerStyle, setHeight, onScroll: onHeaderScroll } = useHeaderHide();
  const { onTabScroll } = useTabBarScroll();
  const [headerH, setHeaderH] = useState(0);
  const handleScroll = useCallback((e: any) => {
    onHeaderScroll(e);
    onTabScroll(e);
  }, [onHeaderScroll, onTabScroll]);

  const [qrCodes,     setQrCodes]    = useState<GeneratedQrItem[]>([]);
  const [loading,     setLoading]    = useState(true);
  const [refreshing,  setRefreshing] = useState(false);
  const [sortKey,     setSortKey]    = useState<SortKey>("newest");
  const [searchQuery, setSearchQuery] = useState("");
  const [displayCount, setDisplayCount] = useState(PAGE_SIZE);
  const hasLoadedRef = useRef(false);

  const fetchQrCodes = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    if (!forceRefresh) {
      const cached = await readCache<GeneratedQrItem[]>(qrsCacheKey(user.id));
      if (cached) { setQrCodes(cached); setLoading(false); hasLoadedRef.current = true; return; }
    }
    if (!hasLoadedRef.current) setLoading(true);
    try {
      const items = await getUserGeneratedQrs(user.id);
      setQrCodes(items);
      hasLoadedRef.current = true;
      writeCache(qrsCacheKey(user.id), items, MY_QRS_CACHE_TTL);
    } catch (e) {
      console.warn("[my-qr-codes] fetchQrCodes error:", e);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { if (!user) return; fetchQrCodes(); }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      readCache<GeneratedQrItem[]>(qrsCacheKey(user.id)).then((cached) => {
        if (!cached) fetchQrCodes(true);
      }).catch(() => {});
    }, [user?.id, fetchQrCodes])
  );

  function handleRefresh() {
    setRefreshing(true);
    fetchQrCodes(true).finally(() => setRefreshing(false));
  }

  const sorted = useMemo(() => {
    setDisplayCount(PAGE_SIZE);
    let list = [...qrCodes];
    if (sortKey === "mostScanned") list.sort((a, b) => (b.scanCount || 0) - (a.scanCount || 0));
    else if (sortKey === "oldest") list.sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      list = list.filter((item, idx) => {
        const displayText  = getDisplayText(item, idx).toLowerCase();
        const label        = (item.label || "").toLowerCase();
        const businessName = (item.businessName || "").toLowerCase();
        return displayText.includes(q) || label.includes(q) || businessName.includes(q);
      });
    }
    return list;
  }, [qrCodes, sortKey, searchQuery]);

  const paged = useMemo(() => sorted.slice(0, displayCount), [sorted, displayCount]);

  const handleLoadMore = useCallback(() => {
    if (displayCount < sorted.length) {
      setDisplayCount((c) => Math.min(c + PAGE_SIZE, sorted.length));
    }
  }, [displayCount, sorted.length]);

  function renderQrItem({ item, index }: { item: GeneratedQrItem; index: number }) {
    const displayText = getDisplayText(item, index);
    const ctMeta      = getContentTypeMeta(getEffectiveContentType(item));
    const isBusiness  = (item as any).qrType === "business";
    const isInactive  = item.isActive === false;
    const scanCount   = item.scanCount || 0;

    return (
      <ReAnimated.View entering={FadeInDown.duration(260).delay(Math.min(index, 5) * 30)}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/my-qr/${item.docId}` as any);
          }}
          style={({ pressed }) => [{
            flexDirection: "row", alignItems: "center", gap: sp(14),
            borderRadius: sp(20), borderWidth: 1,
            borderColor: colors.surfaceBorder,
            backgroundColor: colors.surface,
            padding: sp(14), marginBottom: sp(10),
            opacity: pressed ? 0.86 : isInactive ? 0.6 : 1,
            transform: [{ scale: pressed ? 0.985 : 1 }],
          }]}
        >
          {/* Icon */}
          <View style={{
            width: sp(52), height: sp(52), borderRadius: sp(14),
            backgroundColor: ctMeta.bg,
            alignItems: "center", justifyContent: "center",
            flexShrink: 0, position: "relative",
          }}>
            <Ionicons name={ctMeta.icon as any} size={sp(24)} color={ctMeta.color} />
            {isInactive && (
              <View style={{
                position: "absolute", top: -2, right: -2,
                width: sp(10), height: sp(10), borderRadius: sp(5),
                backgroundColor: colors.danger,
                borderWidth: 1.5, borderColor: colors.surface,
              }} />
            )}
            {isBusiness && !isInactive && (
              <View style={{
                position: "absolute", top: -2, right: -2,
                width: sp(10), height: sp(10), borderRadius: sp(5),
                backgroundColor: "#F59E0B",
                borderWidth: 1.5, borderColor: colors.surface,
                alignItems: "center", justifyContent: "center",
              }} />
            )}
          </View>

          {/* Text */}
          <View style={{ flex: 1, minWidth: 0, gap: sp(3) }}>
            <Text style={{
              fontSize: rf(10), fontFamily: "Inter_500Medium",
              color: ctMeta.color, textTransform: "uppercase", letterSpacing: 0.4,
            }}>
              {ctMeta.label}{isBusiness ? " · Business" : ""}
            </Text>
            <Text
              style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: isInactive ? colors.textMuted : colors.text }}
              numberOfLines={1}
            >
              {displayText.length > 38 ? displayText.slice(0, 38) + "…" : displayText}
            </Text>
          </View>

          {/* Scan count pill */}
          <View style={{
            flexDirection: "row", alignItems: "center", gap: sp(3),
            backgroundColor: colors.surfaceLight,
            borderRadius: sp(10), paddingHorizontal: sp(8), paddingVertical: sp(4),
            flexShrink: 0,
          }}>
            <Ionicons name="scan-outline" size={rf(9)} color={colors.textMuted} />
            <Text style={{ fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: colors.textMuted }}>
              {formatScanCount(scanCount)}
            </Text>
          </View>
        </Pressable>
      </ReAnimated.View>
    );
  }

  /* ─── Not signed in ─── */
  if (!user) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          paddingHorizontal: sp(20), paddingTop: topInset + sp(6), paddingBottom: sp(14),
        }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: sp(38), height: sp(38), borderRadius: sp(19), alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder }}
          >
            <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
          </Pressable>
          <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text }}>My QRs</Text>
          <View style={{ width: sp(38) }} />
        </View>
        <View style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: sp(40), gap: sp(14) }}>
          <View style={{ width: sp(72), height: sp(72), borderRadius: sp(22), backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" }}>
            <MaterialCommunityIcons name="qrcode-plus" size={rf(34)} color={colors.primary} />
          </View>
          <View style={{ gap: sp(6), alignItems: "center" }}>
            <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text }}>Sign in to continue</Text>
            <Text style={{ fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: rf(20) }}>
              Your generated QR codes live here
            </Text>
          </View>
          <Pressable onPress={() => router.push("/(auth)/login")} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: sp(4) }]}>
            <LinearGradient colors={[colors.primary, colors.primaryShade]} style={{ paddingHorizontal: sp(32), paddingVertical: sp(13), borderRadius: sp(16) }} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
              <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#fff" }}>Sign In</Text>
            </LinearGradient>
          </Pressable>
        </View>
      </View>
    );
  }

  /* ─── Main screen ─── */
  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>

      {/* Header — absolute, hides on scroll (title + search + sort all together) */}
      <ReAnimated.View
        style={[{
          position: "absolute", top: 0, left: 0, right: 0, zIndex: 10,
          backgroundColor: colors.background,
        }, headerStyle]}
        onLayout={(e: LayoutChangeEvent) => { const h = e.nativeEvent.layout.height; setHeaderH(h); setHeight(h); }}
      >
        {/* Top row: back + title + add */}
        <View style={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          paddingHorizontal: sp(20), paddingTop: topInset + sp(6), paddingBottom: sp(8),
        }}>
          <Pressable
            onPress={() => router.back()}
            style={{ width: sp(38), height: sp(38), borderRadius: sp(19), alignItems: "center", justifyContent: "center", backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder }}
          >
            <Ionicons name="chevron-back" size={rf(20)} color={colors.text} />
          </Pressable>

          <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text }}>My QRs</Text>

          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/qr-generator"); }}
            style={({ pressed }) => [{ opacity: pressed ? 0.82 : 1 }]}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryShade]}
              style={{ width: sp(38), height: sp(38), borderRadius: sp(19), alignItems: "center", justifyContent: "center" }}
              start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            >
              <Ionicons name="add" size={rf(20)} color="#fff" />
            </LinearGradient>
          </Pressable>
        </View>

        {/* Search bar */}
        <View style={{
          marginHorizontal: sp(20), marginBottom: sp(6),
          flexDirection: "row", alignItems: "center", gap: sp(6),
          borderRadius: sp(12), borderWidth: 1,
          borderColor: searchQuery.trim() ? colors.primary + "50" : colors.surfaceBorder,
          backgroundColor: colors.surface,
          paddingHorizontal: sp(10), paddingVertical: sp(7),
        }}>
          <Ionicons name="search-outline" size={rf(14)} color={searchQuery.trim() ? colors.primary : colors.textMuted} />
          <TextInput
            style={{ flex: 1, fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.text }}
            placeholder="Search by name…"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={rf(14)} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Sort pills */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: sp(20), gap: sp(7), paddingBottom: sp(10) }}
          style={{ flexGrow: 0 }}
        >
          {SORT_OPTIONS.map((opt) => {
            const active = sortKey === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => { setSortKey(opt.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[{
                  flexDirection: "row", alignItems: "center", gap: sp(5),
                  borderRadius: sp(20), paddingHorizontal: sp(14), paddingVertical: sp(8),
                  borderWidth: 1,
                }, active
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }
                ]}
              >
                <Ionicons name={opt.icon as any} size={rf(11)} color={active ? "#fff" : colors.textMuted} />
                <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", color: active ? "#fff" : colors.textMuted }}>
                  {opt.label}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
      </ReAnimated.View>

      {/* Content — sits behind header; paddingTop pushed into each child so no dead gap remains when header hides */}
      <View style={{ flex: 1 }}>

      {/* List */}
      {loading && qrCodes.length === 0 ? (
        <View style={{ paddingHorizontal: sp(20), paddingTop: headerH + sp(4) }}>
          {[0, 1, 2, 3, 4].map((k) => <SkeletonQrCard key={k} index={k} />)}
        </View>
      ) : sorted.length === 0 ? (
        searchQuery.trim() ? (
          /* ── Search no-results ── */
          <ReAnimated.View entering={FadeIn.duration(400)} style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: sp(40), gap: sp(14), paddingTop: headerH }}>
            <View style={{ width: sp(72), height: sp(72), borderRadius: sp(22), backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" }}>
              <Ionicons name="search-outline" size={rf(34)} color={colors.primary} />
            </View>
            <View style={{ gap: sp(6), alignItems: "center" }}>
              <Text style={{ fontSize: rf(17), fontFamily: "Inter_700Bold", color: colors.text }}>No results found</Text>
              <Text style={{ fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: rf(20) }}>
                No QR codes match "{searchQuery.trim()}"
              </Text>
            </View>
            <Pressable onPress={() => setSearchQuery("")} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, marginTop: sp(4) }]}>
              <LinearGradient
                colors={[colors.primary, colors.primaryShade]}
                style={{ flexDirection: "row", alignItems: "center", gap: sp(7), paddingHorizontal: sp(28), paddingVertical: sp(13), borderRadius: sp(16) }}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
              >
                <Ionicons name="close" size={rf(16)} color="#fff" />
                <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#fff" }}>Clear Search</Text>
              </LinearGradient>
            </Pressable>
          </ReAnimated.View>
        ) : (
          /* ── Phase 2 Showcase ── */
          <ReAnimated.View entering={FadeIn.duration(400)} style={{ flex: 1 }}>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: sp(20), paddingBottom: sp(120), paddingTop: headerH + sp(4) }}>

              {/* Showcase header */}
              <LinearGradient
                colors={["#0F172A", "#1E1B4B"]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{
                  borderRadius: sp(20), padding: sp(20), marginBottom: sp(20),
                  overflow: "hidden", position: "relative",
                }}
              >
                <View style={{ position: "absolute", top: -40, right: -20, width: 110, height: 110, borderRadius: 55, backgroundColor: "rgba(124,58,237,0.18)" }} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp(10), marginBottom: sp(12) }}>
                  <View style={{ width: sp(48), height: sp(48), borderRadius: sp(14), backgroundColor: "rgba(124,58,237,0.25)", alignItems: "center", justifyContent: "center" }}>
                    <MaterialCommunityIcons name="qrcode-plus" size={rf(24)} color="#A78BFA" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: rf(16), fontFamily: "Inter_700Bold", color: "#fff" }}>Your QR Dashboard</Text>
                    <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.55)", marginTop: 2 }}>
                      See a preview of what's coming in Phase 2
                    </Text>
                  </View>
                  <View style={{ paddingHorizontal: sp(8), paddingVertical: sp(4), borderRadius: sp(8), backgroundColor: "#7C3AED30", borderWidth: 1, borderColor: "#7C3AED60" }}>
                    <Text style={{ fontSize: rf(8), fontFamily: "Inter_700Bold", color: "#A78BFA", letterSpacing: 1 }}>PHASE 2</Text>
                  </View>
                </View>

                {/* 3 stat bubbles */}
                <View style={{ flexDirection: "row", gap: sp(8) }}>
                  {[
                    { val: "∞", label: "QR Codes",   color: "#A78BFA" },
                    { val: "0–100", label: "Trust Score", color: "#34D399" },
                    { val: "Live", label: "Analytics",  color: "#60A5FA" },
                  ].map((st) => (
                    <View key={st.label} style={{ flex: 1, backgroundColor: "rgba(255,255,255,0.07)", borderRadius: sp(10), padding: sp(10), alignItems: "center", gap: sp(2) }}>
                      <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: st.color }}>{st.val}</Text>
                      <Text style={{ fontSize: rf(9), fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.45)" }}>{st.label}</Text>
                    </View>
                  ))}
                </View>
              </LinearGradient>

              {/* Preview label */}
              <View style={{ flexDirection: "row", alignItems: "center", gap: sp(8), marginBottom: sp(12) }}>
                <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.surfaceBorder }} />
                <View style={{ flexDirection: "row", alignItems: "center", gap: sp(5), paddingHorizontal: sp(10), paddingVertical: sp(4), borderRadius: sp(8), backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder }}>
                  <Ionicons name="eye-outline" size={rf(10)} color={colors.textMuted} />
                  <Text style={{ fontSize: rf(9), fontFamily: "Inter_600SemiBold", color: colors.textMuted, letterSpacing: 0.6 }}>PREVIEW ONLY</Text>
                </View>
                <View style={{ flex: 1, height: StyleSheet.hairlineWidth, backgroundColor: colors.surfaceBorder }} />
              </View>

              {/* Mock QR cards */}
              {[
                { type: "UPI Payment",   icon: "cash-outline",      color: "#10B981", label: "My Shop Payment",  scans: 247, active: true  },
                { type: "WiFi Network",  icon: "wifi-outline",       color: "#3B82F6", label: "Home WiFi",         scans: 89,  active: true  },
                { type: "Website URL",   icon: "link-outline",       color: "#6366F1", label: "My Portfolio",      scans: 512, active: true  },
                { type: "Contact Card",  icon: "person-circle-outline", color: "#F59E0B", label: "Business Card",  scans: 34,  active: false },
              ].map((mock, idx) => (
                <ReAnimated.View
                  key={mock.label}
                  entering={FadeInDown.duration(280).delay(idx * 60)}
                  style={{
                    flexDirection: "row", alignItems: "center", gap: sp(14),
                    borderRadius: sp(18), borderWidth: 1,
                    borderColor: colors.surfaceBorder,
                    backgroundColor: colors.surface,
                    padding: sp(14), marginBottom: sp(10),
                    opacity: 0.72,
                  }}
                >
                  {/* Icon */}
                  <View style={{
                    width: sp(48), height: sp(48), borderRadius: sp(13),
                    backgroundColor: mock.color + "18",
                    alignItems: "center", justifyContent: "center", flexShrink: 0, position: "relative",
                  }}>
                    <Ionicons name={mock.icon as any} size={sp(22)} color={mock.color} />
                    {!mock.active && (
                      <View style={{
                        position: "absolute", top: -2, right: -2,
                        width: sp(10), height: sp(10), borderRadius: sp(5),
                        backgroundColor: colors.danger,
                        borderWidth: 1.5, borderColor: colors.surface,
                      }} />
                    )}
                  </View>

                  {/* Text */}
                  <View style={{ flex: 1, gap: sp(3) }}>
                    <Text style={{ fontSize: rf(10), fontFamily: "Inter_500Medium", color: mock.color, textTransform: "uppercase", letterSpacing: 0.4 }}>
                      {mock.type}
                    </Text>
                    <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: mock.active ? colors.text : colors.textMuted }}>
                      {mock.label}
                    </Text>
                  </View>

                  {/* Scan count */}
                  <View style={{
                    flexDirection: "row", alignItems: "center", gap: sp(3),
                    backgroundColor: colors.surfaceLight,
                    borderRadius: sp(9), paddingHorizontal: sp(8), paddingVertical: sp(4),
                  }}>
                    <Ionicons name="scan-outline" size={rf(9)} color={colors.textMuted} />
                    <Text style={{ fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: colors.textMuted }}>
                      {mock.scans >= 1000 ? (mock.scans / 1000).toFixed(1) + "k" : mock.scans}
                    </Text>
                  </View>
                </ReAnimated.View>
              ))}

              {/* Bottom note */}
              <View style={{
                marginTop: sp(8), borderRadius: sp(16), borderWidth: 1,
                borderColor: colors.primary + "30",
                backgroundColor: colors.primaryDim,
                padding: sp(16), flexDirection: "row", alignItems: "center", gap: sp(12),
              }}>
                <View style={{ width: sp(36), height: sp(36), borderRadius: sp(10), backgroundColor: colors.primary + "20", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                  <MaterialCommunityIcons name="rocket-launch-outline" size={rf(18)} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: rf(13), fontFamily: "Inter_700Bold", color: colors.text, marginBottom: sp(3) }}>
                    Your QR codes appear here
                  </Text>
                  <Text style={{ fontSize: rf(11), fontFamily: "Inter_400Regular", color: colors.textSecondary, lineHeight: rf(17) }}>
                    QR generation launches in Phase 2. For now, scan any QR code to check if it is safe.
                  </Text>
                </View>
              </View>

              {/* Scan now CTA */}
              <Pressable
                onPress={() => router.push("/(tabs)/scanner" as any)}
                style={({ pressed }) => ({ opacity: pressed ? 0.86 : 1, transform: [{ scale: pressed ? 0.975 : 1 }], marginTop: sp(12) })}
              >
                <LinearGradient
                  colors={["#059669", "#10B981"]}
                  start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={{ flexDirection: "row", alignItems: "center", justifyContent: "center", gap: sp(9), paddingVertical: sp(15), borderRadius: sp(16) }}
                >
                  <Ionicons name="scan" size={rf(18)} color="#fff" />
                  <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#fff" }}>Scan a QR Code Now</Text>
                </LinearGradient>
              </Pressable>
            </ScrollView>
          </ReAnimated.View>
        )
      ) : (
        <FlashList
          data={paged}
          keyExtractor={(item: any) => item.docId ?? item.id}
          renderItem={renderQrItem}
          estimatedItemSize={84}
          contentContainerStyle={{ paddingHorizontal: sp(20), paddingTop: headerH + sp(4), paddingBottom: contentPaddingBottom }}
          showsVerticalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.3}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor={colors.primary} />}
        />
      )}

      </View>{/* end content wrapper */}
    </View>
  );
}
