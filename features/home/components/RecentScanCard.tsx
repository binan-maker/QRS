import React, { useCallback, useMemo } from "react";
import {
  View, Text, StyleSheet, Pressable, Platform,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import { Swipeable } from "react-native-gesture-handler";
import Animated, { FadeInRight } from "react-native-reanimated";
import * as Haptics from "@/lib/haptics";
import { parseAnyPaymentQr } from "@/lib/qr-analysis";
import {
  detectContentType,
  getContentTypeMeta,
  getContentDisplayLabel,
  getContentSubtitle,
  truncate,
  formatRelativeTime,
} from "@/lib/utils/formatters";
import type { LocalScan, HomeColors } from "@/features/home/types";

// ── Scan meta computation ─────────────────────────────────────────────────────

export function computeScanMeta(scan: LocalScan) {
  const contentType = detectContentType(scan.content);
  const ctMeta      = getContentTypeMeta(contentType);
  const gradient: [string, string] = ctMeta.gradient;
  const icon = ctMeta.icon as any;

  let displayLabel = getContentDisplayLabel(scan.content, contentType);
  let subtitle: string | null = getContentSubtitle(scan.content, contentType);
  let amountText: string | null = null;

  if (contentType === "payment" || contentType === "upi") {
    try {
      const parsed = parseAnyPaymentQr(scan.content);
      if (parsed?.amount)        amountText   = `₹${Number(parsed.amount).toLocaleString("en-IN")}`;
      if (parsed?.recipientName) displayLabel = parsed.recipientName;
      else if (parsed?.vpa)      displayLabel = parsed.vpa;
      if (parsed?.vpa && parsed?.recipientName) subtitle = parsed.vpa;
    } catch {}
  }

  return {
    contentType,
    gradient,
    icon,
    displayLabel: truncate(displayLabel, 36),
    subtitle,
    amountText,
  };
}

// ── Component ─────────────────────────────────────────────────────────────────

interface Props {
  scan:    LocalScan;
  index:   number;
  colors:  HomeColors;
  isDark:  boolean;
  onDelete:(id: string) => void;
}

export const RecentScanCard = React.memo(function RecentScanCard({
  scan, index, colors, isDark, onDelete,
}: Props) {
  const meta    = useMemo(() => computeScanMeta(scan), [scan]);
  const timeAgo = useMemo(() => formatRelativeTime(scan.scannedAt), [scan.scannedAt]);

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
    <Animated.View entering={FadeInRight.duration(350).delay(index * 55)}>
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
          <LinearGradient
            colors={meta.gradient}
            start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
            style={cardStyles.scanIconBox}
          >
            <Ionicons name={meta.icon} size={20} color="#fff" />
          </LinearGradient>

          <View style={cardStyles.scanBody}>
            <View style={cardStyles.scanTopRow}>
              <Text
                style={[cardStyles.scanContent, { color: colors.text }]}
                numberOfLines={1}
                maxFontSizeMultiplier={1}
              >
                {meta.displayLabel}
              </Text>
              {meta.amountText && (
                <View style={[cardStyles.scanAmountPill, { backgroundColor: colors.warning + "1E" }]}>
                  <Text style={[cardStyles.scanAmount, { color: colors.warning }]} maxFontSizeMultiplier={1}>
                    {meta.amountText}
                  </Text>
                </View>
              )}
            </View>
            {meta.subtitle && (
              <Text
                style={[cardStyles.scanSub, { color: colors.textSecondary }]}
                numberOfLines={1}
                maxFontSizeMultiplier={1}
              >
                {meta.subtitle}
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

// ── Styles ────────────────────────────────────────────────────────────────────

export const cardStyles = StyleSheet.create({
  scanItem: {
    flexDirection: "row", alignItems: "center",
    borderRadius: 20, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 13, gap: 13,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 10,
    shadowOpacity: 0.04,
    elevation: Platform.OS === "android" ? 0 : 1,
  },
  scanIconBox:    { width: 46, height: 46, borderRadius: 14, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  scanBody:       { flex: 1, minWidth: 0, gap: 4 },
  scanTopRow:     { flexDirection: "row", alignItems: "center", gap: 7 },
  scanContent:    { fontSize: 14, fontFamily: "Inter_700Bold", lineHeight: 20, flex: 1, letterSpacing: -0.1 },
  scanAmountPill: { paddingHorizontal: 7, paddingVertical: 2, borderRadius: 100, flexShrink: 0 },
  scanAmount:     { fontSize: 12, fontFamily: "Inter_700Bold" },
  scanSub:        { fontSize: 12, fontFamily: "Inter_400Regular", lineHeight: 16 },
  scanRight:      { alignItems: "flex-end", gap: 8, flexShrink: 0 },
  scanTime:       { fontSize: 11, fontFamily: "Inter_500Medium", letterSpacing: 0.1 },
  safeIndicator:  { width: 28, height: 28, borderRadius: 9, alignItems: "center", justifyContent: "center" },
  swipeDeleteBtn: { backgroundColor: "#DC2626", justifyContent: "center", alignItems: "center", width: 72, borderRadius: 20, marginLeft: 8, gap: 3 },
  swipeDeleteText:{ fontSize: 10, fontFamily: "Inter_600SemiBold", color: "#fff" },
});
