import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import {
  View, Text, Pressable, ScrollView,
  RefreshControl, useWindowDimensions, TextInput, LayoutChangeEvent,
  Animated,
} from "react-native";
import { FlashList as _FlashList } from "@shopify/flash-list";
const FlashList = _FlashList as any;
import { router, useFocusEffect, useLocalSearchParams } from "expo-router";
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
        <View style={{ flex: 1, minWidth: 0, gap: 6 }}>
          {bone({ height: 14, width: "72%", borderRadius: 7 })}
          {bone({ height: 11, width: "48%", borderRadius: 6 })}
          {bone({ height: 10, width: "30%", borderRadius: 6, marginTop: 2 })}
        </View>
        <View style={{ alignItems: "flex-end", gap: 8, flexShrink: 0 }}>
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

  const { scrollToId } = useLocalSearchParams<{ scrollToId?: string }>();

  const flashListRef = useRef<any>(null);
  const scrolledRef  = useRef(false);

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

  // FIX: on every focus, check cache freshness. readCache returns null when the
  // 5-min TTL has expired, so any expired or missing cache triggers a fresh fetch.
  // This ensures newly created QRs (which invalidate the cache in useQrSave) and
  // stale scan counts both surface when the user navigates back to this screen.
  useFocusEffect(
    useCallback(() => {
      if (!user?.id) return;
      readCache<GeneratedQrItem[]>(qrsCacheKey(user.id)).then((cached) => {
        if (!cached) {
          fetchQrCodes(true);
        } else if (hasLoadedRef.current) {
          // Cache hit but user is returning from another screen — silently
          // background-refresh so scan counts stay reasonably up to date
          // without blocking the UI. No loading spinner shown.
          fetchQrCodes(false);
        }
      }).catch(() => {});
    }, [user?.id, fetchQrCodes])
  );

  function handleRefresh() {
    setRefreshing(true);
    fetchQrCodes(true).finally(() => setRefreshing(false));
  }

  // FIX: calling setState inside useMemo is a React anti-pattern — it causes
  // extra renders and warnings in Strict Mode. Reset displayCount in an effect instead.
  useEffect(() => {
    setDisplayCount(PAGE_SIZE);
  }, [sortKey, searchQuery]);

  const sorted = useMemo(() => {
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

  // Scroll to specific QR when navigated from profile card
  useEffect(() => {
    if (!scrollToId || scrolledRef.current || sorted.length === 0 || loading) return;
    const idx = sorted.findIndex((q) => q.docId === scrollToId);
    if (idx < 0) return;
    scrolledRef.current = true;
    // Ensure the item is within the paged window first
    if (idx >= displayCount) setDisplayCount(idx + 1);
    // Give FlashList a frame to render then scroll
    const t = setTimeout(() => {
      try {
        flashListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0 });
      } catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [scrollToId, sorted, loading, displayCount]);

  function renderQrItem({ item, index }: { item: GeneratedQrItem; index: number }) {
    const displayText = getDisplayText(item, index);
    const ctMeta      = getContentTypeMeta(getEffectiveContentType(item));
    const isBusiness  = (item as any).qrType === "business";
    const isInactive  = item.isActive === false;
    const scanCount   = item.scanCount || 0;
    const cardBg      = colors.surface;
    const accentColor = ctMeta.color;

    return (
      <ReAnimated.View entering={FadeInDown.duration(260).delay(Math.min(index, 5) * 30)}>
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push(`/my-qr/${item.docId}` as any);
          }}
          style={({ pressed }) => [{
            flexDirection: "row", alignItems: "center", gap: sp(13),
            borderRadius: sp(20), borderWidth: 1,
            borderColor: isInactive ? colors.danger + "35" : colors.surfaceBorder,
            backgroundColor: cardBg,
            paddingHorizontal: sp(14), paddingVertical: sp(13),
            marginBottom: sp(10),
            opacity: pressed ? 0.9 : isInactive ? 0.7 : 1,
            transform: [{ scale: pressed ? 0.984 : 1 }],
          }]}
        >
          {/* Body */}
          <View style={{ flex: 1, minWidth: 0, gap: sp(4) }}>
            {/* Title */}
            <Text
              style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: isInactive ? colors.textMuted : colors.text, lineHeight: rf(20), letterSpacing: -0.1 }}
              numberOfLines={1}
              maxFontSizeMultiplier={1}
            >
              {displayText}
            </Text>

            {/* Subtitle — content type */}
            <Text
              style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textSecondary, lineHeight: rf(16) }}
              numberOfLines={1}
              maxFontSizeMultiplier={1}
            >
              {ctMeta.label}{isBusiness ? " · Business" : ""}
            </Text>

            {/* Meta row — scan count + status badges */}
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(5), marginTop: sp(1) }}>
              {/* Scan count */}
              <View style={{
                flexDirection: "row", alignItems: "center", gap: sp(3),
                backgroundColor: accentColor + "15",
                borderRadius: 100, paddingHorizontal: sp(6), paddingVertical: sp(2),
              }}>
                <Ionicons name="scan-outline" size={rf(9)} color={accentColor} />
                <Text style={{ fontSize: rf(10), fontFamily: "Inter_600SemiBold", color: accentColor }}>
                  {formatScanCount(scanCount)}
                </Text>
              </View>

              {/* Inactive badge */}
              {isInactive && (
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: sp(3),
                  backgroundColor: colors.danger + "18",
                  borderRadius: 100, paddingHorizontal: sp(6), paddingVertical: sp(2),
                  borderWidth: 1, borderColor: colors.danger + "45",
                }}>
                  <Ionicons name="pause-circle" size={rf(9)} color={colors.danger} />
                  <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: colors.danger }}>
                    Inactive
                  </Text>
                </View>
              )}

              {/* Business badge */}
              {isBusiness && !isInactive && (
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: sp(3),
                  backgroundColor: "#F59E0B18",
                  borderRadius: 100, paddingHorizontal: sp(6), paddingVertical: sp(2),
                  borderWidth: 1, borderColor: "#F59E0B45",
                }}>
                  <Ionicons name="briefcase" size={rf(9)} color="#F59E0B" />
                  <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: "#F59E0B" }}>
                    Business
                  </Text>
                </View>
              )}
            </View>
          </View>

          {/* Right — chevron */}
          <View style={{
            width: sp(28), height: sp(28), borderRadius: sp(9),
            backgroundColor: accentColor + "18",
            alignItems: "center", justifyContent: "center",
            flexShrink: 0,
          }}>
            <Ionicons name="chevron-forward" size={rf(13)} color={accentColor} />
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

        {/* Search bar — compact, matches History style */}
        <View style={{
          marginHorizontal: sp(16), marginBottom: sp(5),
          flexDirection: "row", alignItems: "center", gap: sp(10),
          borderRadius: 14, borderWidth: 1,
          borderColor: searchQuery.trim() ? colors.primary + "50" : colors.surfaceBorder,
          backgroundColor: colors.surface,
          paddingHorizontal: 14, paddingVertical: 10,
        }}>
          <Ionicons name="search-outline" size={17} color={searchQuery.trim() ? colors.primary : colors.textMuted} />
          <TextInput
            style={{ flex: 1, fontSize: 14, fontFamily: "Inter_400Regular", color: colors.text, paddingVertical: 0 }}
            placeholder="Search by name…"
            placeholderTextColor={colors.textMuted}
            value={searchQuery}
            onChangeText={setSearchQuery}
            returnKeyType="search"
            clearButtonMode="while-editing"
            maxFontSizeMultiplier={1}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")} hitSlop={8}>
              <Ionicons name="close-circle" size={16} color={colors.textMuted} />
            </Pressable>
          )}
        </View>

        {/* Sort chips — compact */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: sp(16), gap: sp(6), paddingBottom: sp(8) }}
          style={{ flexGrow: 0 }}
        >
          {SORT_OPTIONS.map((opt) => {
            const active = sortKey === opt.key;
            return (
              <Pressable
                key={opt.key}
                onPress={() => { setSortKey(opt.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[{
                  flexDirection: "row", alignItems: "center", gap: 4,
                  borderRadius: 20, paddingHorizontal: 10, paddingVertical: 5,
                  borderWidth: 1,
                }, active
                  ? { backgroundColor: colors.primary, borderColor: colors.primary }
                  : { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }
                ]}
              >
                <Ionicons name={opt.icon as any} size={10} color={active ? "#fff" : colors.textMuted} />
                <Text style={{ fontSize: 11, fontFamily: "Inter_600SemiBold", color: active ? "#fff" : colors.textMuted }}>
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
          /* ── Empty state ── */
          <ReAnimated.View entering={FadeIn.duration(400)} style={{ flex: 1, alignItems: "center", justifyContent: "center", paddingHorizontal: sp(40), gap: sp(16), paddingTop: headerH }}>
            <View style={{ width: sp(80), height: sp(80), borderRadius: sp(24), backgroundColor: colors.primaryDim, alignItems: "center", justifyContent: "center" }}>
              <MaterialCommunityIcons name="qrcode-plus" size={rf(38)} color={colors.primary} />
            </View>
            <View style={{ gap: sp(6), alignItems: "center" }}>
              <Text style={{ fontSize: rf(18), fontFamily: "Inter_700Bold", color: colors.text }}>No QR codes yet</Text>
              <Text style={{ fontSize: rf(13), fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: rf(20) }}>
                Your generated QR codes will appear here. Create your first one now.
              </Text>
            </View>
            <Pressable
              onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); router.push("/(tabs)/qr-generator" as any); }}
              style={({ pressed }) => ({ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.975 : 1 }], marginTop: sp(4) })}
            >
              <LinearGradient
                colors={[colors.primary, colors.primaryShade]}
                start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                style={{ flexDirection: "row", alignItems: "center", gap: sp(8), paddingHorizontal: sp(28), paddingVertical: sp(14), borderRadius: sp(16) }}
              >
                <MaterialCommunityIcons name="qrcode-edit" size={rf(18)} color="#fff" />
                <Text style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: "#fff" }}>Generate a QR Code</Text>
              </LinearGradient>
            </Pressable>
          </ReAnimated.View>
        )
      ) : (
        <FlashList
          ref={flashListRef}
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
