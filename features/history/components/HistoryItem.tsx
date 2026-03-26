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

type GradientPair = [string, string];

function getTypeMeta(type: string, colors: any): {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  gradient: GradientPair;
} {
  const primary: GradientPair = [colors.primary, colors.primaryShade];
  const safe: GradientPair = [colors.safe, colors.safeShade];
  const payment: GradientPair = [colors.warning, colors.warningShade];
  const danger: GradientPair = [colors.danger, colors.dangerShade];
  const neutral: GradientPair = [colors.textSecondary, colors.textMuted];

  const map: Record<string, { icon: keyof typeof Ionicons.glyphMap; label: string; gradient: GradientPair }> = {
    url:      { icon: "globe-outline",         label: "URL",       gradient: primary },
    phone:    { icon: "call-outline",          label: "Phone",     gradient: safe },
    email:    { icon: "mail-outline",          label: "Email",     gradient: primary },
    wifi:     { icon: "wifi-outline",          label: "Wi-Fi",     gradient: primary },
    location: { icon: "location-outline",      label: "Location",  gradient: danger },
    payment:  { icon: "card-outline",          label: "Payment",   gradient: payment },
    sms:      { icon: "chatbubble-outline",    label: "SMS",       gradient: primary },
    contact:  { icon: "person-outline",        label: "Contact",   gradient: primary },
    event:    { icon: "calendar-outline",      label: "Event",     gradient: primary },
    otp:      { icon: "lock-closed-outline",   label: "OTP",       gradient: safe },
    app:      { icon: "apps-outline",          label: "App",       gradient: primary },
    social:   { icon: "people-outline",        label: "Social",    gradient: primary },
    media:    { icon: "play-circle-outline",   label: "Media",     gradient: primary },
    document: { icon: "document-outline",      label: "Document",  gradient: neutral },
    boarding: { icon: "airplane-outline",      label: "Boarding",  gradient: primary },
    product:  { icon: "barcode-outline",       label: "Product",   gradient: primary },
  };
  return map[type] ?? { icon: "document-text-outline", label: "Text", gradient: neutral };
}

function getRiskConfig(risk: string, colors: any): { icon: keyof typeof Ionicons.glyphMap; label: string; gradient: GradientPair } {
  if (risk === "dangerous") return { icon: "warning", label: "Danger", gradient: [colors.danger, colors.dangerShade] };
  if (risk === "caution") return { icon: "alert-circle", label: "Caution", gradient: [colors.warning, colors.warningShade] };
  return { icon: "shield-checkmark", label: "Safe", gradient: [colors.safe, colors.safeShade] };
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
  const { colors, isDark } = useTheme();

  const isFavorite = item.source === "favorite";
  const isSynced   = item.source === "cloud";
  const displayLabel = getDisplayLabel(item.contentType, item.content);
  const meta       = getTypeMeta(item.contentType, colors);
  const riskCfg    = getRiskConfig(risk, colors);
  const showRisk   = (item.contentType === "url" || item.contentType === "payment") && risk !== "safe";

  const iconGradient: GradientPair = isFavorite
    ? [colors.danger, colors.dangerShade]
    : risk === "dangerous"
      ? [colors.danger, colors.dangerShade]
      : risk === "caution"
        ? [colors.warning, colors.warningShade]
        : meta.gradient;

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
      <LinearGradient
        colors={isDark
          ? [iconGradient[0] + "12", "transparent"]
          : [iconGradient[0] + "08", "transparent"]}
        start={{ x: 0, y: 0.5 }}
        end={{ x: 1, y: 0.5 }}
        style={StyleSheet.absoluteFill}
      />

      <LinearGradient
        colors={iconGradient}
        style={styles.iconBox}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <Ionicons
          name={isFavorite ? "heart" : meta.icon}
          size={22}
          color="#fff"
        />
      </LinearGradient>

      <View style={styles.body}>
        <View style={styles.topRow}>
          <Text
            style={[styles.content, { color: colors.text }]}
            numberOfLines={1}
          >
            {paymentData ? paymentData.name : displayLabel}
          </Text>
          {formattedAmount && (
            <Text style={[styles.amount, { color: colors.warning }]}>
              {formattedAmount}
            </Text>
          )}
        </View>

        {paymentData && !formattedAmount && (
          <Text style={[styles.subText, { color: colors.textMuted }]} numberOfLines={1}>
            {paymentData.raw}
          </Text>
        )}

        <View style={styles.metaRow}>
          <LinearGradient
            colors={iconGradient}
            style={styles.typeBadge}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.typeBadgeText}>
              {isFavorite ? "Favorite" : meta.label}
            </Text>
          </LinearGradient>

          {showRisk && (
            <View style={[styles.riskBadge, { backgroundColor: riskCfg.gradient[0] + "20", borderColor: riskCfg.gradient[0] + "40" }]}>
              <Ionicons name={riskCfg.icon} size={9} color={riskCfg.gradient[0]} />
              <Text style={[styles.riskText, { color: riskCfg.gradient[0] }]}>
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
        <Text style={[styles.time, { color: colors.textMuted }]}>
          {formatRelativeTime(item.scannedAt)}
        </Text>
        {item.qrCodeId ? (
          <LinearGradient
            colors={iconGradient}
            style={styles.chevronWrap}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="chevron-forward" size={13} color="#fff" />
          </LinearGradient>
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
    borderRadius: 22,
    marginBottom: 10,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 14,
  },
  iconBox: {
    width: 54,
    height: 54,
    borderRadius: 18,
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
    fontSize: 11,
    fontFamily: "Inter_400Regular",
    lineHeight: 15,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    flexWrap: "wrap",
  },
  typeBadge: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.4,
    color: "#fff",
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  riskText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.2,
  },
  right: {
    alignItems: "flex-end",
    gap: 8,
    flexShrink: 0,
  },
  time: {
    fontSize: 10,
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
