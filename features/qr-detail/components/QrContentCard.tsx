import React, { memo, useState, useMemo } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { parseAnyPaymentQr, isPaymentQr } from "@/services/analysis";

function CopyButton({ value }: { value: string }) {
  const { colors } = useTheme();
  const [copied, setCopied] = useState(false);
  const handleCopy = () => {
    Clipboard.setStringAsync(value).then(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setCopied(true);
      setTimeout(() => setCopied(false), 2200);
    });
  };
  return (
    <Pressable
      onPress={handleCopy}
      style={[styles.copyBtn, {
        backgroundColor: copied ? colors.safe + "18" : colors.surfaceLight,
        borderColor: copied ? colors.safe : colors.surfaceBorder,
      }]}
    >
      <Ionicons name={copied ? "checkmark-circle" : "copy-outline"} size={14} color={copied ? colors.safe : colors.textMuted} />
      <Text style={[styles.copyText, { color: copied ? colors.safe : colors.textMuted }]}>{copied ? "Copied!" : "Copy"}</Text>
    </Pressable>
  );
}

function CleanInfoCard({ title, stripText, copyText }: { title: string; stripText: string; copyText: string }) {
  const { colors } = useTheme();
  return (
    <Animated.View entering={FadeInDown.duration(260)}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <View style={styles.row}>
          <Text style={[styles.domain, { color: colors.text }]} numberOfLines={1}>{title}</Text>
          <CopyButton value={copyText} />
        </View>
        <View style={[styles.urlStrip, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.urlText, { color: colors.textSecondary }]} selectable numberOfLines={2}>{stripText}</Text>
        </View>
      </View>
    </Animated.View>
  );
}

function TextContentCard({ content }: { content: string }) {
  const { colors, isDark } = useTheme();
  const [expanded, setExpanded] = useState(false);
  const long = content.length > 120 || content.includes("\n");
  return (
    <Animated.View entering={FadeInDown.duration(260)}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <View style={styles.row}>
          <Text style={[styles.domain, { color: colors.text }]} numberOfLines={1}>Text</Text>
          <CopyButton value={content} />
        </View>
        <View style={[styles.rawBox, { backgroundColor: isDark ? colors.surfaceLight : colors.background, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.rawText, { color: colors.text }]} selectable numberOfLines={expanded ? undefined : 4}>{content}</Text>
          {long && (
            <Pressable onPress={() => setExpanded((v) => !v)}>
              <Text style={[styles.expand, { color: colors.primary }]}>{expanded ? "Show less" : "Show more"}</Text>
            </Pressable>
          )}
        </View>
      </View>
    </Animated.View>
  );
}

function WebsiteContentCard({ content, onOpenContent, hideOpenAction }: { content: string; onOpenContent: () => void; hideOpenAction?: boolean }) {
  const { colors } = useTheme();
  const fullUrl = /^https?:\/\//i.test(content) ? content : `https://${content}`;
  let hostname = content;
  try { hostname = new URL(fullUrl).hostname.replace(/^www\./, ""); } catch {}
  return (
    <Animated.View entering={FadeInDown.duration(260)}>
      <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
        <View style={styles.row}>
          <Text style={[styles.domain, { color: colors.text }]} numberOfLines={1}>{hostname}</Text>
          <CopyButton value={fullUrl} />
        </View>
        <View style={[styles.urlStrip, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
          <Text style={[styles.urlText, { color: colors.textSecondary }]} selectable numberOfLines={2}>{fullUrl}</Text>
        </View>
        {!hideOpenAction && (
          <Pressable onPress={onOpenContent} style={[styles.openBtn, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
            <Text style={[styles.openLabel, { color: colors.primary }]}>Open</Text>
            <Ionicons name="open-outline" size={14} color={colors.primary} />
          </Pressable>
        )}
      </View>
    </Animated.View>
  );
}

export const QrContentCard = memo(function QrContentCard({
  content, contentType, onOpenContent, hideOpenAction,
}: {
  content: string; contentType: string; onOpenContent: () => void; hideOpenAction?: boolean;
}) {
  const clean = content?.trim() || "";
  const isPayment = contentType === "payment" || isPaymentQr(clean);
  const parsed = useMemo(() => (isPayment ? parseAnyPaymentQr(clean) : null), [isPayment, clean]);

  if (isPayment) {
    const recipient = parsed?.vpa || parsed?.recipientId || clean;
    const title = parsed?.recipientName || recipient || "Payment";
    const parts = [recipient];
    if (parsed?.isAmountPreFilled && parsed.amount) {
      const amt = parseFloat(parsed.amount);
      const val = isNaN(amt) ? parsed.amount : amt.toLocaleString();
      parts.push(parsed.currency ? `${parsed.currency} ${val}` : val);
    }
    if (parsed?.note) parts.push(parsed.note);
    return <CleanInfoCard title={title} stripText={parts.join(" • ")} copyText={recipient} />;
  }
  if (contentType === "phone" || /^tel:/i.test(clean)) {
    const num = clean.replace(/^tel:/i, "").trim() || clean;
    return <CleanInfoCard title={num} stripText={num} copyText={num} />;
  }
  if (contentType === "email" || /^mailto:/i.test(clean)) {
    const em = clean.replace(/^mailto:/i, "").split("?")[0].trim() || clean;
    return <CleanInfoCard title={em} stripText={em} copyText={em} />;
  }
  if (contentType === "sms" || /^smsto?:/i.test(clean)) {
    const sms = clean.replace(/^smsto?:/i, "").trim() || clean;
    return <CleanInfoCard title={sms} stripText={sms} copyText={sms} />;
  }
  if (contentType === "url" || /^https?:\/\//i.test(clean)) {
    return <WebsiteContentCard content={clean} onOpenContent={onOpenContent} hideOpenAction={hideOpenAction} />;
  }
  return <TextContentCard content={clean} />;
});

const styles = StyleSheet.create({
  card: { borderRadius: 18, padding: 14, marginBottom: 12, borderWidth: 1, gap: 10 },
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
