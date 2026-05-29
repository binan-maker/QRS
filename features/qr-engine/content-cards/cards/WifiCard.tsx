import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { CardHeader, InfoGrid, InfoRow, Divider, OpenButton } from "../shared";
import { parseWifi } from "../parsers";

interface Props {
  content: string;
  onOpenContent: () => void;
  isDeactivated: boolean;
  hideOpenAction?: boolean;
}

const GRADIENT: readonly [string, string] = ["#059669", "#10B981"];

export default function WifiCard({ content, onOpenContent, isDeactivated, hideOpenAction }: Props) {
  const { colors, isDark } = useTheme();
  const wifi = parseWifi(content);
  const accentColor = GRADIENT[0];

  if (!wifi) return null;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: accentColor + "45" }]}>
      <LinearGradient colors={[accentColor + (isDark ? "18" : "0C"), "transparent"]} style={StyleSheet.absoluteFill} />
      <CardHeader icon="wifi-outline" gradient={GRADIENT} title="Wi-Fi Network" subtitle={wifi.ssid} content={content} colors={colors} />
      <InfoGrid accentColor={accentColor} colors={colors} isDark={isDark}>
        <InfoRow label="Network" value={wifi.ssid} icon="wifi-outline" accentColor={accentColor} colors={colors} />
        <Divider colors={colors} />
        <InfoRow label="Security" value={wifi.security === "nopass" ? "Open" : wifi.security} icon="lock-closed-outline" accentColor={accentColor} colors={colors} />
        {wifi.password ? (<><Divider colors={colors} /><InfoRow label="Password" value={wifi.password} icon="key-outline" accentColor={accentColor} colors={colors} selectable /></>) : null}
        {wifi.hidden ? (<><Divider colors={colors} /><InfoRow label="Hidden" value="Yes" icon="eye-off-outline" accentColor={accentColor} colors={colors} /></>) : null}
      </InfoGrid>
      {!isDeactivated && !hideOpenAction && (
        <OpenButton label="Connect to Wi-Fi" icon="wifi-outline" gradient={GRADIENT} onPress={onOpenContent} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, overflow: "hidden", gap: 12 },
});
