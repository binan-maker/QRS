import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { CardHeader, InfoGrid, InfoRow, Divider, OpenButton } from "../shared";
import { parseLocation } from "../parsers";

interface Props {
  content: string;
  onOpenContent: () => void;
  isDeactivated: boolean;
  hideOpenAction?: boolean;
}

const GRADIENT: readonly [string, string] = ["#DC2626", "#EF4444"];

export default function LocationCard({ content, onOpenContent, isDeactivated, hideOpenAction }: Props) {
  const { colors, isDark } = useTheme();
  const loc = parseLocation(content);
  const accentColor = GRADIENT[0];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: accentColor + "45" }]}>
      <LinearGradient colors={[accentColor + (isDark ? "18" : "0C"), "transparent"]} style={StyleSheet.absoluteFill} />
      <CardHeader icon="location-outline" gradient={GRADIENT} title="Location" subtitle={loc.label || undefined} content={content} colors={colors} />
      <InfoGrid accentColor={accentColor} colors={colors} isDark={isDark}>
        {loc.label ? <InfoRow label="Place"     value={loc.label} icon="location-outline" accentColor={accentColor} colors={colors} numberOfLines={2} /> : null}
        {loc.lat   ? <><Divider colors={colors} /><InfoRow label="Latitude"  value={loc.lat} icon="navigate-outline" accentColor={accentColor} colors={colors} selectable /></> : null}
        {loc.lon   ? <><Divider colors={colors} /><InfoRow label="Longitude" value={loc.lon} icon="navigate-outline" accentColor={accentColor} colors={colors} selectable /></> : null}
      </InfoGrid>
      {!isDeactivated && !hideOpenAction && (
        <OpenButton label="Open in Maps" icon="map-outline" gradient={GRADIENT} onPress={onOpenContent} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, overflow: "hidden", gap: 12 },
});
