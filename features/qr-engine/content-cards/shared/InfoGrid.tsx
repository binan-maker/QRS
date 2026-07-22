import React, { type ReactNode } from "react";
import { View, Text, StyleSheet } from "react-native";
import type { AppColors } from "@/shared/constants/colors";

interface InfoRowProps {
  label: string;
  value: string;
  /** @deprecated icon is accepted for call-site compat but not rendered */
  icon?: string;
  /** @deprecated accentColor is accepted for call-site compat but not used */
  accentColor?: string;
  colors: AppColors;
  selectable?: boolean;
  numberOfLines?: number;
}

export function InfoRow({ label, value, colors, selectable, numberOfLines = 2 }: InfoRowProps) {
  return (
    <View style={styles.row}>
      <Text style={[styles.label, { color: colors.textSecondary }]}>{label}</Text>
      <Text
        style={[styles.value, { color: colors.text }]}
        selectable={selectable}
        numberOfLines={numberOfLines}
      >
        {value}
      </Text>
    </View>
  );
}

export function Divider({ colors }: { colors: AppColors }) {
  return <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />;
}

interface InfoGridProps {
  /** @deprecated accentColor is accepted for call-site compat but not used */
  accentColor?: string;
  colors: AppColors;
  isDark?: boolean;
  children: ReactNode;
}

export function InfoGrid({ colors, children }: InfoGridProps) {
  return (
    <View style={[styles.grid, {
      backgroundColor: colors.surfaceLight,
      borderColor:     colors.surfaceBorder,
    }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  grid:    { borderRadius: 14, padding: 12, gap: 0, borderWidth: 1 },
  row:     { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 9 },
  label:   { fontSize: 12, fontFamily: "Inter_500Medium", width: 72 },
  value:   { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "right" },
  divider: { height: 1, marginHorizontal: -2 },
});
