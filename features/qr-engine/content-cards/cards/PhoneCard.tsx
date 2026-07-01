import React from "react";
import { View, StyleSheet } from "react-native";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { CardHeader, InfoGrid, InfoRow, OpenButton } from "../shared";
import { parsePhone } from "../parsers";

interface Props {
  content: string;
  onOpenContent: () => void;
  isDeactivated: boolean;
  hideOpenAction?: boolean;
}

const GRADIENT: readonly [string, string] = ["#059669", "#10B981"];

export default function PhoneCard({ content, onOpenContent, isDeactivated, hideOpenAction }: Props) {
  const { colors, isDark } = useTheme();
  const phone = parsePhone(content);
  const accentColor = GRADIENT[0];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <CardHeader icon="call-outline" gradient={GRADIENT} title="Phone Number" subtitle={phone || undefined} content={content} colors={colors} />
      <InfoGrid accentColor={accentColor} colors={colors} isDark={isDark}>
        <InfoRow label="Number" value={phone} icon="call-outline" accentColor={accentColor} colors={colors} selectable />
      </InfoGrid>
      {!isDeactivated && !hideOpenAction && (
        <OpenButton label="Call Number" icon="call-outline" gradient={GRADIENT} onPress={onOpenContent} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, overflow: "hidden", gap: 12 },
});
