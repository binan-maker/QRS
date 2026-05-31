import React, { useMemo, useCallback } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
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
    <Animated.View entering={FadeInDown.duration(180)}>
      <View style={styles.sectionHeader}>
        <View style={styles.sectionTitleRow}>
          <View style={[styles.sectionDot, { backgroundColor: colors.primary }]} />
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Scans</Text>
        </View>
        {recentScans.length > 0 && (
          <Pressable
            onPress={() => router.push("/(tabs)/history")}
            style={[styles.seeAllBtn, { backgroundColor: colors.primaryDim }]}
          >
            <Text style={[styles.seeAllText, { color: colors.primary }]}>See All</Text>
            <Ionicons name="arrow-forward" size={12} color={colors.primary} />
          </Pressable>
        )}
      </View>

      {isLoading ? (
        <View>
          {[0, 1, 2].map((i) => <HistoryItemSkeleton key={i} index={i} />)}
        </View>
      ) : recentScans.length === 0 ? (
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
