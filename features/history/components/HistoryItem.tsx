import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { formatRelativeTime } from "@/lib/utils/formatters";
import type { HistoryItem as HistoryItemType } from "@/hooks/useHistory";
import { parseAnyPaymentQr } from "@/lib/qr-analysis";

function getTypeMeta(type: string, colors: any): {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  gradient: [string, string];
} {
  const p = colors.primary;
  const pg: [string, string] = [p, colors.primaryShade ?? p];
  const map: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string; gradient: [string, string] }> = {
    url:      { icon: "globe",            label: "URL",       gradient: pg },
    phone:    { icon: "call",             label: "Phone",     gradient: pg },
    email:    { icon: "mail",             label: "Email",     gradient: pg },
    wifi:     { icon: "wifi",             label: "Wi-Fi",     gradient: pg },
    location: { icon: "location",         label: "Location",  gradient: pg },
    payment:  { icon: "card",             label: "Payment",   gradient: pg },
    sms:      { icon: "chatbubble",       label: "SMS",       gradient: pg },
    contact:  { icon: "person",           label: "Contact",   gradient: pg },
    event:    { icon: "calendar",         label: "Event",     gradient: pg },
    otp:      { icon: "lock-closed",      label: "OTP",       gradient: pg },
    app:      { icon: "apps",             label: "App",       gradient: pg },
    social:   { icon: "people",           label: "Social",    gradient: pg },
    media:    { icon: "play-circle",      label: "Media",     gradient: pg },
    document: { icon: "document-text",    label: "Document",  gradient: pg },
    boarding: { icon: "airplane",         label: "Boarding",  gradient: pg },
    product:  { icon: "barcode",          label: "Product",   gradient: pg },
  };
  return map[type] ?? { icon: "document-text", label: "Text", gradient: pg };
}

function getRiskConfig(risk: string, colors: any) {
  if (risk === "dangerous") return { icon: "alert-circle" as const, label: "Caution", color: colors.warning, bg: colors.warningDim ?? colors.warning + "18" };
  if (risk === "caution")   return { icon: "alert-circle" as const, label: "Caution", color: colors.warning, bg: colors.warningDim ?? colors.warning + "18" };
  return null;
}

function detectCrypto(content: string): { name: string } | null {
  const lower = content.toLowerCase();
  if (lower.startsWith("bitcoin:") || lower.includes("bc1")) return { name: "Bitcoin" };
  if (lower.startsWith("ethereum:") || lower.includes("0x")) return { name: "Ethereum" };
  if (lower.startsWith("litecoin:")) return { name: "Litecoin" };
  if (lower.startsWith("tron:")) return { name: "Tron" };
  return null;
}

function getPaymentData(content: string) {
  try {
    const parsed = parseAnyPaymentQr(content);
    return {
      name: parsed?.recipientName || parsed?.vpa || "Payment",
      amount: parsed?.amount || null,
      vpa: parsed?.vpa || null,
    };
  } catch { return null; }
}

function getDisplayLabel(contentType: string, content: string): string {
  if (contentType === "payment") {
    try {
      const parsed = parseAnyPaymentQr(content);
      if (parsed?.recipientName) return parsed.recipientName;
      if (parsed?.vpa) return parsed.vpa;
      const crypto = detectCrypto(content);
      if (crypto) return crypto.name;
      return "Payment QR";
    } catch { return "Payment QR"; }
  }
  if (contentType === "url") {
    try { return new URL(content).hostname.replace("www.", ""); }
    catch { return content; }
  }
  return content;
}

function getSubtitle(contentType: string, content: string): string | null {
  if (contentType === "url") {
    return content;
  }
  if (contentType === "payment") {
    try {
      const parsed = parseAnyPaymentQr(content);
      if (parsed?.vpa && parsed?.recipientName) return parsed.vpa;
    } catch {}
    return null;
  }
  if (content.length > 48) return content.slice(0, 48) + "…";
  return null;
}

function formatAmount(amount?: number | string) {
  if (!amount) return null;
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

interface HistoryItemProps {
  item: HistoryItemType;
  risk: "safe" | "caution" | "dangerous";
  onDelete: (item: HistoryItemType) => void;
}

const HistoryItem = React.memo(function HistoryItem({ item, risk, onDelete: _onDelete }: HistoryItemProps) {
  const { colors, isDark } = useTheme();

  const isFavorite = item.source === "favorite";
  const isSynced   = item.source === "cloud";
  const displayLabel = getDisplayLabel(item.contentType, item.content);
  const subtitle = getSubtitle(item.contentType, item.content);
  const meta = getTypeMeta(item.contentType, colors);
  const riskCfg = getRiskConfig(risk, colors);
  const showRisk = (item.contentType === "url" || item.contentType === "payment") && risk !== "safe";

  const gradient: [string, string] = isFavorite
    ? [colors.danger, colors.dangerShade ?? colors.danger]
    : (risk === "dangerous" || risk === "caution")
      ? [colors.warning, colors.warningShade ?? colors.warning]
      : meta.gradient;

  const paymentData = item.contentType === "payment" ? getPaymentData(item.content) : null;
  const formattedAmount = paymentData?.amount ? formatAmount(paymentData.amount) : null;

  function handlePress() {
    if (item.qrCodeId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: "/qr-detail/[id]", params: { id: item.qrCodeId } });
    }
  }

  const cardBg = isDark ? colors.surface : "#ffffff";
  const accentBorder = showRisk && riskCfg
    ? riskCfg.color + "50"
    : isFavorite
      ? colors.danger + "35"
      : colors.surfaceBorder;

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: cardBg,
          borderColor: accentBorder,
          opacity: pressed ? 0.9 : 1,
          transform: [{ scale: pressed ? 0.984 : 1 }],
          shadowColor: showRisk && riskCfg ? riskCfg.color : (isDark ? "#000" : "#0008FF"),
          shadowOpacity: isDark ? 0.18 : 0.05,
        },
      ]}
    >
      <LinearGradient
        colors={gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.iconBox}
      >
        <Ionicons
          name={isFavorite ? "heart" : meta.icon}
          size={21}
          color="#fff"
        />
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.titleRow}>
          <Text
            style={[styles.title, { color: colors.text }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1}
          >
            {paymentData ? paymentData.name : displayLabel}
          </Text>
          {formattedAmount && (
            <View style={[styles.amountPill, { backgroundColor: colors.warning + "1E" }]}>
              <Text style={[styles.amountText, { color: colors.warning }]} maxFontSizeMultiplier={1}>
                {formattedAmount}
              </Text>
            </View>
          )}
        </View>

        {subtitle && (
          <Text
            style={[styles.subtitle, { color: colors.textSecondary }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1}
          >
            {subtitle}
          </Text>
        )}

        <View style={styles.metaRow}>
          <View style={[styles.typeBadge, { backgroundColor: gradient[0] + "18", borderColor: gradient[0] + "38" }]}>
            <Text style={[styles.typeBadgeText, { color: gradient[0] }]} maxFontSizeMultiplier={1}>
              {isFavorite ? "Favorite" : meta.label}
            </Text>
          </View>

          {showRisk && riskCfg && (
            <View style={[styles.riskBadge, { backgroundColor: riskCfg.bg, borderColor: riskCfg.color + "45" }]}>
              <Ionicons name={riskCfg.icon} size={9} color={riskCfg.color} />
              <Text style={[styles.riskText, { color: riskCfg.color }]} maxFontSizeMultiplier={1}>
                {riskCfg.label}
              </Text>
            </View>
          )}

          <View style={styles.sourceRow}>
            <Ionicons
              name={isSynced ? "cloud-done-outline" : isFavorite ? "heart-outline" : "phone-portrait-outline"}
              size={10}
              color={isSynced ? colors.safe : colors.textMuted}
            />
            {item.scanSource && !isFavorite && (
              <Text style={[styles.sourceText, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
                {item.scanSource === "gallery" ? "Gallery" : item.scanSource === "viewed" ? "Viewed" : "Camera"}
              </Text>
            )}
          </View>
        </View>
      </View>

      <View style={styles.right}>
        <Text style={[styles.time, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
          {formatRelativeTime(item.scannedAt)}
        </Text>
        {item.qrCodeId ? (
          <View style={[styles.chevronWrap, { backgroundColor: gradient[0] + "18" }]}>
            <Ionicons name="chevron-forward" size={13} color={gradient[0]} />
          </View>
        ) : (
          <View style={{ width: 28 }} />
        )}
      </View>
    </Pressable>
  );
});

export default HistoryItem;

const styles = StyleSheet.create({
  card: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 13,
    gap: 13,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 12,
    elevation: 2,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 7,
  },
  title: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    lineHeight: 20,
    flex: 1,
    letterSpacing: -0.1,
  },
  subtitle: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 16,
  },
  amountPill: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 100,
    flexShrink: 0,
  },
  amountText: {
    fontSize: 12,
    fontFamily: "Inter_700Bold",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    marginTop: 1,
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2.5,
    borderRadius: 100,
    borderWidth: 1,
    flexShrink: 0,
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2.5,
    borderRadius: 100,
    borderWidth: 1,
    flexShrink: 0,
  },
  riskText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  sourceRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
  },
  sourceText: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
  },
  right: {
    alignItems: "flex-end",
    gap: 8,
    flexShrink: 0,
  },
  time: {
    fontSize: 11,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.1,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
