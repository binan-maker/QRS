import React, { useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { parseWebsite } from "../parsers";

interface Props {
  content:         string;
  onOpenContent:   () => void;
  isDeactivated:   boolean;
  hideOpenAction?: boolean;
}

export default function WebsiteCard({ content, onOpenContent, isDeactivated, hideOpenAction }: Props) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);

  const site      = parseWebsite(content);
  const rawHost   = site?.hostname ?? content.replace(/^https?:\/\/(www\.)?/, "").split("/")[0];
  const domainOnly = rawHost.replace(/^www\./, "");
  const hasOpenAction = !isDeactivated && !hideOpenAction;

  async function handleCopy() {
    await Clipboard.setStringAsync(site?.fullUrl ?? content);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }

  return (
    <Animated.View entering={FadeInDown.duration(260)}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>

        {/* ── Domain row ── */}
        <View style={styles.row}>
          <Text style={[styles.domain, { color: colors.text }]} numberOfLines={1}>
            {domainOnly}
          </Text>
          <Pressable
            onPress={handleCopy}
            style={({ pressed }) => [styles.copyBtn, {
              backgroundColor: copied ? colors.safe + "18" : colors.surfaceLight,
              borderColor:     copied ? colors.safe : colors.surfaceBorder,
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

        {/* ── Full URL strip ── */}
        <View style={[styles.urlStrip, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.urlText, { color: colors.textSecondary }]} selectable numberOfLines={2}>
            {site?.fullUrl ?? content}
          </Text>
        </View>

        {/* ── Open button ── */}
        {hasOpenAction && (
          <Pressable
            onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); onOpenContent(); }}
            style={({ pressed }) => [styles.openBtn, {
              backgroundColor: colors.primaryDim,
              borderColor:     colors.primary + "30",
              opacity:   pressed ? 0.82 : 1,
              transform: [{ scale: pressed ? 0.975 : 1 }],
            }]}
          >
            <Text style={[styles.openLabel, { color: colors.primary }]}>Open</Text>
            <Ionicons name="open-outline" size={14} color={colors.primary} />
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderRadius: 18, padding: 14, marginBottom: 12,
    borderWidth: 1, gap: 10,
  },
  row: {
    flexDirection: "row", alignItems: "center", gap: 10,
  },
  domain: {
    fontSize: 15, fontFamily: "Inter_700Bold", flex: 1, letterSpacing: -0.2,
  },
  copyBtn: {
    flexDirection: "row", alignItems: "center", gap: 3,
    height: 26, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1, flexShrink: 0,
  },
  copyText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },

  urlStrip: {
    borderRadius: 10, paddingVertical: 9, paddingHorizontal: 11, borderWidth: 1,
  },
  urlText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18, letterSpacing: 0.05 },

  openBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 6, borderRadius: 12, paddingVertical: 11, borderWidth: 1,
  },
  openLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
});
