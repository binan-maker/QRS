import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  Pressable,
  PanResponder,
  Image,
  Dimensions,
  Animated,
  Linking,
  ScrollView,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { scratchRewardCard, recordOfferRedemption } from "@/services/rewards";
import { CelebrationOverlay } from "./CelebrationOverlay";
import { MerchantLogo } from "./MerchantLogo";
import type { DisplayBonusCard } from "../types";

interface ScratchModalProps {
  card: DisplayBonusCard | null;
  userId?: string | null;
  onClose: () => void;
  onScratchComplete?: (card: DisplayBonusCard) => void;
  onOpenDetails?: (card: DisplayBonusCard) => void;
}

const GRID_COLS = 8;
const GRID_ROWS = 8;
const TOTAL_CELLS = GRID_COLS * GRID_ROWS;
const REVEAL_THRESHOLD_PCT = 38;

export function ScratchModal({
  card,
  userId,
  onClose,
  onScratchComplete,
  onOpenDetails,
}: ScratchModalProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [isRevealed, setIsRevealed] = useState(false);
  const [scratchPercent, setScratchPercent] = useState(0);
  const [scratchedCells, setScratchedCells] = useState<Set<number>>(new Set());
  const [codeCopied, setCodeCopied] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  const foilOpacity = useRef(new Animated.Value(1)).current;
  const stageLayoutRef = useRef<{ x: number; y: number; width: number; height: number }>({
    x: 0,
    y: 0,
    width: 280,
    height: 280,
  });

  // Reset state when card changes
  useEffect(() => {
    if (card) {
      if (card.status === "scratched") {
        setIsRevealed(true);
        setScratchPercent(100);
        foilOpacity.setValue(0);
      } else {
        setIsRevealed(false);
        setScratchPercent(0);
        setScratchedCells(new Set());
        foilOpacity.setValue(1);
      }
    }
  }, [card, foilOpacity]);

  const triggerReveal = useCallback(() => {
    if (isRevealed) return;
    setIsRevealed(true);
    setScratchPercent(100);

    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    Animated.timing(foilOpacity, {
      toValue: 0,
      duration: 350,
      useNativeDriver: true,
    }).start();

    if (card) {
      if (userId) {
        void scratchRewardCard(userId, card.id).catch(() => {});
      }
      onScratchComplete?.(card);
    }
  }, [isRevealed, foilOpacity, card, userId, onScratchComplete]);

  // Touch pan responder to track scratch rubs
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => !isRevealed,
      onMoveShouldSetPanResponder: () => !isRevealed,
      onPanResponderGrant: (evt) => {
        handleTouchScratch(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      },
      onPanResponderMove: (evt) => {
        handleTouchScratch(evt.nativeEvent.locationX, evt.nativeEvent.locationY);
      },
    })
  ).current;

  const handleTouchScratch = (touchX: number, touchY: number) => {
    if (isRevealed) return;
    const { width, height } = stageLayoutRef.current;
    if (width <= 0 || height <= 0) return;

    const col = Math.floor((touchX / width) * GRID_COLS);
    const row = Math.floor((touchY / height) * GRID_ROWS);

    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      const cellIdx = row * GRID_COLS + col;
      setScratchedCells((prev) => {
        if (prev.has(cellIdx)) return prev;
        const next = new Set(prev);
        // Scratch the cell and immediately adjacent cell for brush feel
        next.add(cellIdx);
        if (col > 0) next.add(cellIdx - 1);
        if (col < GRID_COLS - 1) next.add(cellIdx + 1);
        if (row > 0) next.add(cellIdx - GRID_COLS);
        if (row < GRID_ROWS - 1) next.add(cellIdx + GRID_COLS);

        const pct = Math.min(100, Math.round((next.size / TOTAL_CELLS) * 100));
        setScratchPercent(pct);

        if (pct >= REVEAL_THRESHOLD_PCT) {
          setTimeout(triggerReveal, 80);
        }

        return next;
      });
    }
  };

  const handleCopyCode = async () => {
    if (!card?.offer.couponCode) return;
    await Clipboard.setStringAsync(card.offer.couponCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleRedeem = async () => {
    if (!card) return;
    setRedeeming(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (card.offer.couponCode) {
      await Clipboard.setStringAsync(card.offer.couponCode);
      setCodeCopied(true);
    }

    if (userId) {
      try {
        await recordOfferRedemption(userId, card.id);
      } catch {}
    }

    if (card.offer.destinationUrl) {
      Linking.openURL(card.offer.destinationUrl).catch(() => {});
    }
    setRedeeming(false);
  };

  if (!card) return null;

  const offer = card.offer;
  const bannerImage = card.bannerUrl || offer.bannerUrl;

  return (
    <Modal
      visible={Boolean(card)}
      animationType="fade"
      transparent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        {/* Falling birthday celebration pieces when revealed */}
        {isRevealed && <CelebrationOverlay />}

        <View
          style={[
            styles.modalContainer,
            {
              backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
              paddingTop: Math.max(insets.top + 10, 24),
              paddingBottom: Math.max(insets.bottom + 12, 24),
            },
          ]}
        >
          {/* Top Bar */}
          <View style={styles.topHeader}>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={({ pressed }) => [
                styles.iconBtn,
                { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9", opacity: pressed ? 0.7 : 1 },
              ]}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>

            <View style={styles.headerTitleBox}>
              <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
                {isRevealed ? "Reward Unlocked!" : "Scratch & Win"}
              </Text>
              <Text style={[styles.headerTitle, { color: colors.text }]} numberOfLines={1}>
                {card.merchantName}
              </Text>
            </View>

            <View style={{ width: 38 }} />
          </View>

          <ScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollBody}
          >
            {/* ── Interactive Scratch Card Stage ── */}
            <View
              style={styles.stageWrapper}
              onLayout={(e) => {
                const { x, y, width, height } = e.nativeEvent.layout;
                stageLayoutRef.current = { x, y, width, height };
              }}
            >
              {/* Underlying Revealed Card Content */}
              <View
                style={[
                  styles.underlayCard,
                  {
                    backgroundColor: isDark ? "#141A28" : "#FFFFFF",
                    borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0",
                    borderWidth: 1,
                  },
                ]}
              >
                {/* Header row: Merchant Logo + Badge */}
                <View style={styles.underlayHeaderRow}>
                  <MerchantLogo
                    name={card.merchantName}
                    url={card.merchantLogoUrl || offer.merchantLogoUrl}
                    size={38}
                  />
                  <View style={styles.underlayPill}>
                    <Ionicons name="sparkles" size={11} color="#059669" />
                    <Text style={styles.underlayPillText}>REWARD READY</Text>
                  </View>
                </View>

                {/* Offer Headline & Subtitle */}
                <View style={styles.underlayTextCol}>
                  <Text style={[styles.underlayHeadline, { color: isDark ? "#FFFFFF" : "#0F172A" }]} numberOfLines={1}>
                    {card.headline || offer.title}
                  </Text>
                  <Text style={[styles.underlaySubtitle, { color: isDark ? "#94A3B8" : "#475569" }]} numberOfLines={2}>
                    {card.subtitle || offer.description}
                  </Text>
                </View>

                {/* Product Image */}
                <View style={styles.underlayImageWrap}>
                  <Image
                    source={{ uri: bannerImage }}
                    style={styles.underlayBanner}
                    resizeMode="cover"
                  />
                </View>
              </View>

              {/* Metallic Mystery Foil Layer (BinRo Sapphire Brand Color) */}
              {!isRevealed && (
                <Animated.View
                  style={[
                    StyleSheet.absoluteFill,
                    styles.foilContainer,
                    { opacity: foilOpacity },
                  ]}
                  {...panResponder.panHandlers}
                >
                  <LinearGradient
                    colors={["#0052CC", "#003FA8", "#00236F"]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={StyleSheet.absoluteFill}
                  />

                  {/* Decorative Security Emblems & Lines */}
                  <View style={styles.foilPattern}>
                    <Ionicons name="shield-checkmark" size={38} color="#38BDF8" />
                    <Text style={styles.foilPromptTitle}>RUB TO SCRATCH</Text>
                    <Text style={styles.foilPromptSub}>Swipe finger across card to uncover reward</Text>
                  </View>

                  {/* Grid mask indicators for scratched cells */}
                  <View style={styles.cellGridOverlay} pointerEvents="none">
                    {Array.from({ length: TOTAL_CELLS }).map((_, i) => (
                      <View
                        key={i}
                        style={[
                          styles.gridCell,
                          scratchedCells.has(i) && styles.gridCellCleared,
                        ]}
                      />
                    ))}
                  </View>
                </Animated.View>
              )}
            </View>

            {/* Progress / Scratch hint */}
            {!isRevealed ? (
              <View style={styles.scratchProgressSection}>
                <View style={styles.progressBarTrack}>
                  <View
                    style={[
                      styles.progressBarFill,
                      { width: `${Math.min(100, Math.round((scratchPercent / REVEAL_THRESHOLD_PCT) * 100))}%` },
                    ]}
                  />
                </View>
                <Text style={[styles.progressHintText, { color: colors.textSecondary }]}>
                  {scratchPercent > 0
                    ? `${scratchPercent}% scratched • keep going!`
                    : "Rub your finger to scratch the card"}
                </Text>

                <Pressable
                  onPress={triggerReveal}
                  style={({ pressed }) => [
                    styles.instantScratchBtn,
                    { backgroundColor: `${colors.primary}18`, opacity: pressed ? 0.75 : 1 },
                  ]}
                >
                  <Ionicons name="flash" size={15} color={colors.primary} />
                  <Text style={[styles.instantScratchText, { color: colors.primary }]}>
                    Instant Scratch Off
                  </Text>
                </Pressable>
              </View>
            ) : (
              /* Revealed Voucher Actions */
              <View style={styles.revealedActionSection}>
                {offer.couponCode ? (
                  <View
                    style={[
                      styles.codeBox,
                      {
                        backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F1F5F9",
                        borderColor: isDark ? "rgba(255,255,255,0.1)" : "#E2E8F0",
                      },
                    ]}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.codeBoxLabel, { color: colors.textMuted }]}>
                        COUPON CODE
                      </Text>
                      <Text style={[styles.codeBoxValue, { color: colors.primary }]}>
                        {offer.couponCode}
                      </Text>
                    </View>

                    <Pressable
                      onPress={handleCopyCode}
                      style={({ pressed }) => [
                        styles.copyBtn,
                        {
                          backgroundColor: codeCopied ? "#10B981" : colors.primary,
                          opacity: pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Ionicons
                        name={codeCopied ? "checkmark" : "copy-outline"}
                        size={15}
                        color="#FFFFFF"
                      />
                      <Text style={styles.copyBtnText}>
                        {codeCopied ? "COPIED!" : "COPY"}
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

                <View style={styles.buttonStack}>
                  {/* View Details Button */}
                  <Pressable
                    onPress={() => onOpenDetails?.(card)}
                    style={({ pressed }) => [
                      styles.detailsBtn,
                      {
                        borderColor: isDark ? "rgba(255,255,255,0.15)" : "#CBD5E1",
                        opacity: pressed ? 0.8 : 1,
                      },
                    ]}
                  >
                    <Ionicons name="information-circle-outline" size={18} color={colors.text} />
                    <Text style={[styles.detailsBtnText, { color: colors.text }]}>
                      View Voucher Details
                    </Text>
                  </Pressable>

                  {/* Redeem Offer CTA */}
                  <Pressable
                    onPress={handleRedeem}
                    disabled={redeeming}
                    style={({ pressed }) => [
                      styles.redeemBtn,
                      { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
                    ]}
                  >
                    <Ionicons name="open-outline" size={17} color="#FFFFFF" />
                    <Text style={styles.redeemBtnText}>
                      {redeeming ? "Opening Offer..." : "Redeem Offer"}
                    </Text>
                  </Pressable>
                </View>
              </View>
            )}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.78)",
    justifyContent: "flex-end",
  },
  modalContainer: {
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: "92%",
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 18,
    paddingBottom: 14,
  },
  iconBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  headerTitleBox: {
    alignItems: "center",
    flex: 1,
  },
  headerSubtitle: {
    fontSize: 12,
    fontWeight: "600",
  },
  headerTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 2,
  },
  scrollBody: {
    paddingHorizontal: 20,
    paddingBottom: 24,
    alignItems: "center",
  },
  stageWrapper: {
    width: "100%",
    aspectRatio: 1,
    maxHeight: 330,
    maxWidth: 330,
    borderRadius: 24,
    overflow: "hidden",
    marginTop: 10,
    position: "relative",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 18,
    elevation: 8,
  },
  underlayCard: {
    ...StyleSheet.absoluteFillObject,
    borderRadius: 24,
    padding: 16,
    justifyContent: "space-between",
  },
  underlayHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  underlayPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(16, 185, 129, 0.14)",
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
  },
  underlayPillText: {
    color: "#059669",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  underlayTextCol: {
    marginTop: 6,
    marginBottom: 6,
  },
  underlayHeadline: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.2,
  },
  underlaySubtitle: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  underlayImageWrap: {
    width: "100%",
    height: 130,
    borderRadius: 16,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  underlayBanner: {
    width: "100%",
    height: "100%",
  },
  foilContainer: {
    borderRadius: 24,
    overflow: "hidden",
    alignItems: "center",
    justifyContent: "center",
  },
  foilPattern: {
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
  },
  foilPromptTitle: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "900",
    letterSpacing: 1.5,
    marginTop: 12,
  },
  foilPromptSub: {
    color: "#94A3B8",
    fontSize: 12,
    textAlign: "center",
    marginTop: 6,
  },
  cellGridOverlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: "row",
    flexWrap: "wrap",
  },
  gridCell: {
    width: `${100 / GRID_COLS}%`,
    height: `${100 / GRID_ROWS}%`,
    backgroundColor: "transparent",
  },
  gridCellCleared: {
    backgroundColor: "rgba(255, 255, 255, 0.35)",
  },
  scratchProgressSection: {
    width: "100%",
    alignItems: "center",
    marginTop: 20,
  },
  progressBarTrack: {
    width: "80%",
    height: 7,
    backgroundColor: "rgba(148, 163, 184, 0.2)",
    borderRadius: 10,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: "#38BDF8",
    borderRadius: 10,
  },
  progressHintText: {
    fontSize: 13,
    marginTop: 10,
    fontWeight: "500",
  },
  instantScratchBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 100,
    marginTop: 14,
  },
  instantScratchText: {
    fontSize: 13,
    fontWeight: "700",
  },
  revealedActionSection: {
    width: "100%",
    marginTop: 18,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderStyle: "dashed",
    marginBottom: 14,
  },
  codeBoxLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  codeBoxValue: {
    fontSize: 17,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 3,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  copyBtnText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "700",
  },
  buttonStack: {
    gap: 10,
  },
  detailsBtn: {
    height: 48,
    borderRadius: 14,
    borderWidth: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  detailsBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
  redeemBtn: {
    height: 50,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  redeemBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
});

export default ScratchModal;
