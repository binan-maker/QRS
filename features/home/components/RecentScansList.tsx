import React, { useMemo } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { useScaleFns } from "@/lib/utils/use-scale";
import { RecentScanCard } from "@/features/home/components/RecentScanCard";
import { ScanSkeletonList } from "@/features/home/components/ScanSkeletonList";
import { EmptyScans } from "@/features/home/components/EmptyScans";
import type { LocalScan } from "@/features/home/types";

interface Props {
  recentScans: LocalScan[];
  isLoading:   boolean;
  onDelete:    (id: string) => void;
}

export function RecentScansList({ recentScans, isLoading, onDelete }: Props) {
  const { colors } = useTheme();
  const { s } = useScaleFns();
  const styles = useMemo(() => makeStyles(colors, s), [colors, s]);

  return (
    <Animated.View entering={FadeInDown.duration(500).delay(320)}>
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
        <ScanSkeletonList />
      ) : recentScans.length === 0 ? (
        <EmptyScans />
      ) : (
        <View style={styles.recentList}>
          {recentScans.map((scan, idx) => (
            <RecentScanCard
              key={scan.id}
              scan={scan}
              index={idx}
              onDelete={onDelete}
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
    recentList:      { gap: 10 },
    fullHistoryBtn:  { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 14, borderRadius: 20, borderWidth: 1, marginTop: 2 },
    fullHistoryText: { fontSize: rf(14), fontFamily: "Inter_600SemiBold", flex: 0 },
  });
}
