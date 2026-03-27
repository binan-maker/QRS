import React from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { formatRelativeTime } from "@/lib/utils/formatters";
import type { HistoryItem as HistoryItemType } from "@/hooks/useHistory";
import { parseAnyPaymentQr } from "@/lib/qr-analysis";

function getTypeMeta(type: string, colors: any): {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  color: string;
} {
  const map: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string; color: string }> = {
    url:      { icon: "globe-outline",         label: "URL",       color: colors.primary },
    phone:    { icon: "call-outline",          label: "Phone",     color: colors.safe },
    email:    { icon: "mail-outline",          label: "Email",     color: colors.primary },
    wifi:     { icon: "wifi-outline",          label: "Wi-Fi",     color: colors.primary },
    location: { icon: "location-outline",      label: "Location",  color: colors.danger },
    payment:  { icon: "card-outline",          label: "Payment",   color: colors.warning },
    sms:      { icon: "chatbubble-outline",    label: "SMS",       color: colors.primary },
    contact:  { icon: "person-outline",        label: "Contact",   color: colors.primary },
    event:    { icon: "calendar-outline",      label: "Event",     color: colors.primary },
    otp:      { icon: "lock-closed-outline",   label: "OTP",       color: colors.safe },
    app:      { icon: "apps-outline",          label: "App",       color: colors.primary },
    social:   { icon: "people-outline",        label: "Social",    color: colors.primary },
    media:    { icon: "play-circle-outline",   label: "Media",     color: colors.primary },
    document: { icon: "document-outline",      label: "Document",  color: colors.textSecondary },
    boarding: { icon: "airplane-outline",      label: "Boarding",  color: colors.primary },
    product:  { icon: "barcode-outline",       label: "Product",   color: colors.primary },
  };
  return map[type] ?? { icon: "document-text-outline", label: "Text", color: colors.textSecondary };
}

function getRiskColor(risk: string, colors: any): { icon: keyof typeof Ionicons.glyphMap; label: string; color: string } {
  if (risk === "dangerous") return { icon: "warning", label: "Danger", color: colors.danger };
  if (risk === "caution") return { icon: "alert-circle", label: "Caution", color: colors.warning };
  return { icon: "shield-checkmark", label: "Safe", color: colors.safe };
}

function shortenAddress(addr: string): string {
  if (addr.length <= 12) return addr;
  return addr.slice(0, 6) + "..." + addr.slice(-4);
}

function detectCrypto(content: string): { name: string; symbol: string } | null {
  const lower = content.toLowerCase();
  if (lower.startsWith("bitcoin:") || lower.includes("bc1")) return { name: "Bitcoin", symbol: "BTC" };
  if (lower.startsWith("ethereum:") || lower.includes("0x")) return { name: "Ethereum", symbol: "ETH" };
  if (lower.startsWith("litecoin:")) return { name: "Litecoin", symbol: "LTC" };
  if (lower.startsWith("tron:")) return { name: "Tron", symbol: "TRX" };
  return null;
}

function getPaymentData(content: string) {
  try {
    const parsed = parseAnyPaymentQr(content);
    return {
      name: parsed?.recipientName || parsed?.vpa || "Payment",
      amount: parsed?.amount || null,
      vpa: parsed?.vpa || null,
      raw: content,
    };
  } catch {
    return null;
  }
}

function getDisplayLabel(contentType: string, content: string): string {
  if (contentType === "payment") {
    try {
      const parsed = parseAnyPaymentQr(content);
      if (parsed?.recipientName) return parsed.recipientName;
      if (parsed?.vpa) return parsed.vpa;
      const crypto = detectCrypto(content);
      if (crypto) return crypto.name;
      if (parsed?.recipientId) return shortenAddress(parsed.recipientId);
      return "Payment QR";
    } catch {
      return "Payment QR";
    }
  }
  return content;
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
  const { colors } = useTheme();

  const isFavorite = item.source === "favorite";
  const isSynced   = item.source === "cloud";
  const displayLabel = getDisplayLabel(item.contentType, item.content);
  const meta       = getTypeMeta(item.contentType, colors);
  const riskCfg    = getRiskColor(risk, colors);
  const showRisk   = (item.contentType === "url" || item.contentType === "payment") && risk !== "safe";

  const iconColor: string = isFavorite
    ? colors.danger
    : risk === "dangerous"
      ? colors.danger
      : risk === "caution"
        ? colors.warning
        : meta.color;

  const paymentData = item.contentType === "payment" ? getPaymentData(item.content) : null;
  const formattedAmount = paymentData?.amount ? formatAmount(paymentData.amount) : null;

  function handlePress() {
    if (item.qrCodeId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: "/qr-detail/[id]", params: { id: item.qrCodeId } });
    }
  }

  return (
    <Pressable
      onPress={handlePress}
      style={({ pressed }) => [
        styles.card,
        {
          backgroundColor: colors.surface,
          borderColor: colors.surfaceBorder,
          opacity: pressed ? 0.88 : 1,
          transform: [{ scale: pressed ? 0.982 : 1 }],
        },
      ]}
    >
      <View style={[styles.iconBox, { backgroundColor: iconColor + "18" }]}>
        <Ionicons
          name={isFavorite ? "heart" : meta.icon}
          size={22}
          color={iconColor}
        />
      </View>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text
            style={[styles.content, { color: colors.text }]}
            numberOfLines={1}
            maxFontSizeMultiplier={1}
          >
            {paymentData ? paymentData.name : displayLabel}
          </Text>
          {formattedAmount && (
            <Text style={[styles.amount, { color: colors.warning }]} maxFontSizeMultiplier={1}>
              {formattedAmount}
            </Text>
          )}
        </View>

        {paymentData && !formattedAmount && (
          <Text style={[styles.subText, { color: colors.textMuted }]} numberOfLines={1} maxFontSizeMultiplier={1}>
            {paymentData.raw}
          </Text>
        )}

        <View style={styles.metaRow}>
          <View style={[styles.typeBadge, { backgroundColor: iconColor + "18", borderColor: iconColor + "35" }]}>
            <Text style={[styles.typeBadgeText, { color: iconColor }]} maxFontSizeMultiplier={1}>
              {isFavorite ? "Favorite" : meta.label}
            </Text>
          </View>

          {showRisk && (
            <View style={[styles.riskBadge, { backgroundColor: riskCfg.color + "20", borderColor: riskCfg.color + "40" }]}>
              <Ionicons name={riskCfg.icon} size={9} color={riskCfg.color} />
              <Text style={[styles.riskText, { color: riskCfg.color }]} maxFontSizeMultiplier={1}>
                {riskCfg.label}
              </Text>
            </View>
          )}

          {!isFavorite && (
            <Ionicons
              name={isSynced ? "cloud-done-outline" : "cloud-offline-outline"}
              size={11}
              color={isSynced ? colors.safe : colors.textMuted}
            />
          )}
        </View>
      </View>

      <View style={styles.right}>
        <Text style={[styles.time, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
          {formatRelativeTime(item.scannedAt)}
        </Text>
        {item.qrCodeId ? (
          <View style={[styles.chevronWrap, { backgroundColor: colors.surfaceBorder }]}>
            <Ionicons name="chevron-forward" size={13} color={colors.textSecondary} />
          </View>
        ) : (
          <View style={{ width: 26 }} />
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
    borderRadius: 18,
    marginBottom: 8,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 12,
    paddingVertical: 10,
    gap: 10,
  },
  iconBox: {
    width: 44,
    height: 44,
    borderRadius: 13,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 5,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  content: {
    fontSize: 14,
    fontFamily: "Inter_700Bold",
    lineHeight: 20,
    flex: 1,
  },
  amount: {
    fontSize: 13,
    fontFamily: "Inter_700Bold",
    flexShrink: 0,
  },
  subText: {
    fontSize: 12,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    flexWrap: "nowrap",
    overflow: "hidden",
  },
  typeBadge: {
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 100,
    borderWidth: 1,
    flexShrink: 0,
  },
  typeBadgeText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0,
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 100,
    borderWidth: 1,
    flexShrink: 0,
  },
  riskText: {
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0,
  },
  right: {
    alignItems: "flex-end",
    gap: 8,
    flexShrink: 0,
  },
  time: {
    fontSize: 12,
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.1,
  },
  chevronWrap: {
    width: 28,
    height: 28,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
});
