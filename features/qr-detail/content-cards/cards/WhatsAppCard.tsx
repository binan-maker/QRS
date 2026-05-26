import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import { CardHeader, InfoGrid, InfoRow, Divider, OpenButton } from "../shared";
import { parseWhatsApp } from "../parsers";

interface Props {
  content: string;
  onOpenContent: () => void;
  isDeactivated: boolean;
  hideOpenAction?: boolean;
}

const GRADIENT: readonly [string, string] = ["#16A34A", "#22C55E"];

export default function WhatsAppCard({ content, onOpenContent, isDeactivated, hideOpenAction }: Props) {
  const { colors, isDark } = useTheme();
  const data = parseWhatsApp(content);
  const accentColor = GRADIENT[0];

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: accentColor + "45" }]}>
      <LinearGradient colors={[accentColor + (isDark ? "18" : "0C"), "transparent"]} style={StyleSheet.absoluteFill} />
      <CardHeader
        icon="logo-whatsapp"
        gradient={GRADIENT}
        title="WhatsApp"
        subtitle={data.phone || undefined}
        content={content}
        colors={colors}
      />
      <InfoGrid accentColor={accentColor} colors={colors} isDark={isDark}>
        {data.phone ? <InfoRow label="Number"  value={data.phone} icon="logo-whatsapp"      accentColor={accentColor} colors={colors} selectable /> : null}
        {data.text  ? <><Divider colors={colors} /><InfoRow label="Message" value={data.text} icon="chatbubble-outline" accentColor={accentColor} colors={colors} numberOfLines={3} /></> : null}
      </InfoGrid>
      {!isDeactivated && !hideOpenAction && (
        <OpenButton label="Open WhatsApp" icon="logo-whatsapp" gradient={GRADIENT} onPress={onOpenContent} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, overflow: "hidden", gap: 12 },
});
