import React, { useCallback, useMemo } from "react";
import { View, Text, Pressable } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { Swipeable } from "react-native-gesture-handler";
import Animated, { FadeInRight } from "react-native-reanimated";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { parseAnyPaymentQr } from "@/services/analysis";
import { truncate, formatRelativeTime, detectContentType } from "@/shared/utils/formatters";
import { cardStyles } from "@/features/home/components/scanCardStyles";
import type { LocalScan } from "@/features/home/types";
import { QrTypeIcon, useQrMeta, getQrTypeMeta } from "@/features/qr-engine";
import {
  getContentDisplayLabel,
  getContentSubtitle,
} from "@/shared/utils/formatters/content-type";

// ── Legacy helper kept for backward-compat (used by home screen hooks) ────────
export function computeScanMeta(scan: LocalScan) {
  const contentType = detectContentType(scan.content);
  const typeMeta    = getQrTypeMeta(contentType);
  let displayLabel  = truncate(getContentDisplayLabel(scan.content, contentType), 36);
  const subtitle    = getContentSubtitle(scan.content, contentType);
  let amountText: string | null = null;

  if (contentType === "payment" || contentType === "upi") {
    try {
      const parsed = parseAnyPaymentQr(scan.content);
      if (parsed?.amount)        amountText   = `₹${Number(parsed.amount).toLocaleString("en-IN")}`;
      if (parsed?.recipientName) displayLabel = parsed.recipientName;
      else if (parsed?.vpa)      displayLabel = parsed.vpa;
    } catch {}
  }

  return { contentType, typeMeta, gradient: typeMeta.gradient, icon: typeMeta.icon, displayLabel, subtitle, amountText };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  scan:     LocalScan;
  index:    number;
  onDelete: (id: string) => void;
}

export const RecentScanCard = React.memo(function RecentScanCard({ scan, index, onDelete }: Props) {
  const { colors, isDark } = useTheme();
  const contentType = useMemo(() => detectContentType(scan.content), [scan.content]);
  const { typeMeta, displayLabel, subtitle } = useQrMeta(scan.content, contentType);
  const timeAgo = useMemo(() => formatRelativeTime(scan.scannedAt), [scan.scannedAt]);

  const amountText = useMemo(() => {
    if (contentType !== "payment" && contentType !== "upi") return null;
    try {
      const parsed = parseAnyPaymentQr(scan.content);
      if (parsed?.amount) return `₹${Number(parsed.amount).toLocaleString("en-IN")}`;
    } catch {}
    return null;
  }, [scan.content, contentType]);

  const enrichedLabel = useMemo(() => {
    if (contentType !== "payment" && contentType !== "upi") return displayLabel;
    try {
      const parsed = parseAnyPaymentQr(scan.content);
      if (parsed?.recipientName) return parsed.recipientName;
      if (parsed?.vpa) return parsed.vpa;
    } catch {}
    return displayLabel;
  }, [scan.content, contentType, displayLabel]);

  const handlePress = useCallback(() => {
    if (scan.qrCodeId) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      router.push({ pathname: "/qr-detail/[id]", params: { id: scan.qrCodeId } });
    }
  }, [scan.qrCodeId]);

  const handleDelete = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    onDelete(scan.id);
  }, [onDelete, scan.id]);

  const renderRightActions = useCallback(() => (
    <Pressable onPress={handleDelete} style={cardStyles.swipeDeleteBtn}>
      <Ionicons name="trash-outline" size={20} color="#fff" />
      <Text style={cardStyles.swipeDeleteText}>Delete</Text>
    </Pressable>
  ), [handleDelete]);

  return (
    <Animated.View entering={FadeInRight.duration(260).delay(Math.min(index, 4) * 22)}>
      <Swipeable renderRightActions={renderRightActions} overshootRight={false} friction={2}>
        <Pressable
          onPress={handlePress}
          style={({ pressed }) => [
            cardStyles.scanItem,
            {
              backgroundColor: isDark ? colors.surface : "#ffffff",
              borderColor:     colors.surfaceBorder,
              opacity:         pressed ? 0.9 : 1,
              transform:       [{ scale: pressed ? 0.984 : 1 }],
            },
          ]}
        >
          <QrTypeIcon contentType={contentType} size={44} />

          <View style={cardStyles.scanBody}>
            <View style={cardStyles.scanTopRow}>
              <Text
                style={[cardStyles.scanContent, { color: colors.text }]}
                numberOfLines={1}
                maxFontSizeMultiplier={1}
              >
                {enrichedLabel}
              </Text>
              {amountText && (
                <View style={[cardStyles.scanAmountPill, { backgroundColor: colors.warning + "1E" }]}>
                  <Text style={[cardStyles.scanAmount, { color: colors.warning }]} maxFontSizeMultiplier={1}>
                    {amountText}
                  </Text>
                </View>
              )}
            </View>
            {subtitle && (
              <Text
                style={[cardStyles.scanSub, { color: colors.textSecondary }]}
                numberOfLines={1}
                maxFontSizeMultiplier={1}
              >
                {subtitle}
              </Text>
            )}
          </View>

          <View style={cardStyles.scanRight}>
            <Text style={[cardStyles.scanTime, { color: colors.textMuted }]} maxFontSizeMultiplier={1}>
              {timeAgo}
            </Text>
            <View style={[cardStyles.safeIndicator, { backgroundColor: colors.safe + "18" }]}>
              <Ionicons name="shield-checkmark" size={13} color={colors.safe} />
            </View>
          </View>
        </Pressable>
      </Swipeable>
    </Animated.View>
  );
});
