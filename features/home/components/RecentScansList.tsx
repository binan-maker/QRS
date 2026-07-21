import React, { useMemo, useCallback, useEffect } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from "react-native-reanimated";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useScaleFns } from "@/shared/utils/use-scale";
import HistoryItem from "@/features/history/components/HistoryItem";
import HistoryItemSkeleton from "@/features/history/components/HistoryItemSkeleton";
import { EmptyScans } from "@/features/home/components/EmptyScans";
import type { LocalScan } from "@/features/home/types";
import type { HistoryItem as HistoryItemType } from "@/features/history/types";

interface Props {
  recentScans: LocalScan[];
  isLoading:   boolean;
  onDelete:    (id: string) => void;
}

const SKELETON_COUNT  = 3;
const CROSSFADE_MS    = 200;
const CROSSFADE_EASING = Easing.out(Easing.quad);

export function RecentScansList({ recentScans, isLoading, onDelete }: Props) {
  const { colors } = useTheme();
  const { s } = useScaleFns();
  const styles = useMemo(() => makeStyles(colors, s), [colors, s]);

  // ── Crossfade skeleton → content ────────────────────────────────────────────
  // Both layers are always mounted. Content renders immediately (opacity 0
  // while loading) so HistoryItem entering animations fire in the background.
  // By the time the crossfade completes, items are already in their final
  // positions — no card-by-card pop-in on reveal.
  const skeletonOpacity = useSharedValue(isLoading ? 1 : 0);
  const contentOpacity  = useSharedValue(isLoading ? 0 : 1);

  useEffect(() => {
    if (isLoading) {
      skeletonOpacity.value = withTiming(1, { duration: CROSSFADE_MS, easing: CROSSFADE_EASING });
      contentOpacity.value  = withTiming(0, { duration: CROSSFADE_MS, easing: CROSSFADE_EASING });
    } else {
      // Fade content in; skeleton follows slightly behind to avoid a bare flash.
      contentOpacity.value  = withTiming(1, { duration: CROSSFADE_MS, easing: CROSSFADE_EASING });
      skeletonOpacity.value = withTiming(0, { duration: CROSSFADE_MS, easing: CROSSFADE_EASING });
    }
  }, [isLoading]);

  const skeletonAnimStyle = useAnimatedStyle(() => ({ opacity: skeletonOpacity.value }));
  const contentAnimStyle  = useAnimatedStyle(() => ({ opacity: contentOpacity.value  }));

  const historyItems = useMemo<HistoryItemType[]>(
    () => recentScans.map((scan) => ({ ...scan, source: "local" as const })),
    [recentScans],
  );

  const handleDelete = useCallback(
    (item: HistoryItemType) => onDelete(item.id),
    [onDelete],
  );

  return (
    // No outer entering animation — the HomeScreen wrapper provides a single
    // unified entrance for all sections together.
    <View>
      {/* ── Section header ────────────────────────────────────────────────── */}
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Scans</Text>
        </View>
        {/* Only show See All once content is visible */}
        {!isLoading && recentScans.length > 0 && (
          <Pressable
            onPress={() => router.push("/(tabs)/history")}
            style={[styles.seeAllBtn, { backgroundColor: colors.primaryDim }]}
          >
            <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
            <Ionicons name="arrow-forward" size={12} color={colors.primary} />
          </Pressable>
        )}
      </View>

      {/* ── Crossfade container ───────────────────────────────────────────── */}
      <View>
        {/* Content layer — always rendered so HistoryItems pre-animate
            while invisible. Becomes visible when isLoading → false. */}
        <Animated.View
          style={contentAnimStyle}
          pointerEvents={isLoading ? "none" : "box-none"}
        >
          {recentScans.length === 0 ? (
            // Only show EmptyScans when we're sure there's nothing to display.
            // During loading this is hidden behind the skeleton overlay.
            <EmptyScans />
          ) : (
            <View>
              {historyItems.map((item, idx) => (
                <HistoryItem
                  key={item.id}
                  item={item}
                  risk="safe"
                  onDelete={handleDelete}
                  index={idx}
                  showTime={false}
                />
              ))}

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  router.push("/(tabs)/history");
                }}
                style={({ pressed }) => [
                  styles.fullHistoryBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor:     colors.surfaceBorder,
                    opacity:         pressed ? 0.82 : 1,
                    transform:       [{ scale: pressed ? 0.985 : 1 }],
                  },
                ]}
              >
                <Ionicons name="time-outline" size={16} color={colors.primary} />
                <Text style={[styles.fullHistoryText, { color: colors.primary }]}>See Full History</Text>
                <Ionicons name="arrow-forward" size={14} color={colors.primary} />
              </Pressable>
            </View>
          )}
        </Animated.View>

        {/* Skeleton overlay — absolute so it sits on top of (pre-rendered)
            content without affecting layout height. Fades out on load. */}
        <Animated.View
          style={[skeletonAnimStyle, StyleSheet.absoluteFill]}
          pointerEvents={isLoading ? "box-none" : "none"}
        >
          {Array.from({ length: SKELETON_COUNT }, (_, i) => (
            <HistoryItemSkeleton key={i} index={i} />
          ))}
        </Animated.View>
      </View>
    </View>
  );
}

function makeStyles(c: any, s: number) {
  const rf = (n: number) => Math.round(n * s);
  return StyleSheet.create({
    sectionHeader:   { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
    sectionTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
    sectionDot:      { width: 10, height: 10, borderRadius: 5 },
    sectionTitle:    { fontSize: rf(16), fontFamily: "Inter_700Bold" },
    seeAllBtn:       { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 12 },
    seeAllText:      { fontSize: rf(12), fontFamily: "Inter_600SemiBold" },
    fullHistoryBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 20, borderWidth: 1, marginTop: 2 },
    fullHistoryText: { fontSize: rf(14), fontFamily: "Inter_600SemiBold", flex: 0 },
  });
}
