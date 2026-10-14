import React, { memo } from "react";
import { View, Text, StyleSheet } from "react-native";
import { useTheme } from "@/shared/contexts/ThemeContext";

interface Props {
  count: number;
  query: string;
}

const SearchResultsRow = memo(function SearchResultsRow({ count, query }: Props) {
  const { colors } = useTheme();

  return (
    <View style={[styles.row, { borderBottomColor: colors.surfaceBorder }]}>
      <Text
        style={[styles.text, { color: colors.textMuted }]}
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
  text: {
    fontFamily: "Inter_400Regular",
    fontSize:   12,
  },
});
