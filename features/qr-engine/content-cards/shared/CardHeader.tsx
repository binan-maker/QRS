import React, { useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";
import type { AppColors } from "@/shared/constants/colors";

interface CardHeaderProps {
  /** @deprecated icon is accepted for call-site compat but not rendered */
  icon?: keyof typeof Ionicons.glyphMap;
  /** @deprecated gradient is accepted for call-site compat but not rendered */
  gradient?: readonly [string, string];
  title: string;
  subtitle?: string;
  content: string;
  colors: AppColors;
}

export function CardHeader({ title, subtitle, content, colors }: CardHeaderProps) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    await Clipboard.setStringAsync(content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <View style={styles.header}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.title, { color: colors.text }]}>{title}</Text>
        {subtitle ? (
          <Text style={[styles.subtitle, { color: colors.textMuted }]} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      <Pressable
        onPress={handleCopy}
        style={({ pressed }) => [styles.copyBtn, {
          backgroundColor: copied ? colors.safe + "18" : colors.surfaceLight,
          borderColor: copied ? colors.safe : colors.surfaceBorder,
          opacity: pressed ? 0.7 : 1,
        }]}
      >
        <Ionicons
          name={copied ? "checkmark-circle" : "copy-outline"}
          size={14}
          color={copied ? colors.safe : colors.textMuted}
        />
        <Text style={[styles.copyText, { color: copied ? colors.safe : colors.textMuted }]}>
          {copied ? "Copied!" : "Copy"}
        </Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  header:  { flexDirection: "row", alignItems: "center", gap: 12 },
  title:   { fontSize: 15, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 12, fontFamily: "Inter_400Regular", marginTop: 1 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 4, height: 28, paddingHorizontal: 9, borderRadius: 8, borderWidth: 1 },
  copyText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
});
