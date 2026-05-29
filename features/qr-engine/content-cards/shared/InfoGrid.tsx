import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface InfoRowProps {
  label: string;
  value: string;
  icon: keyof typeof Ionicons.glyphMap;
  accentColor: string;
  colors: any;
  selectable?: boolean;
  numberOfLines?: number;
}

export function InfoRow({ label, value, icon, accentColor, colors, selectable, numberOfLines = 2 }: InfoRowProps) {
  return (
    <View style={styles.row}>
      <View style={[styles.iconWrap, { backgroundColor: accentColor + "20" }]}>
        <Ionicons name={icon} size={13} color={accentColor} />
      </View>
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

export function Divider({ colors }: { colors: any }) {
  return <View style={[styles.divider, { backgroundColor: colors.surfaceBorder }]} />;
}

interface InfoGridProps {
  accentColor: string;
  colors: any;
  isDark: boolean;
  children: React.ReactNode;
}

export function InfoGrid({ accentColor, colors, isDark, children }: InfoGridProps) {
  return (
    <View style={[styles.grid, {
      backgroundColor: accentColor + (isDark ? "22" : "12"),
      borderColor: accentColor + "30",
    }]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  grid: { borderRadius: 14, padding: 12, gap: 0, borderWidth: 1 },
  row: { flexDirection: "row", alignItems: "center", gap: 8, paddingVertical: 9 },
  iconWrap: { width: 24, height: 24, borderRadius: 7, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  label: { fontSize: 12, fontFamily: "Inter_500Medium", width: 72 },
  value: { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1, textAlign: "right" },
  divider: { height: 1, marginHorizontal: -2 },
});
