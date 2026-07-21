import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/shared/contexts/ThemeContext";

interface Props {
  label: string;
  count?: number;
  inline?: boolean;
  icon?: string;
  gradient?: [string, string];
}

export const SectionHeader = memo(function SectionHeader({ label, count, inline }: Props) {
  const { colors } = useTheme();

  if (inline) {
    return (
      <Text style={[styles.label, { color: colors.text }]} maxFontSizeMultiplier={1}>
        {label}
      </Text>
    );
  }

  if (count !== undefined) {
    return (
      <View style={[styles.row, { borderColor: colors.surfaceBorder + "60" }]}>
        <Text style={[styles.countLabel, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
          {label}
        </Text>
        <View style={[styles.line, { backgroundColor: colors.surfaceBorder }]} />
        <View style={[styles.badge, { backgroundColor: colors.surfaceBorder + "80" }]}>
          <Text style={[styles.badgeText, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
            {count}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.wrapper}>
      <Text style={[styles.label, { color: colors.text }]} maxFontSizeMultiplier={1}>
        {label}
      </Text>
    </View>
  );
});

export default SectionHeader;

const styles = StyleSheet.create({
  wrapper:    { marginBottom: 10, marginTop: 2 },
  label:      { fontSize: 14, fontFamily: "Inter_700Bold" },
  row: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            9,
    paddingVertical:   13,
    paddingHorizontal: 2,
    marginBottom:   2,
  },
  countLabel: {
    fontSize:      11,
    fontFamily:    "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1.3,
    flexShrink:    0,
  },
  line:  { flex: 1, height: 1 },
  badge: {
    borderRadius:    100,
    paddingHorizontal: 8,
    paddingVertical:   2,
    flexShrink:      0,
  },
  badgeText: { fontSize: 10, fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
});
