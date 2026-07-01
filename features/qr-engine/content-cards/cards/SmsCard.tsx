import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { CardHeader, InfoGrid, InfoRow, Divider, OpenButton } from "../shared";
import { parseSms } from "../parsers";

interface Props {
  content: string;
  onOpenContent: () => void;
  isDeactivated: boolean;
  hideOpenAction?: boolean;
}

const GRADIENT: readonly [string, string] = ["#64748B", "#94A3B8"];

export default function SmsCard({ content, onOpenContent, isDeactivated, hideOpenAction }: Props) {
  const { colors, isDark } = useTheme();
  const data = parseSms(content);
  const accentColor = GRADIENT[0];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <CardHeader icon="chatbubble-outline" gradient={GRADIENT} title="SMS Message" subtitle={data.to || undefined} content={content} colors={colors} />
      <InfoGrid accentColor={accentColor} colors={colors} isDark={isDark}>
        {data.to   ? <InfoRow label="To"      value={data.to}   icon="person-outline"       accentColor={accentColor} colors={colors} selectable /> : null}
        {data.body ? <><Divider colors={colors} /><InfoRow label="Message" value={data.body} icon="chatbubble-outline" accentColor={accentColor} colors={colors} numberOfLines={3} /></> : null}
      </InfoGrid>
      {!isDeactivated && !hideOpenAction && (
        <OpenButton label="Send SMS" icon="chatbubble-outline" gradient={GRADIENT} onPress={onOpenContent} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, overflow: "hidden", gap: 12 },
});
