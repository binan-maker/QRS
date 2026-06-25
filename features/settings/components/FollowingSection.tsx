import { useState, useEffect, useCallback } from "react";
import { View, Text, Pressable, StyleSheet, RefreshControl } from "react-native";
import { FlashList as _FlashList } from "@shopify/flash-list";
const FlashList = _FlashList as any;
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import Animated, { FadeInDown } from "react-native-reanimated";
import { useTheme } from "@/shared/contexts/ThemeContext";
import SkeletonBox from "@/shared/components/ui/SkeletonBox";
import { db } from "@/lib/db/client";
import { formatShortDate } from "@/shared/utils/formatters";
import {
  getQrTypeMeta as getContentTypeMeta,
  getDisplayLabel as getContentDisplayLabel,
  getSubtitle as getContentSubtitle,
} from "@/features/qr-engine";

function SkeletonCard() {
  const { colors } = useTheme();
  return (
    <View style={{
      backgroundColor: colors.surface, borderRadius: 20, borderWidth: 1,
      borderColor: colors.surfaceBorder, paddingHorizontal: 14, paddingVertical: 13,
      marginBottom: 10, flexDirection: "row", alignItems: "center", gap: 13,
    }}>
      <SkeletonBox width={48} height={48} borderRadius={15} />
      <View style={{ flex: 1, gap: 6 }}>
        <SkeletonBox width="65%" height={13} borderRadius={4} />
        <SkeletonBox width="45%" height={11} borderRadius={4} />
        <SkeletonBox width="55%" height={10} borderRadius={4} />
      </View>
      <View style={{ alignItems: "flex-end", gap: 8 }}>
        <SkeletonBox width={38} height={11} borderRadius={4} />
        <SkeletonBox width={28} height={28} borderRadius={9} />
      </View>
    </View>
  );
}

interface EnrichedItem {
  id: string;
  qrCodeId: string;
  content: string;
  contentType: string;
  createdAt: string;
  scanCount: number;
  commentCount: number;
  ownerName?: string | null;
}

interface Props {
  loading: boolean;
  list: any[];
  onScroll?: (e: any) => void;
  paddingTop?: number;
  onRefresh?: () => void;
}

export default function FollowingSection({ loading, list, onScroll, paddingTop = 0, onRefresh }: Props) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [enriched, setEnriched] = useState<EnrichedItem[]>([]);
  const [enriching, setEnriching] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = useCallback(async () => {
    if (!onRefresh) return;
    setRefreshing(true);
    await onRefresh();
    setRefreshing(false);
  }, [onRefresh]);

  useEffect(() => {
    if (list.length === 0) { setEnriched([]); return; }
    setEnriching(true);
    // FIX: cap the number of parallel Firestore reads to avoid a read storm
    // when a user follows many QR codes. 100 is the same cap used on getQrFollowersList.
    const uniqueIds = [...new Set(list.map((i: any) => i.qrCodeId).filter(Boolean))];
    const ids = uniqueIds.slice(0, 100);
    Promise.all(ids.map((id) => db.get(["qrCodes", id]).catch(() => null))).then((results) => {
      const map: Record<string, any> = {};
      ids.forEach((id, i) => { if (results[i]) map[id] = results[i]; });
      const out: EnrichedItem[] = list.map((item: any) => {
        const qr = item.qrCodeId ? map[item.qrCodeId] : null;
        return {
          id: item.id,
          qrCodeId: item.qrCodeId || "",
          content: item.content || item.qrCodeId || "",
          contentType: item.contentType || "url",
          createdAt: item.createdAt || "",
          scanCount: qr?.scanCount ?? 0,
          commentCount: qr?.commentCount ?? 0,
          ownerName: qr?.ownerName ?? null,
        };
      });
      setEnriched(out);
      setEnriching(false);
    });
  }, [list]);

  if (loading || enriching) {
    return (
      <View style={{ flex: 1, paddingHorizontal: 16, paddingTop: 10 }}>
        <SkeletonCard /><SkeletonCard /><SkeletonCard /><SkeletonCard />
      </View>
    );
  }

  if (enriched.length === 0) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 14, paddingHorizontal: 36, paddingVertical: 40 }}>
        <LinearGradient
          colors={["#006FFF", "#6366F1"]}
          style={s.emptyIcon}
          start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
        >
          <Ionicons name="heart-outline" size={28} color="#fff" />
        </LinearGradient>
        <Text style={{ fontSize: 16, fontFamily: "Inter_700Bold", color: colors.text, textAlign: "center" }}>
          Not following anything yet
        </Text>
        <Text style={{ fontSize: 13, fontFamily: "Inter_400Regular", color: colors.textSecondary, textAlign: "center", lineHeight: 20 }}>
          Follow QR codes on the detail screen to track them here and get notified of updates
        </Text>
      </View>
    );
  }

  const renderItem = useCallback(({ item, index }: { item: EnrichedItem; index: number }) => {
    const rawMeta = getContentTypeMeta(item.contentType);
    const meta = {
      icon: rawMeta.icon as keyof typeof Ionicons.glyphMap,
      label: rawMeta.label,
      gradient: rawMeta.gradient as [string, string],
    };
    const displayLabel = getContentDisplayLabel(item.content, item.contentType);
    const subtitle = getContentSubtitle(item.content, item.contentType);
    const cardBg = isDark ? colors.surface : "#ffffff";

    return (
      <Animated.View entering={FadeInDown.delay(Math.min(index, 12) * 40).duration(320).springify().damping(18)}>
        <Pressable
          onPress={() => router.push({ pathname: "/qr-detail/[id]", params: { id: item.qrCodeId } })}
          style={({ pressed }) => [
            s.card,
            {
              backgroundColor: cardBg,
              borderColor: colors.surfaceBorder,
              opacity: pressed ? 0.9 : 1,
              transform: [{ scale: pressed ? 0.984 : 1 }],
              shadowColor: isDark ? "#000" : "#0008FF",
              shadowOpacity: isDark ? 0.18 : 0.05,
            },
          ]}
        >
          <LinearGradient
            colors={meta.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={s.iconBox}
          >
            <Ionicons name={meta.icon} size={21} color="#fff" />
          </LinearGradient>

          <View style={s.body}>
            <Text style={[s.title, { color: colors.text }]} numberOfLines={1} maxFontSizeMultiplier={1}>
              {displayLabel}
            </Text>

            {subtitle ? (
              <Text style={[s.subtitle, { color: colors.textSecondary }]} numberOfLines={1} maxFontSizeMultiplier={1}>
                {subtitle}
              </Text>
            ) : null}

            <View style={s.metaRow}>
              <View style={[s.typeBadge, { backgroundColor: meta.gradient[0] + "22" }]}>
                <Text style={[s.typeBadgeText, { color: meta.gradient[0] }]}>{meta.label}</Text>
              </View>
              {item.scanCount > 0 && (
                <>
                  <View style={s.dot} />
                  <Ionicons name="scan-outline" size={10} color={colors.textMuted} />
                  <Text style={[s.metaText, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
                    {item.scanCount} {item.scanCount === 1 ? "scan" : "scans"}
                  </Text>
                </>
              )}
              {item.commentCount > 0 && (
                <>
                  <View style={s.dot} />
                  <Ionicons name="chatbubble-outline" size={10} color={colors.textMuted} />
                  <Text style={[s.metaText, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
                    {item.commentCount}
                  </Text>
                </>
              )}
            </View>
          </View>

          <View style={s.right}>
            {item.createdAt ? (
              <Text style={[s.time, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
                {formatShortDate(new Date(item.createdAt))}
              </Text>
            ) : null}
            <View style={[s.chevronWrap, { backgroundColor: meta.gradient[0] + "18" }]}>
              <Ionicons name="chevron-forward" size={13} color={meta.gradient[0]} />
            </View>
          </View>
        </Pressable>
      </Animated.View>
    );
  }, [colors, isDark]);

  return (
    <FlashList
      data={enriched}
      keyExtractor={(item: EnrichedItem) => item.id}
      estimatedItemSize={88}
      contentContainerStyle={{ paddingHorizontal: 16, paddingTop: paddingTop || 10, paddingBottom: insets.bottom + 24 }}
      showsVerticalScrollIndicator={false}
      onScroll={onScroll}
      scrollEventThrottle={16}
      refreshControl={
        onRefresh ? (
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} tintColor="#6366F1" />
        ) : undefined
      }
      ListHeaderComponent={
        <Text style={{ fontSize: 12, fontFamily: "Inter_500Medium", color: colors.textMuted, marginBottom: 10 }}>
          {enriched.length} {enriched.length === 1 ? "QR code" : "QR codes"} followed
        </Text>
      }
      renderItem={renderItem}
    />
  );
}

const s = StyleSheet.create({
  emptyIcon: {
    width: 72,
    height: 72,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 13,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    elevation: 2,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    lineHeight: 20,
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 1,
    flexWrap: "nowrap",
  },
  typeBadge: {
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 100,
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: "#99999960",
  },
  metaText: {
    fontSize: 11,
    fontFamily: "Inter_400Regular",
  },
  right: {
    alignItems: "flex-end",
    gap: 8,
    flexShrink: 0,
  },
  time: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.1,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
