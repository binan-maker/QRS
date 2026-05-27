import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { CardHeader, InfoGrid, InfoRow, Divider, OpenButton } from "../shared";
import { parseEmail } from "../parsers";

interface Props {
  content: string;
  onOpenContent: () => void;
  isDeactivated: boolean;
  hideOpenAction?: boolean;
}

const GRADIENT: readonly [string, string] = ["#1D4ED8", "#3B82F6"];

export default function EmailCard({ content, onOpenContent, isDeactivated, hideOpenAction }: Props) {
  const { colors, isDark } = useTheme();
  const data = parseEmail(content);
  const accentColor = GRADIENT[0];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: accentColor + "45" }]}>
      <LinearGradient colors={[accentColor + (isDark ? "18" : "0C"), "transparent"]} style={StyleSheet.absoluteFill} />
      <CardHeader
        icon="mail-outline"
        gradient={GRADIENT}
        title="Email"
        subtitle={data.email || undefined}
        content={content}
        colors={colors}
      />
      <InfoGrid accentColor={accentColor} colors={colors} isDark={isDark}>
        {data.email   ? <InfoRow label="To"      value={data.email}   icon="mail-outline"          accentColor={accentColor} colors={colors} selectable /> : null}
        {data.subject ? <><Divider colors={colors} /><InfoRow label="Subject" value={data.subject} icon="text-outline"           accentColor={accentColor} colors={colors} selectable /></> : null}
        {data.body    ? <><Divider colors={colors} /><InfoRow label="Body"    value={data.body}    icon="document-text-outline"  accentColor={accentColor} colors={colors} selectable numberOfLines={3} /></> : null}
      </InfoGrid>
      {!isDeactivated && !hideOpenAction && (
        <OpenButton label="Send Email" icon="mail-outline" gradient={GRADIENT} onPress={onOpenContent} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, overflow: "hidden", gap: 12 },
});
