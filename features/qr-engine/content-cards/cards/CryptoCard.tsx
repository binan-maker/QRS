import React from "react";
import { View, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { CardHeader, InfoGrid, InfoRow, Divider, OpenButton } from "../shared";
import { parseCrypto } from "../parsers";

interface Props {
  content: string;
  onOpenContent: () => void;
  isDeactivated: boolean;
  hideOpenAction?: boolean;
}

const GRADIENT: readonly [string, string] = ["#D97706", "#F59E0B"];

export default function CryptoCard({ content, onOpenContent, isDeactivated, hideOpenAction }: Props) {
  const { colors, isDark } = useTheme();
  const data = parseCrypto(content);
  const accentColor = GRADIENT[0];

  const shortAddress = data.address.length > 20
    ? data.address.slice(0, 10) + "…" + data.address.slice(-8)
    : data.address;

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: accentColor + "45" }]}>
      <LinearGradient colors={[accentColor + (isDark ? "18" : "0C"), "transparent"]} style={StyleSheet.absoluteFill} />
      <CardHeader icon="logo-bitcoin" gradient={GRADIENT} title={data.coin ? `${data.coin} Address` : "Crypto Address"} subtitle={shortAddress || undefined} content={content} colors={colors} />
      <InfoGrid accentColor={accentColor} colors={colors} isDark={isDark}>
        {data.coin ? <InfoRow label="Coin"    value={data.coin}    icon="logo-bitcoin" accentColor={accentColor} colors={colors} /> : null}
        {data.address ? (
          <>
            {data.coin ? <Divider colors={colors} /> : null}
            <InfoRow label="Address" value={data.address} icon="copy-outline" accentColor={accentColor} colors={colors} selectable numberOfLines={2} />
          </>
        ) : null}
        {data.amount ? (
          <>
            <Divider colors={colors} />
            <InfoRow label="Amount" value={data.amount} icon="cash-outline" accentColor={accentColor} colors={colors} />
          </>
        ) : null}
      </InfoGrid>
      {!isDeactivated && !hideOpenAction && (
        <OpenButton label="Open Wallet" icon="wallet-outline" gradient={GRADIENT} onPress={onOpenContent} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, overflow: "hidden", gap: 12 },
});
