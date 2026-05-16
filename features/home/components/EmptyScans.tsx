import React, { useMemo } from "react";
import { View, Text, StyleSheet, useWindowDimensions } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { makeResponsiveFont } from "@/features/home/utils";
import type { HomeColors } from "@/features/home/types";

interface Props {
  colors: HomeColors;
}

export function EmptyScans({ colors }: Props) {
  const { width } = useWindowDimensions();
  const rf = useMemo(() => makeResponsiveFont(width), [width]);
  const styles = useMemo(() => makeStyles(colors, rf), [colors, rf]);

  return (
    <View style={[styles.emptyWrap, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <View style={[styles.emptyIconBox, { backgroundColor: colors.surfaceLight }]}>
        <Ionicons name="scan-outline" size={32} color={colors.textMuted} />
      </View>
      <Text style={[styles.emptyTitle, { color: colors.textSecondary }]}>No scans yet</Text>
      <Text style={[styles.emptySub,   { color: colors.textMuted }]}>Scan a QR code to get started</Text>
    </View>
  );
}

function makeStyles(c: HomeColors, rf: (n: number) => number) {
  return StyleSheet.create({
    emptyWrap:    { alignItems: "center", paddingVertical: 40, gap: 10, borderRadius: 20, borderWidth: 1 },
    emptyIconBox: { width: 70, height: 70, borderRadius: 18, alignItems: "center", justifyContent: "center", marginBottom: 4 },
    emptyTitle:   { fontSize: rf(15), fontFamily: "Inter_600SemiBold" },
    emptySub:     { fontSize: rf(13), fontFamily: "Inter_400Regular" },
  });
}
