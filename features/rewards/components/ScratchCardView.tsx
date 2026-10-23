import React, { useState, useRef, useCallback } from "react";
import {
  View,
  Text,
  StyleSheet,
  Pressable,
  PanResponder,
  type GestureResponderEvent,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { UserScratchCard } from "@/services/rewards/types";

interface ScratchCardViewProps {
  card: UserScratchCard;
  onReveal?: (cardId: string) => Promise<void> | void;
  onOpenDetails?: (card: UserScratchCard) => void;
  compact?: boolean;
}

const GRID_ROWS = 4;
const GRID_COLS = 4;
const TOTAL_CELLS = GRID_ROWS * GRID_COLS;
const REVEAL_THRESHOLD = 0.35; // 35% scratched triggers reveal

export function ScratchCardView({
  card,
  onReveal,
  onOpenDetails,
  compact = false,
}: ScratchCardViewProps) {
  const { colors, isDark } = useTheme();
  const [scratchedCells, setScratchedCells] = useState<Set<number>>(new Set());
  const [isRevealing, setIsRevealing] = useState(false);
  const [copied, setCopied] = useState(false);

  const cardLayoutRef = useRef<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 280,
    height: 190,
  });

  const isCardRevealed = card.status === "revealed";

  const triggerReveal = useCallback(async () => {
    if (isRevealing || isCardRevealed) return;
    setIsRevealing(true);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    try {
      if (onReveal) {
        await onReveal(card.id);
      }
    } finally {
      setIsRevealing(false);
    }
  }, [card.id, isRevealing, isCardRevealed, onReveal]);

  const handleTouchAt = useCallback(
    (pageX: number, pageY: number) => {
      if (isCardRevealed || isRevealing) return;

      const { x, y, width, height } = cardLayoutRef.current;
      const relX = pageX - x;
      const relY = pageY - y;

      if (relX < 0 || relX > width || relY < 0 || relY > height) return;

      const col = Math.floor((relX / width) * GRID_COLS);
      const row = Math.floor((relY / height) * GRID_ROWS);

      if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
        const cellIndex = row * GRID_COLS + col;
        setScratchedCells((prev) => {
          if (prev.has(cellIndex)) return prev;
          const next = new Set(prev);
          next.add(cellIndex);

          if (next.size % 2 === 0) {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }

          if (next.size / TOTAL_CELLS >= REVEAL_THRESHOLD) {
            setTimeout(triggerReveal, 50);
          }
          return next;
        });
      }
    },
    [isCardRevealed, isRevealing, triggerReveal]
  );

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: (evt: GestureResponderEvent) => {
        handleTouchAt(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      },
      onPanResponderMove: (evt: GestureResponderEvent) => {
        handleTouchAt(evt.nativeEvent.pageX, evt.nativeEvent.pageY);
      },
      onPanResponderRelease: () => {},
    })
  ).current;

  const handleCopyCode = async (code: string) => {
    await Clipboard.setStringAsync(code);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const offer = card.offer;

  // ─────────────────────────────────────────────────────────────────────────────
  // 1. REVEALED CARD VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  if (isCardRevealed && offer) {
    return (
      <View
        style={[
          styles.container,
          compact && styles.compactContainer,
          {
            backgroundColor: colors.surface,
            borderColor: colors.surfaceBorder,
          },
        ]}
      >
        {/* Top Header of Ticket */}
        <View style={styles.revealedHeader}>
          <View style={styles.merchantRow}>
            <View
              style={[
                styles.brandBadge,
                { backgroundColor: isDark ? colors.primary + "20" : colors.primary + "10" },
              ]}
            >
              <Ionicons name="pricetag" size={15} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.merchantName, { color: colors.text }]}>
                {offer.merchantName}
              </Text>
              <Text style={[styles.couponKicker, { color: colors.safe }]}>
                Verified Coupon Unlocked
              </Text>
            </View>
          </View>

          <View
            style={[
              styles.statusPill,
              { backgroundColor: isDark ? colors.safe + "20" : colors.safe + "15" },
            ]}
          >
            <Ionicons name="checkmark-circle" size={13} color={colors.safe} />
            <Text style={[styles.statusPillText, { color: colors.safe }]}>Revealed</Text>
          </View>
        </View>

        {/* Offer Title */}
        <Text style={[styles.revealedTitle, { color: colors.text }]} numberOfLines={2}>
          {offer.title}
        </Text>

        {/* Dashed Separator */}
        <View style={[styles.dashedLine, { borderColor: colors.surfaceBorder }]} />

        {/* Coupon Code Section */}
        {offer.couponCode ? (
          <View
            style={[
              styles.couponCodeRow,
              {
                backgroundColor: isDark ? "#0E1829" : "#F3F7FF",
                borderColor: colors.primary + "30",
              },
            ]}
          >
            <View style={styles.codeTextCol}>
              <Text style={[styles.codeTag, { color: colors.textSecondary }]}>CODE</Text>
              <Text style={[styles.codeString, { color: colors.primary }]}>
                {offer.couponCode}
              </Text>
            </View>

            <Pressable
              onPress={() => handleCopyCode(offer.couponCode!)}
              style={({ pressed }) => [
                styles.copyCodeBtn,
                {
                  backgroundColor: copied ? colors.safe : colors.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons
                name={copied ? "checkmark" : "copy-outline"}
                size={14}
                color="#FFFFFF"
              />
              <Text style={styles.copyCodeBtnText}>
                {copied ? "Copied" : "Copy"}
              </Text>
            </Pressable>
          </View>
        ) : null}

        {/* Bottom Actions */}
        <View style={styles.revealedFooter}>
          <Text style={[styles.expiryText, { color: colors.textMuted }]}>
            {card.expiresAt
              ? `Expires ${new Date(card.expiresAt).toLocaleDateString("en-IN", { month: "short", day: "numeric" })}`
              : "Active"}
          </Text>

          {onOpenDetails ? (
            <Pressable
              onPress={() => onOpenDetails(card)}
              style={styles.detailsBtn}
              hitSlop={8}
            >
              <Text style={[styles.detailsBtnText, { color: colors.primary }]}>
                View Terms
              </Text>
              <Ionicons name="chevron-forward" size={14} color={colors.primary} />
            </Pressable>
          ) : null}
        </View>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // 2. UNREVEALED FOIL SCRATCH CARD VIEW
  // ─────────────────────────────────────────────────────────────────────────────
  const percentScratched = Math.min(
    100,
    Math.round((scratchedCells.size / TOTAL_CELLS) * 100)
  );

  return (
    <View
      style={[
        styles.container,
        compact && styles.compactContainer,
        {
          backgroundColor: colors.surface,
          borderColor: colors.surfaceBorder,
        },
      ]}
      onLayout={(e) => {
        e.target.measure((_x, _y, width, height, pageX, pageY) => {
          cardLayoutRef.current = { x: pageX, y: pageY, width, height };
        });
      }}
    >
      {/* Scratch Layer */}
      <View style={styles.foilContainer} {...panResponder.panHandlers}>
        <LinearGradient
          colors={
            isDark
              ? ["#1C2A44", "#283C66", "#142035"]
              : ["#EAF1FF", "#D7E6FF", "#E1EDFF"]
          }
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.foilGradient}
        >
          {/* Decorative Sparkles & Ribbon */}
          <View style={styles.foilPattern}>
            <View style={styles.sparkleRow}>
              <Ionicons
                name="sparkles"
                size={18}
                color={isDark ? "#93C5FD" : "#0052CC"}
              />
              <Text style={[styles.brandKicker, { color: isDark ? "#BFDBFE" : "#0052CC" }]}>
                BINRO REWARD
              </Text>
              <Ionicons
                name="gift-outline"
                size={18}
                color={isDark ? "#93C5FD" : "#0052CC"}
              />
            </View>

            <View style={styles.foilCenter}>
              <View
                style={[
                  styles.giftIconRing,
                  {
                    backgroundColor: isDark
                      ? "rgba(59, 130, 246, 0.2)"
                      : "rgba(0, 82, 204, 0.12)",
                    borderColor: isDark ? "#3B82F6" : "#0052CC",
                  },
                ]}
              >
                <Ionicons
                  name="gift"
                  size={32}
                  color={isDark ? "#60A5FA" : "#0052CC"}
                />
              </View>
              <Text
                style={[styles.foilHeadline, { color: isDark ? "#FFFFFF" : "#0C1525" }]}
              >
                Mystery Coupon Card
              </Text>
              <Text
                style={[styles.foilSubtext, { color: isDark ? "#94A3B8" : "#4A6E94" }]}
              >
                {scratchedCells.size > 0
                  ? `Scratched ${percentScratched}% • Keep scratching!`
                  : "Rub finger to scratch or tap Reveal"}
              </Text>
            </View>
          </View>
        </LinearGradient>
      </View>

      {/* Accessible Reveal Button */}
      <View style={styles.foilActions}>
        <Pressable
          onPress={triggerReveal}
          disabled={isRevealing}
          style={({ pressed }) => [
            styles.revealBtn,
            {
              backgroundColor: colors.primary,
              opacity: pressed ? 0.88 : 1,
            },
          ]}
        >
          <Ionicons name="sparkles-outline" size={15} color="#FFFFFF" />
          <Text style={styles.revealBtnText}>
            {isRevealing ? "Revealing..." : "Reveal Coupon"}
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 18,
    borderWidth: 1,
    overflow: "hidden",
    marginVertical: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  compactContainer: {
    marginVertical: 4,
  },
  foilContainer: {
    height: 180,
  },
  foilGradient: {
    flex: 1,
    padding: 16,
    justifyContent: "center",
  },
  foilPattern: {
    flex: 1,
    justifyContent: "space-between",
  },
  sparkleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  brandKicker: {
    fontFamily: "Inter_700Bold",
    fontSize: 11,
    letterSpacing: 1.2,
  },
  foilCenter: {
    alignItems: "center",
    justifyContent: "center",
  },
  giftIconRing: {
    width: 62,
    height: 62,
    borderRadius: 31,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 8,
  },
  foilHeadline: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    marginBottom: 4,
  },
  foilSubtext: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  foilActions: {
    padding: 12,
    alignItems: "center",
  },
  revealBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 12,
    width: "100%",
  },
  revealBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  revealedHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    paddingBottom: 10,
  },
  merchantRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandBadge: {
    width: 32,
    height: 32,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  merchantName: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
  },
  couponKicker: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  statusPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 4,
    paddingHorizontal: 8,
    borderRadius: 8,
  },
  statusPillText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },
  revealedTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  dashedLine: {
    borderWidth: 1,
    borderStyle: "dashed",
    marginHorizontal: 16,
    marginBottom: 12,
  },
  couponCodeRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginHorizontal: 16,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 14,
  },
  codeTextCol: {
    flex: 1,
  },
  codeTag: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 9,
    letterSpacing: 0.5,
  },
  codeString: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    letterSpacing: 0.8,
  },
  copyCodeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 6,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  copyCodeBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  revealedFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 14,
  },
  expiryText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  detailsBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  detailsBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
});
