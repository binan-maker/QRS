import React from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import { CardHeader } from "../shared";

interface Props {
  content: string;
}

const GRADIENT: readonly [string, string] = ["#64748B", "#94A3B8"];
const EXPAND_THRESHOLD = 120;

export default function TextCard({ content }: Props) {
  const { colors, isDark } = useTheme();
  const [expanded, setExpanded] = React.useState(false);
  const isLong = content.length > EXPAND_THRESHOLD || content.includes("\n");
  const accentColor = GRADIENT[0];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: accentColor + "45" }]}>
      <LinearGradient colors={[accentColor + (isDark ? "18" : "0C"), "transparent"]} style={StyleSheet.absoluteFill} />
      <CardHeader
        icon="document-text-outline"
        gradient={GRADIENT}
        title="Text"
        content={content}
        colors={colors}
      />
      <View style={[styles.rawBox, { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder }]}>
        <Text
          style={[styles.rawText, { color: colors.text }]}
          selectable
          numberOfLines={expanded ? undefined : 4}
        >
          {content}
        </Text>
        {isLong && (
          <Pressable onPress={() => setExpanded(v => !v)}>
            <Text style={[styles.expand, { color: accentColor }]}>
              {expanded ? "Show less" : "Show more"}
            </Text>
          </Pressable>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card:    { borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, overflow: "hidden", gap: 12 },
  rawBox:  { borderRadius: 12, padding: 12, borderWidth: 1, gap: 6 },
  rawText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, letterSpacing: 0.1 },
  expand:  { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 4 },
});
