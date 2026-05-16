import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
  label:  string;
  count:  number;
  colors: any;
}

const SectionHeader = React.memo(function SectionHeader({ label, count, colors }: Props) {
  return (
    <View style={[styles.row, { borderColor: colors.surfaceBorder + "60" }]}>
      <Text
        style={[styles.label, { color: colors.textMuted }]}
        maxFontSizeMultiplier={1}
      >
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
});

export default SectionHeader;

const styles = StyleSheet.create({
  row: {
    flexDirection:  "row",
    alignItems:     "center",
    gap:            9,
    paddingVertical: 13,
    paddingHorizontal: 2,
    marginBottom:   2,
  },
  label: {
    fontSize:      11,
    fontFamily:    "Inter_700Bold",
    textTransform: "uppercase",
    letterSpacing: 1.3,
    flexShrink:    0,
  },
  line: { flex: 1, height: 1 },
  badge: {
    borderRadius:    100,
    paddingHorizontal: 8,
    paddingVertical: 2,
    flexShrink:      0,
  },
  badgeText: {
    fontSize:     10,
    fontFamily:   "Inter_700Bold",
    letterSpacing: 0.2,
  },
});
