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

const TYPE_META: Record<string, {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  gradient: [string, string];
}> = {
  url:      { icon: "globe-outline",         label: "URL",       gradient: ["#006FFF", "#00CFFF"] },
  phone:    { icon: "call-outline",          label: "Phone",     gradient: ["#10B981", "#06B6D4"] },
  email:    { icon: "mail-outline",          label: "Email",     gradient: ["#8B5CF6", "#EC4899"] },
  wifi:     { icon: "wifi-outline",          label: "Wi-Fi",     gradient: ["#3B82F6", "#6366F1"] },
  location: { icon: "location-outline",      label: "Location",  gradient: ["#EF4444", "#F97316"] },
  payment:  { icon: "card-outline",          label: "Payment",   gradient: ["#F59E0B", "#F97316"] },
  sms:      { icon: "chatbubble-outline",    label: "SMS",       gradient: ["#06B6D4", "#3B82F6"] },
  contact:  { icon: "person-outline",        label: "Contact",   gradient: ["#10B981", "#3B82F6"] },
  event:    { icon: "calendar-outline",      label: "Event",     gradient: ["#F59E0B", "#EF4444"] },
  otp:      { icon: "lock-closed-outline",   label: "OTP",       gradient: ["#6366F1", "#8B5CF6"] },
  app:      { icon: "apps-outline",          label: "App",       gradient: ["#06B6D4", "#6366F1"] },
  social:   { icon: "people-outline",        label: "Social",    gradient: ["#EC4899", "#8B5CF6"] },
  media:    { icon: "play-circle-outline",   label: "Media",     gradient: ["#EF4444", "#EC4899"] },
  document: { icon: "document-outline",      label: "Document",  gradient: ["#6B7280", "#9CA3AF"] },
  boarding:  { icon: "airplane-outline",     label: "Boarding",  gradient: ["#006FFF", "#6366F1"] },
  product:  { icon: "barcode-outline",       label: "Product",   gradient: ["#10B981", "#F59E0B"] },
};

const RISK_CONFIG = {
  dangerous: { icon: "warning" as const,      label: "Danger",  gradient: ["#EF4444", "#DC2626"] as [string, string] },
  caution:   { icon: "alert-circle" as const, label: "Caution", gradient: ["#F59E0B", "#F97316"] as [string, string] },
  safe:      { icon: "shield-checkmark" as const, label: "Safe", gradient: ["#10B981", "#06B6D4"] as [string, string] },
};

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

function getTypeMeta(type: string) {
  return TYPE_META[type] ?? { icon: "document-text-outline" as keyof typeof Ionicons.glyphMap, label: "Text", gradient: ["#6B7280", "#9CA3AF"] as [string, string] };
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
  const meta       = getTypeMeta(item.contentType);
  const riskCfg    = RISK_CONFIG[risk];
  const showRisk   = (item.contentType === "url" || item.contentType === "payment") && risk !== "safe";

  const iconGradient: [string, string] = isFavorite
    ? ["#FF4D6A", "#F97316"]
    : risk === "dangerous"
      ? ["#EF4444", "#DC2626"]
      : risk === "caution"
        ? ["#F59E0B", "#F97316"]
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
          backgroundColor: isDark ? colors.surface : colors.surface,
          borderColor: isDark ? colors.surfaceBorder : colors.surfaceBorder,
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
          size={20}
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
            <Text style={[styles.amount, { color: iconGradient[0] }]}>
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
    borderRadius: 20,
    marginBottom: 10,
    borderWidth: 1,
    overflow: "hidden",
    paddingHorizontal: 14,
    paddingVertical: 14,
    gap: 14,
  },
  iconBox: {
    width: 48,
    height: 48,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  body: {
    flex: 1,
    minWidth: 0,
    gap: 6,
  },
  topRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 6,
  },
  content: {
    fontSize: 14,
    fontFamily: "Inter_600SemiBold",
    lineHeight: 19,
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
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 100,
  },
  typeBadgeText: {
    fontSize: 10,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.3,
    color: "#fff",
  },
  riskBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 7,
    paddingVertical: 3,
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
    gap: 7,
    flexShrink: 0,
  },
  time: {
    fontSize: 10,
    fontFamily: "Inter_400Regular",
    letterSpacing: 0.1,
  },
  chevronWrap: {
    width: 26,
    height: 26,
    borderRadius: 9,
    alignItems: "center",
    justifyContent: "center",
  },
});
