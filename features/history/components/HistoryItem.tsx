import React, { useMemo, useCallback } from "react";
import { View, Text, Pressable, StyleSheet } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import Animated, { FadeInDown } from "react-native-reanimated";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { formatRelativeTime } from "@/shared/utils/formatters";

import type { HistoryItem as HistoryItemType } from "@/features/history/types";
import { parseAnyPaymentQr } from "@/services/analysis";
import { useQrMeta } from "@/features/qr-engine";

// Pure helpers — defined outside component to avoid re-creation per render.
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

// Pre-built animation specs — keyed by capped index (0–8) so the spec object
// is stable across re-renders.  FadeInDown.delay().duration() creates a new
// worklet config every call; hoisting to a module-level cache eliminates those
// allocations for the common first-render path.
const ENTERING_ANIMS = Array.from({ length: 9 }, (_, i) =>
  FadeInDown.delay(i * 30).duration(260)
);

interface HistoryItemProps {
  item: HistoryItemType;
  risk: "safe" | "caution" | "dangerous";
  onDelete: (item: HistoryItemType) => void;
  index?: number;
  showTime?: boolean;
}

const HistoryItem = React.memo(function HistoryItem({ item, risk, onDelete, index = 0, showTime = true }: HistoryItemProps) {
  const { colors, isDark } = useTheme();
  const { typeMeta, displayLabel, subtitle } = useQrMeta(item.content, item.contentType);

  const isFavorite = item.source === "favorite";
  const isSynced   = item.source === "cloud";

  const riskCfg = useMemo(() => getRiskConfig(risk, colors), [risk, colors]);

  const paymentData = useMemo(
    () => item.contentType === "payment" ? getPaymentData(item.content) : null,
    [item.contentType, item.content]
  );

  const formattedAmount = useMemo(
    () => paymentData?.amount ? formatAmount(paymentData.amount) : null,
    [paymentData]
  );

  const timeAgo  = useMemo(() => formatRelativeTime(item.scannedAt), [item.scannedAt]);
  const showRisk = (item.contentType === "url" || item.contentType === "payment") && risk !== "safe";

  // Memoize derived style values that involve tuple/string allocation.
  const gradient = useMemo<[string, string]>(() => {
    if (isFavorite) return [colors.danger, colors.dangerShade ?? colors.danger];
    if (risk === "dangerous" || risk === "caution")
      return [colors.warning, colors.warningShade ?? colors.warning];
    return typeMeta.gradient as [string, string];
  }, [isFavorite, risk, colors, typeMeta.gradient]);

  const accentBorder = useMemo(() => {
    if (showRisk && riskCfg) return riskCfg.borderColor;
    if (isFavorite)          return colors.danger + "35";
    return colors.surfaceBorder;
  }, [showRisk, riskCfg, isFavorite, colors]);

  const cardBg = isDark ? colors.surface : "#ffffff";

  // Stable entering animation from the pre-built cache.
  const enteringAnim = ENTERING_ANIMS[Math.min(index, 8)];

  const handlePress = useCallback(() => {
    if (item.qrCodeId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({
        pathname: "/qr-detail/[id]",
        params: { id: item.qrCodeId, hintContent: item.content, hintContentType: item.contentType },
      });
    }
  }, [item.qrCodeId, item.content, item.contentType]);

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
    <Animated.View entering={enteringAnim}>
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
            },
          ]}
        >
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
            {showTime && (
              <Text style={[styles.time, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
                {timeAgo}
              </Text>
            )}
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
    elevation: 0,
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
