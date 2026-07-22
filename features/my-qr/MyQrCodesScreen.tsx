import { useEffect, useRef, useCallback } from "react";
import {
  View, Text, Pressable, ScrollView,
  RefreshControl, useWindowDimensions, TextInput, LayoutChangeEvent,
  Animated,
} from "react-native";
import { FlashList as _FlashList } from "@shopify/flash-list";
const FlashList = _FlashList as any;
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useTopInset } from "@/shared/utils/platform";
import * as Haptics from "@/shared/utils/haptics";
import ReAnimated, { FadeInDown, FadeIn } from "react-native-reanimated";
import { useHeaderHide } from "@/shared/hooks/useHeaderHide";
import { useTabBarScroll } from "@/shared/contexts/TabBarContext";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { type GeneratedQrItem } from "@/lib/firestore-service";
import { getEffectiveContentType, getDisplayText } from "@/features/my-qr/utils/qr-display";
import { getQrTypeMeta as getContentTypeMeta } from "@/features/qr-engine";
import { useMyQrList, SORT_OPTIONS, formatScanCount } from "./hooks/useMyQrList";
import { useState } from "react";

function SkeletonQrCard({ index = 0 }: { index?: number }) {
  const { colors, isDark } = useTheme();
  const shimmer = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const anim = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmer, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(shimmer, { toValue: 0, duration: 900, useNativeDriver: true }),
      ])
    );
    anim.start();
    return () => anim.stop();
  }, []);

  const opacity = shimmer.interpolate({ inputRange: [0, 1], outputRange: [0.3, 0.65] });
  const cardBg  = isDark ? colors.surface : "#ffffff";
  const bone    = (style: object) => (
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
  const insets     = useSafeAreaInsets();
  const { width }  = useWindowDimensions();

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
  const flashListRef   = useRef<any>(null);
  const scrolledRef    = useRef(false);

  const {
    user,
    qrCodes,
    loading,
    refreshing,
    sortKey,
    setSortKey,
    searchQuery,
    setSearchQuery,
    sorted,
    paged,
    displayCount,
    setDisplayCount,
    handleRefresh,
    handleLoadMore,
  } = useMyQrList();

  // Scroll to specific QR when navigated from profile card
  useEffect(() => {
    if (!scrollToId || scrolledRef.current || sorted.length === 0 || loading) return;
    const idx = sorted.findIndex((q) => q.docId === scrollToId);
    if (idx < 0) return;
    scrolledRef.current = true;
    if (idx >= displayCount) setDisplayCount(idx + 1);
    const t = setTimeout(() => {
      try { flashListRef.current?.scrollToIndex({ index: idx, animated: true, viewPosition: 0 }); }
      catch {}
    }, 200);
    return () => clearTimeout(t);
  }, [scrollToId, sorted, loading, displayCount]);

  function renderQrItem({ item, index }: { item: GeneratedQrItem; index: number }) {
    const displayText = getDisplayText(item, index);
    const ctMeta      = getContentTypeMeta(getEffectiveContentType(item));
    const isInactive  = item.isActive === false;
    const scanCount   = item.scanCount || 0;
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
            backgroundColor: colors.surface,
            paddingHorizontal: sp(14), paddingVertical: sp(13),
            marginBottom: sp(10),
            opacity: pressed ? 0.9 : isInactive ? 0.7 : 1,
            transform: [{ scale: pressed ? 0.984 : 1 }],
          }]}
        >
          <View style={{ flex: 1, minWidth: 0, gap: sp(4) }}>
            <Text
              style={{ fontSize: rf(14), fontFamily: "Inter_700Bold", color: isInactive ? colors.textMuted : colors.text, lineHeight: rf(20), letterSpacing: -0.1 }}
              numberOfLines={1}
              maxFontSizeMultiplier={1}
            >
              {displayText}
            </Text>
            <Text
              style={{ fontSize: rf(12), fontFamily: "Inter_400Regular", color: colors.textSecondary, lineHeight: rf(16) }}
              numberOfLines={1}
              maxFontSizeMultiplier={1}
            >
              {ctMeta.label}
            </Text>
            <View style={{ flexDirection: "row", alignItems: "center", gap: sp(5), marginTop: sp(1) }}>
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
              {isInactive && (
                <View style={{
                  flexDirection: "row", alignItems: "center", gap: sp(3),
                  backgroundColor: colors.danger + "18",
                  borderRadius: 100, paddingHorizontal: sp(6), paddingVertical: sp(2),
                  borderWidth: 1, borderColor: colors.danger + "45",
                }}>
                  <Ionicons name="pause-circle" size={rf(9)} color={colors.danger} />
                  <Text style={{ fontSize: rf(10), fontFamily: "Inter_700Bold", color: colors.danger }}>Inactive</Text>
                </View>
              )}
            </View>
          </View>
          <View style={{
            width: sp(28), height: sp(28), borderRadius: sp(9),
            backgroundColor: accentColor + "18",
            alignItems: "center", justifyContent: "center", flexShrink: 0,
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
        <View style={{ paddingHorizontal: sp(20), paddingTop: topInset + sp(10), paddingBottom: sp(14) }}>
          <Text style={{ fontSize: rf(22), fontFamily: "Inter_700Bold", color: colors.text, letterSpacing: -0.5 }}>My QRs</Text>
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

      {/* Header — absolute, hides on scroll */}
      <ReAnimated.View
        style={[{ position: "absolute", top: 0, left: 0, right: 0, zIndex: 10, backgroundColor: colors.background }, headerStyle]}
        onLayout={(e: LayoutChangeEvent) => { const h = e.nativeEvent.layout.height; setHeaderH(h); setHeight(h); }}
      >
        <View style={{
          flexDirection: "row", alignItems: "center", justifyContent: "space-between",
          paddingHorizontal: sp(20), paddingTop: topInset + sp(10), paddingBottom: sp(10),
        }}>
          <Text style={{ fontSize: rf(22), fontFamily: "Inter_700Bold", color: colors.text, letterSpacing: -0.5 }}>My QRs</Text>
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); router.push("/(tabs)/qr-generator"); }}
            style={({ pressed }) => [{
              width: sp(38), height: sp(38), borderRadius: sp(12),
              alignItems: "center", justifyContent: "center",
              backgroundColor: colors.surface, borderWidth: 1, borderColor: colors.surfaceBorder,
              opacity: pressed ? 0.7 : 1, transform: [{ scale: pressed ? 0.94 : 1 }],
            }]}
          >
            <Ionicons name="add" size={rf(20)} color={colors.text} />
          </Pressable>
        </View>

        {/* Search bar */}
        <View style={{
          marginHorizontal: sp(16), marginBottom: sp(6),
          flexDirection: "row", alignItems: "center", gap: sp(10),
          borderRadius: sp(14), borderWidth: 1,
          borderColor: colors.surfaceBorder, backgroundColor: colors.surface,
          paddingHorizontal: sp(14), paddingVertical: sp(10),
        }}>
          <Ionicons name="search-outline" size={17} color={colors.textMuted} />
          <TextInput
            style={{ flex: 1, fontSize: rf(14), fontFamily: "Inter_400Regular", color: colors.text, paddingVertical: 0 }}
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

        {/* Sort chips */}
        <ScrollView
          horizontal showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ paddingHorizontal: sp(16), gap: sp(7), paddingBottom: sp(10), paddingTop: sp(2) }}
          style={{ flexGrow: 0 }}
        >
          {SORT_OPTIONS.map((opt, idx) => {
            const active = sortKey === opt.key;
            return (
              <ReAnimated.View key={opt.key} entering={FadeInDown.delay(25 + Math.min(idx, 4) * 16).duration(250)}>
                <Pressable
                  onPress={() => { setSortKey(opt.key); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={({ pressed }) => [{
                    flexDirection: "row", alignItems: "center", gap: sp(5),
                    borderRadius: 100, paddingHorizontal: sp(13), paddingVertical: sp(8),
                    borderWidth: 1, opacity: pressed ? 0.78 : 1,
                    transform: [{ scale: pressed ? 0.95 : 1 }],
                  }, active ? {
                    backgroundColor: colors.primary, borderColor: "transparent",
                    shadowColor: colors.primary, shadowOffset: { width: 0, height: 4 },
                    shadowOpacity: 0.28, shadowRadius: 10, elevation: 5,
                  } : {
                    backgroundColor: colors.surface, borderColor: colors.surfaceBorder,
                  }]}
                >
                  <Ionicons name={opt.icon as any} size={rf(13)} color={active ? "#fff" : colors.textSecondary} />
                  <Text style={{ fontSize: rf(12), fontFamily: "Inter_600SemiBold", letterSpacing: 0.1, color: active ? "#fff" : colors.textSecondary }}>
                    {opt.label}
                  </Text>
                </Pressable>
              </ReAnimated.View>
            );
          })}
        </ScrollView>
      </ReAnimated.View>

      <View style={{ flex: 1 }}>
        {loading && qrCodes.length === 0 ? (
          <View style={{ paddingHorizontal: sp(20), paddingTop: headerH + sp(4) }}>
            {[0, 1, 2, 3, 4].map((k) => <SkeletonQrCard key={k} index={k} />)}
          </View>
        ) : sorted.length === 0 ? (
          searchQuery.trim() ? (
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
      </View>
    </View>
  );
}
