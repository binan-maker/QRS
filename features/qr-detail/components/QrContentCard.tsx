import React, { memo, useState } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";

function copyValue(value: string, onDone: () => void) {
  Clipboard.setStringAsync(value).then(() => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onDone();
  });
}

function TextContentCard({ content }: { content: string }) {
  const { colors, isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const long = content.length > 120 || content.includes("\n");
  return (
    <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
      <CardHeader title="Text" content={content} />
      <View style={[styles.rawBox, { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder }]}>
        <Text style={[styles.rawText, { color: colors.text }]} selectable numberOfLines={expanded ? undefined : 4}>{content}</Text>
        {long && <Pressable onPress={() => setExpanded((value) => !value)}>
          <Text style={[styles.expand, { color: colors.primary }]}>{expanded ? "Show less" : "Show more"}</Text>
        </Pressable>}
      </View>
    </View>
  );
}

function WebsiteContentCard({ content, onOpenContent, hideOpenAction }: { content: string; onOpenContent: () => void; hideOpenAction?: boolean }) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const fullUrl = /^https?:\/\//i.test(content) ? content : `https://${content}`;
  let hostname = content;
  try { hostname = new URL(fullUrl).hostname.replace(/^www\./, ""); } catch {}
  const handleCopy = () => copyValue(fullUrl, () => {
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  });
  return (
    <Animated.View entering={FadeInDown.duration(260)}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <View style={styles.row}>
          <Text style={[styles.domain, { color: colors.text }]} numberOfLines={1}>{hostname}</Text>
          <Pressable onPress={handleCopy} style={[styles.copyBtn, { backgroundColor: copied ? colors.safe + "18" : colors.surfaceLight, borderColor: copied ? colors.safe : colors.surfaceBorder }]}>
            <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={14} color={copied ? colors.safe : colors.textMuted} />
            <Text style={[styles.copyText, { color: copied ? colors.safe : colors.textMuted }]}>{copied ? "Copied!" : "Copy"}</Text>
          </Pressable>
        </View>
        <View style={[styles.urlStrip, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.urlText, { color: colors.textSecondary }]} selectable numberOfLines={2}>{fullUrl}</Text>
        </View>
        {!hideOpenAction && <Pressable onPress={onOpenContent} style={[styles.openBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
          <Text style={[styles.openLabel, { color: colors.primary }]}>Open</Text>
          <Ionicons name="open-outline" size={14} color={colors.primary} />
        </Pressable>}
      </View>
    </Animated.View>
  );
}

function CardHeader({ title, content }: { title: string; content: string }) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  return (
    <View style={styles.header}>
      <Text style={[styles.headerTitle, { color: colors.text }]}>{title}</Text>
      <Pressable onPress={() => copyValue(content, () => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      })} style={[styles.copyBtn, { backgroundColor: copied ? colors.safe + "18" : colors.surfaceLight, borderColor: copied ? colors.safe : colors.surfaceBorder }]}>
        <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={14} color={copied ? colors.safe : colors.textMuted} />
        <Text style={[styles.copyText, { color: copied ? colors.safe : colors.textMuted }]}>{copied ? "Copied!" : "Copy"}</Text>
      </Pressable>
    </View>
  );
}

export const QrContentCard = memo(function QrContentCard({
  content, contentType, onOpenContent, hideOpenAction,
}: {
  content: string;
  contentType: string;
  onOpenContent: () => void;
  hideOpenAction?: boolean;
}) {
  return contentType === "url"
    ? <WebsiteContentCard content={content} onOpenContent={onOpenContent} hideOpenAction={hideOpenAction} />
    : <TextContentCard content={content} />;
});

const styles = StyleSheet.create({
  card: { borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, gap: 10 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 12 },
  headerTitle: { fontSize: 15, fontFamily: "Inter_700Bold" },
  row: { flexDirection: "row", alignItems: "center", gap: 10 },
  domain: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  copyBtn: { flexDirection: "row", alignItems: "center", gap: 3, height: 28, paddingHorizontal: 8, borderRadius: 8, borderWidth: 1 },
  copyText: { fontSize: 10, fontFamily: "Inter_600SemiBold" },
  rawBox: { borderRadius: 12, padding: 12, borderWidth: 1, gap: 6 },
  rawText: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 20 },
  expand: { fontSize: 12, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  urlStrip: { borderRadius: 10, paddingVertical: 9, paddingHorizontal: 11, borderWidth: 1 },
  urlText: { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 18 },
  openBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, borderRadius: 12, paddingVertical: 11, borderWidth: 1 },
  openLabel: { fontSize: 13, fontFamily: "Inter_700Bold" },
});