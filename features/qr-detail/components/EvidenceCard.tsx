import React from "react";
import { View, Text, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import type { Evidence } from "@/lib/analysis/types";

interface Props {
  title: string;
  evidence: Evidence[];
}

function evidenceIcon(type: Evidence["type"]): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "positive": return "checkmark-circle";
    case "negative": return "alert-circle";
    case "neutral":  return "ellipse-outline";
    case "info":     return "information-circle";
  }
}

function evidenceColor(type: Evidence["type"], colors: any): string {
  switch (type) {
    case "positive": return "#22c55e";
    case "negative": return colors.danger;
    case "neutral":  return colors.textMuted;
    case "info":     return "#38bdf8";
  }
}

export default function EvidenceCard({ title, evidence }: Props) {
  const { colors, isDark } = useTheme();
  if (!evidence || evidence.length === 0) return null;

  const surfaceBg = isDark ? "#0d1117" : "#f4f6fb";
  const borderCol = isDark ? "#1e2a3a" : "#dce3ef";

  return (
    <View style={[styles.card, { backgroundColor: surfaceBg, borderColor: borderCol }]}>
      <View style={styles.header}>
        <View style={[styles.headerAccent, { backgroundColor: "#38bdf820" }]}>
          <Ionicons name="analytics-outline" size={13} color="#38bdf8" />
        </View>
        <Text style={[styles.headerLabel, { color: isDark ? "#94a3b8" : "#64748b" }]}>
          {title.toUpperCase()}
        </Text>
      </View>

      <View style={styles.grid}>
        {evidence.map((item, i) => {
          const col = evidenceColor(item.type, colors);
          const icon = evidenceIcon(item.type);
          return (
            <View
              key={i}
              style={[
                styles.chip,
                {
                  backgroundColor: isDark ? col + "12" : col + "10",
                  borderColor: col + "30",
                },
              ]}
            >
              <Ionicons name={icon} size={11} color={col} style={styles.chipIcon} />
              <View style={styles.chipText}>
                <Text style={[styles.chipLabel, { color: isDark ? "#64748b" : "#94a3b8" }]} numberOfLines={1}>
                  {item.label}
                </Text>
                <Text style={[styles.chipValue, { color: isDark ? "#e2e8f0" : "#1e293b" }]} numberOfLines={2}>
                  {item.value}
                </Text>
              </View>
            </View>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 12,
    overflow: "hidden",
    padding: 14,
    gap: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  headerAccent: {
    width: 22,
    height: 22,
    borderRadius: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  headerLabel: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 1.1,
  },
  grid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 7,
  },
  chip: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 6,
    borderRadius: 10,
    borderWidth: 1,
    paddingVertical: 7,
    paddingHorizontal: 9,
    minWidth: "46%",
    flex: 1,
  },
  chipIcon: {
    marginTop: 2,
    flexShrink: 0,
  },
  chipText: {
    flex: 1,
    gap: 1,
  },
  chipLabel: {
    fontSize: 9,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.5,
    textTransform: "uppercase",
  },
  chipValue: {
    fontSize: 11.5,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 16,
  },
});
