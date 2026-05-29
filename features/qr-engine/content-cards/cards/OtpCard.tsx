import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { CardHeader, OpenButton } from "../shared";

interface Props {
  content: string;
  onOpenContent: () => void;
  isDeactivated: boolean;
  hideOpenAction?: boolean;
}

const GRADIENT: readonly [string, string] = ["#0891B2", "#06B6D4"];

function parseOtp(content: string) {
  try {
    const u = new URL(content);
    const label   = decodeURIComponent(u.pathname.replace(/^\//, "")).split(":")?.[1] ?? u.pathname;
    const issuer  = u.searchParams.get("issuer") ?? "";
    const account = u.pathname.includes(":") ? u.pathname.split(":")[1] : label;
    const digits  = u.searchParams.get("digits") ?? "6";
    const period  = u.searchParams.get("period") ?? "30";
    const type    = u.hostname === "totp" ? "Time-based (TOTP)" : "Counter-based (HOTP)";
    return { issuer, account: decodeURIComponent(account), digits, period, type };
  } catch {
    return { issuer: "", account: "Authenticator Key", digits: "6", period: "30", type: "TOTP" };
  }
}

export default function OtpCard({ content, onOpenContent, isDeactivated, hideOpenAction }: Props) {
  const { colors, isDark } = useTheme();
  const [copied, setCopied] = useState(false);
  const otp = parseOtp(content);
  const accentColor = GRADIENT[0];

  async function handleCopy() {
    await Clipboard.setStringAsync(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: accentColor + "45" }]}>
      <LinearGradient colors={[accentColor + (isDark ? "18" : "0C"), "transparent"]} style={StyleSheet.absoluteFill} />
      <CardHeader icon="key-outline" gradient={GRADIENT} title="Authenticator Key" subtitle={otp.issuer || otp.account} content={content} colors={colors} />

      <View style={[styles.infoGrid, { backgroundColor: isDark ? "#0F172A55" : "#F0F9FF", borderColor: accentColor + "30" }]}>
        {otp.issuer ? (
          <View style={styles.infoRow}>
            <Ionicons name="business-outline" size={14} color={accentColor} />
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Issuer</Text>
            <Text style={[styles.infoValue, { color: colors.text }]}>{otp.issuer}</Text>
          </View>
        ) : null}
        {otp.account ? (
          <View style={styles.infoRow}>
            <Ionicons name="person-outline" size={14} color={accentColor} />
            <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Account</Text>
            <Text style={[styles.infoValue, { color: colors.text }]} numberOfLines={1}>{otp.account}</Text>
          </View>
        ) : null}
        <View style={styles.infoRow}>
          <Ionicons name="timer-outline" size={14} color={accentColor} />
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Type</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{otp.type}</Text>
        </View>
        <View style={styles.infoRow}>
          <Ionicons name="refresh-outline" size={14} color={accentColor} />
          <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Refresh</Text>
          <Text style={[styles.infoValue, { color: colors.text }]}>{otp.period}s</Text>
        </View>
      </View>

      <View style={[styles.warningRow, { backgroundColor: isDark ? "#2D1A00" : "#FFFBEB", borderColor: "#F59E0B40" }]}>
        <Ionicons name="warning-outline" size={14} color="#F59E0B" />
        <Text style={[styles.warningText, { color: "#B45309" }]}>Only add to your authenticator app if you recognize this account.</Text>
      </View>

      <Pressable onPress={handleCopy} style={({ pressed }) => [styles.copyBtn, {
        backgroundColor: copied ? "#0891B220" : isDark ? "#0891B215" : "#E0F7FA",
        borderColor: copied ? "#0891B260" : accentColor + "40",
        opacity: pressed ? 0.8 : 1,
      }]}>
        <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={14} color={accentColor} />
        <Text style={[styles.copyBtnText, { color: accentColor }]}>{copied ? "Copied Key!" : "Copy Key URI"}</Text>
      </Pressable>

      {!isDeactivated && !hideOpenAction && (
        <OpenButton label="Open in Authenticator" icon="key-outline" gradient={GRADIENT} onPress={onOpenContent} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card:        { borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, overflow: "hidden", gap: 12 },
  infoGrid:    { borderRadius: 12, borderWidth: 1, overflow: "hidden" },
  infoRow:     { flexDirection: "row", alignItems: "center", gap: 8, paddingHorizontal: 12, paddingVertical: 10, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: "#00000010" },
  infoLabel:   { fontSize: 11, fontFamily: "Inter_500Medium", width: 60 },
  infoValue:   { fontSize: 13, fontFamily: "Inter_600SemiBold", flex: 1 },
  warningRow:  { flexDirection: "row", alignItems: "flex-start", gap: 8, borderRadius: 10, borderWidth: 1, padding: 10 },
  warningText: { fontSize: 11, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 16 },
  copyBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 7, paddingVertical: 10, borderRadius: 12, borderWidth: 1 },
  copyBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
});
