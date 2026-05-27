import React from "react";
import { View, Text, StyleSheet, Pressable, Platform } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";

interface Props { content: string; }

export default function EncryptedCard({ content }: Props) {
  const { colors, isDark } = useTheme();
  const [copied, setCopied] = React.useState(false);

  const preview = content.length > 40 ? content.slice(0, 40) + "…" : content;
  const isBase64 = /^[A-Za-z0-9+/]{20,}={0,2}$/.test(content.trim());
  const isHex = /^[0-9a-fA-F]{40,}$/.test(content.trim());
  const dataHint = isBase64 ? "Base64-encoded" : isHex ? "Hex-encoded" : "Proprietary";

  async function handleCopy() {
    await Clipboard.setStringAsync(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    if (Platform.OS !== "android") {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }

  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.warning + "50" }]}>
      <LinearGradient colors={[colors.warning + (isDark ? "20" : "10"), "transparent"]} style={StyleSheet.absoluteFill} />
      <View style={styles.header}>
        <LinearGradient colors={[colors.warning, colors.warningShade ?? colors.warning]} style={styles.icon} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}>
          <Ionicons name="key-outline" size={22} color="#fff" />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={[styles.title, { color: colors.text }]}>Encrypted Data</Text>
          <Text style={[styles.sub, { color: colors.textMuted }]}>{dataHint} · {content.length} chars</Text>
        </View>
        <Pressable onPress={handleCopy} style={({ pressed }) => [styles.copyBtn, {
          backgroundColor: copied ? colors.safe + "18" : isDark ? colors.surfaceLight : colors.background,
          borderColor: copied ? colors.safe : colors.surfaceBorder,
          opacity: pressed ? 0.75 : 1,
        }]}>
          <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={14} color={copied ? colors.safe : colors.textMuted} />
          <Text style={[styles.copyText, { color: copied ? colors.safe : colors.textMuted }]}>{copied ? "Copied!" : "Copy"}</Text>
        </Pressable>
      </View>
      <View style={[styles.chip, { backgroundColor: colors.warning + "12", borderColor: colors.warning + "30" }]}>
        <Ionicons name="information-circle-outline" size={13} color={colors.warning} />
        <Text style={[styles.chipText, { color: colors.warning }]}>Proprietary or government-issued data — requires issuer's key to decode.</Text>
      </View>
      <View style={[styles.rawBox, { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder }]}>
        <Text style={[styles.rawText, { color: colors.textMuted }]} selectable numberOfLines={2}>{preview}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card:     { borderRadius: 20, padding: 16, marginBottom: 12, borderWidth: 1, overflow: "hidden", gap: 12 },
  header:   { flexDirection: "row", alignItems: "center", gap: 12 },
  icon:     { width: 48, height: 48, borderRadius: 15, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  title:    { fontSize: 16, fontFamily: "Inter_700Bold" },
  sub:      { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 2 },
  copyBtn:  { flexDirection: "row", alignItems: "center", gap: 4, height: 28, paddingHorizontal: 9, borderRadius: 8, borderWidth: 1 },
  copyText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  chip:     { flexDirection: "row", alignItems: "flex-start", gap: 7, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 9, borderWidth: 1 },
  chipText: { fontSize: 12, fontFamily: "Inter_400Regular", flex: 1, lineHeight: 17 },
  rawBox:   { borderRadius: 12, padding: 12, borderWidth: 1 },
  rawText:  { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20, letterSpacing: 0.1 },
});
