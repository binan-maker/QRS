import React from "react";
import { View, Text, StyleSheet } from "react-native";

interface Props {
  text: string;
}

export default function FeatureRow({ text }: Props) {
  return (
    <View style={styles.row}>
      <View style={styles.dot} />
      <Text style={styles.text} numberOfLines={1}>{text}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  row:  { flexDirection: "row", alignItems: "center", gap: 8 },
  dot:  { width: 4, height: 4, borderRadius: 2, backgroundColor: "rgba(255,255,255,0.55)", flexShrink: 0 },
  text: { fontSize: 12, fontFamily: "Inter_400Regular", color: "rgba(255,255,255,0.72)", flex: 1 },
});
