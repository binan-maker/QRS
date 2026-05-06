import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/contexts/ThemeContext";
import type { Evidence } from "@/lib/analysis/types";

interface Props {
  title: string;
  evidence: Evidence[];
}

function evidenceColor(type: Evidence["type"], colors: any): string {
  switch (type) {
    case "positive": return "#22c55e";
    case "negative": return colors.danger;
    case "neutral":  return colors.textMuted;
    case "info":     return colors.primary;
  }
}

function evidenceIcon(type: Evidence["type"]): keyof typeof Ionicons.glyphMap {
  switch (type) {
    case "positive": return "checkmark-circle";
    case "negative": return "close-circle";
    case "neutral":  return "remove-circle-outline";
    case "info":     return "information-circle-outline";
  }
}

export default function EvidenceCard({ title, evidence }: Props) {
  const { colors } = useTheme();
  const [expanded, setExpanded] = useState(false);

  if (!evidence || evidence.length === 0) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <Pressable
        style={styles.header}
        onPress={() => setExpanded(v => !v)}
        hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
      >
        <Ionicons name="analytics-outline" size={13} color={colors.textMuted} />
        <Text style={[styles.headerLabel, { color: colors.textMuted }]}>{title}</Text>
        <Ionicons
          name={expanded ? "chevron-up" : "chevron-down"}
          size={13}
          color={colors.textMuted}
          style={{ marginLeft: "auto" as any }}
        />
      </Pressable>

      {expanded && (
        <View style={[styles.list, { borderTopColor: colors.surfaceBorder }]}>
          {evidence.map((item, i) => {
            const col = evidenceColor(item.type, colors);
            const icon = evidenceIcon(item.type);
            return (
              <View key={i} style={styles.row}>
                <Ionicons name={icon} size={13} color={col} style={styles.rowIcon} />
                <View style={styles.rowText}>
                  <Text style={[styles.rowLabel, { color: colors.textMuted }]} numberOfLines={1}>
                    {item.label}
                  </Text>
                  <Text style={[styles.rowValue, { color: colors.text }]} numberOfLines={2}>
                    {item.value}
                  </Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 10,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 13,
    paddingVertical: 11,
  },
  headerLabel: {
    fontSize: 12,
    fontFamily: "Inter_600SemiBold",
  },
  list: {
    borderTopWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 13,
    paddingVertical: 8,
    gap: 8,
  },
  row: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    paddingVertical: 3,
  },
  rowIcon: { marginTop: 2, flexShrink: 0 },
  rowText: { flex: 1 },
  rowLabel: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.4,
    textTransform: "uppercase",
    marginBottom: 1,
  },
  rowValue: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 17,
  },
});
