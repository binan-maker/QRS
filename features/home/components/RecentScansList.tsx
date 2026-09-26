import React, { useMemo, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { safePush } from "@/shared/utils/navigation";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useScaleFns } from "@/shared/hooks/useScaleFns";
import {
  HistoryItem,
  HistoryItemSkeleton,
  type HistoryItemType,
} from "@/features/history";
import { EmptyScans } from "@/features/home/components/EmptyScans";
import type { LocalScan } from "@/features/home/types";

interface Props {
  recentScans: LocalScan[];
  isLoading:   boolean;
  onDelete:    (id: string) => void;
}

// Static array — avoids Array.from() allocation on every render cycle.
const SKELETON_INDICES = [0, 1, 2] as const;
export function RecentScansList({ recentScans, isLoading, onDelete }: Props) {
  const { colors } = useTheme();
  const { s } = useScaleFns();
  const styles = useMemo(() => makeStyles(colors, s), [colors, s]);

  const historyItems = useMemo<HistoryItemType[]>(
    () => recentScans.map((scan) => ({ ...scan, source: "local" as const })),
    [recentScans],
  );

  const handleDelete = useCallback(
    (item: HistoryItemType) => onDelete(item.id),
    [onDelete],
  );

  return (
    // Keep the home list immediate so the cards are visible as soon as data is
    // ready; the cached/local data path already provides the fast experience.
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
            onPress={() => safePush("/(tabs)/history")}
            style={[styles.seeAllBtn, { backgroundColor: colors.primaryDim }]}
          >
            <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
            <Ionicons name="arrow-forward" size={12} color={colors.primary} />
          </Pressable>
        )}
      </View>

      {/* Render the ready state directly. The home list is a small fixed set;
          keeping an invisible content tree and an animated skeleton mounted at
          the same time delays visible cards and does extra native work. */}
      <View>
        {isLoading ? (
          <View>
            {SKELETON_INDICES.map((i) => <HistoryItemSkeleton key={i} index={i} />)}
          </View>
        ) : recentScans.length === 0 ? (
          <EmptyScans />
        ) : (
          <View>
            {historyItems.map((item) => (
              <HistoryItem
                key={item.id}
                item={item}
                risk="safe"
                onDelete={handleDelete}
                animate={false}
                showTime={false}
              />
            ))}

            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                safePush("/(tabs)/history");
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
