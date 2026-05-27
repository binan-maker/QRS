import React, { useMemo, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Swipeable } from "react-native-gesture-handler";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { formatRelativeTime, getContentTypeMeta, getContentDisplayLabel, getContentSubtitle } from "@/shared/utils/formatters";
import type { HistoryItem as HistoryItemType } from "@/features/history/types";
import { parseAnyPaymentQr } from "@/lib/qr-analysis";

function getTypeMeta(type: string): {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  gradient: [string, string];
} {
  const m = getContentTypeMeta(type);
  return { icon: m.icon as keyof typeof Ionicons.glyphMap, label: m.label, gradient: m.gradient };
}

function getRiskConfig(risk: string, colors: any) {
  if (risk === "dangerous" || risk === "caution") return {
    icon: "alert-circle" as const,
    label: "Caution",
    color: colors.warning,
    bg: colors.warningDim ?? colors.warning + "18",
    borderColor: colors.warning + "50",
  };
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

function formatAmount(amount?: number | string) {
  if (!amount) return null;
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

interface HistoryItemProps {
  item: HistoryItemType;
  risk: "safe" | "caution" | "dangerous";
  onDelete: (item: HistoryItemType) => void;
  index?: number;
}

const HistoryItem = React.memo(function HistoryItem({ item, risk, onDelete, index = 0 }: HistoryItemProps) {
  const { colors, isDark } = useTheme();

  const isFavorite = item.source === "favorite";
  const isSynced   = item.source === "cloud";

  const displayLabel = useMemo(() => getContentDisplayLabel(item.content, item.contentType), [item.contentType, item.content]);
  const subtitle     = useMemo(() => getContentSubtitle(item.content, item.contentType), [item.contentType, item.content]);
  const meta         = useMemo(() => getTypeMeta(item.contentType), [item.contentType]);
  const riskCfg      = useMemo(() => getRiskConfig(risk, colors), [risk, colors]);
  const paymentData  = useMemo(
    () => item.contentType === "payment" ? getPaymentData(item.content) : null,
    [item.contentType, item.content]
  );
  const formattedAmount = useMemo(
    () => paymentData?.amount ? formatAmount(paymentData.amount) : null,
    [paymentData]
  );
  const timeAgo = useMemo(() => formatRelativeTime(item.scannedAt), [item.scannedAt]);

  const showRisk = (item.contentType === "url" || item.contentType === "payment") && risk !== "safe";

  const gradient: [string, string] = isFavorite
    ? [colors.danger, colors.dangerShade ?? colors.danger]
    : (risk === "dangerous" || risk === "caution")
        ? [colors.warning, colors.warningShade ?? colors.warning]
        : meta.gradient;

  const accentBorder = showRisk && riskCfg
    ? riskCfg.borderColor
    : isFavorite
      ? colors.danger + "35"
      : colors.surfaceBorder;

  const cardBg = isDark ? colors.surface : "#ffffff";

  const handlePress = useCallback(() => {
    if (item.qrCodeId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: "/qr-detail/[id]", params: { id: item.qrCodeId } });
    }
  }, [item.qrCodeId]);

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete(item);
  }, [onDelete, item]);

  const renderRightActions = useCallback(() => (
    <Pressable onPress={handleDelete} style={styles.swipeDeleteBtn}>
      <Ionicons name="trash-outline" size={20} color="#fff" />
      <Text style={styles.swipeDeleteText}>Delete</Text>
    </Pressable>
  ), [handleDelete]);

  return (
    <Animated.View entering={FadeInDown.delay(Math.min(index, 5) * 22).duration(260)}>
      <Swipeable
        renderRightActions={renderRightActions}
        overshootRight={false}
        friction={2}
      >
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
            <Ionicons name={isFavorite ? "heart" : meta.icon} size={21} color="#fff" />
          </LinearGradient>

          <View style={styles.body}>
            <View style={styles.titleRow}>
              <Text style={[styles.title, { color: colors.text }]} numberOfLines={1} maxFontSizeMultiplier={1}>
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
              <Text style={[styles.subtitle, { color: colors.textSecondary }]} numberOfLines={1} maxFontSizeMultiplier={1}>
                {subtitle}
              </Text>
            )}

            <View style={styles.metaRow}>
              {showRisk && riskCfg && (
                <View style={[styles.riskBadge, { backgroundColor: riskCfg.bg, borderColor: riskCfg.color + "45" }]}>
                  <Ionicons name={riskCfg.icon} size={9} color={riskCfg.color} />
                  <Text style={[styles.riskText, { color: riskCfg.color }]} maxFontSizeMultiplier={1}>
                    {riskCfg.label}
                  </Text>
                </View>
              )}
              {isSynced && (
                <Ionicons name="cloud-done-outline" size={12} color={colors.safe} />
              )}
            </View>
          </View>

          <View style={styles.right}>
            <Text style={[styles.time, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
              {timeAgo}
            </Text>
            <View style={[styles.chevronWrap, { backgroundColor: gradient[0] + "18" }]}>
              <Ionicons name="chevron-forward" size={13} color={gradient[0]} />
            </View>
          </View>
        </Pressable>
      </Swipeable>
    </Animated.View>
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
  swipeDeleteBtn: {
    backgroundColor: "#DC2626",
    justifyContent: "center",
    alignItems: "center",
    width: 72,
    borderRadius: 20,
    marginLeft: 8,
    marginBottom: 10,
    gap: 3,
  },
  swipeDeleteText: {
    fontSize: 10,
    fontFamily: "Inter_600SemiBold",
    color: "#fff",
  },
});
