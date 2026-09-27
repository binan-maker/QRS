import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
  count:    number;
  query:    string;
  colors:   any;
  fontSize: (n: number) => number;
}

const SearchResultsRow = memo(function SearchResultsRow({ count, query, colors, fontSize }: Props) {
  return (
    <View style={[styles.row, { borderBottomColor: colors.surfaceBorder }]}>
      <Text
        style={[styles.text, { color: colors.textMuted, fontSize: fontSize(12) }]}
        maxFontSizeMultiplier={1}
      >
        {count} result{count !== 1 ? "s" : ""} for "{query}"
      </Text>
    </View>
  );
});

export default SearchResultsRow;

const styles = StyleSheet.create({
  row: {
    paddingHorizontal: 20,
    paddingBottom:     8,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  text: { fontFamily: "Inter_400Regular" },
});
