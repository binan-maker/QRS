import React, { useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Image,
  Linking,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { recordOfferRedemption } from "@/services/rewards";
import type { DisplayBonusCard } from "../types";

interface BonusDetailModalProps {
  card: DisplayBonusCard | null;
  userId?: string | null;
  onClose: () => void;
  onRedeemed?: (card: DisplayBonusCard) => void;
}

export function BonusDetailModal({
  card,
  userId,
  onClose,
  onRedeemed,
}: BonusDetailModalProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();

  const [copied, setCopied] = useState(false);
  const [redeeming, setRedeeming] = useState(false);

  const handleCopyCode = useCallback(async () => {
    if (!card?.offer.couponCode) return;
    await Clipboard.setStringAsync(card.offer.couponCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);
  }, [card?.offer.couponCode]);

  const handleRedeem = useCallback(async () => {
    if (!card) return;
    setRedeeming(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    if (card.offer.couponCode) {
      await Clipboard.setStringAsync(card.offer.couponCode);
      setCopied(true);
    }

    if (userId) {
      try {
        await recordOfferRedemption(userId, card.id);
      } catch {}
    }

    onRedeemed?.(card);

    if (card.offer.destinationUrl) {
      Linking.openURL(card.offer.destinationUrl).catch(() => {});
    }

    setRedeeming(false);
  }, [card, userId, onRedeemed]);

  if (!card) return null;

  const offer = card.offer;
  const bannerImage = card.bannerUrl || offer.bannerUrl;

  return (
    <Modal
      visible={Boolean(card)}
      animationType="slide"
      transparent={false}
      onRequestClose={onClose}
    >
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        {/* Top Header */}
        <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) }]}>
          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [
              styles.circleBtn,
              { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9", opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>

          <View style={styles.topBarTitleBox}>
            <Text style={[styles.topBarTitle, { color: colors.text }]} numberOfLines={1}>
              {card.merchantName}
            </Text>
            <View style={styles.verifiedRow}>
              <Ionicons name="checkmark-circle" size={13} color="#10B981" />
              <Text style={styles.verifiedText}>Verified Partner Voucher</Text>
            </View>
          </View>

          <Pressable
            onPress={onClose}
            hitSlop={12}
            style={({ pressed }) => [
              styles.circleBtn,
              { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9", opacity: pressed ? 0.7 : 1 },
            ]}
          >
            <Ionicons name="close" size={20} color={colors.text} />
          </Pressable>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        >
          {/* Hero Banner Artwork */}
          <View style={styles.bannerWrapper}>
            <Image
              source={{ uri: bannerImage }}
              style={styles.bannerImage}
              resizeMode="cover"
            />
            <View style={styles.bannerOverlay}>
              <View style={styles.merchantBadgePill}>
                <Text style={styles.merchantBadgeText}>{card.merchantName.toUpperCase()}</Text>
              </View>
              {card.validityText ? (
                <View style={styles.validityBadgePill}>
                  <Ionicons name="time-outline" size={12} color="#FFFFFF" />
                  <Text style={styles.validityBadgeText}>{card.validityText}</Text>
                </View>
              ) : null}
            </View>
          </View>

          {/* Title & Offer Headline */}
          <View style={styles.infoSection}>
            <Text style={[styles.headlineText, { color: colors.text }]}>
              {card.headline || offer.title}
            </Text>
            <Text style={[styles.descriptionText, { color: colors.textSecondary }]}>
              {offer.description}
            </Text>
          </View>

          {/* Coupon Code Section */}
          {offer.couponCode ? (
            <View
              style={[
                styles.couponCard,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC",
                  borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0",
                },
              ]}
            >
              <View style={styles.couponMeta}>
                <Text style={[styles.couponLabel, { color: colors.textMuted }]}>
                  PROMO / COUPON CODE
                </Text>
                <Text style={[styles.couponCodeText, { color: colors.primary }]}>
                  {offer.couponCode}
                </Text>
              </View>

              <Pressable
                onPress={handleCopyCode}
                style={({ pressed }) => [
                  styles.copyBtn,
                  {
                    backgroundColor: copied ? "#10B981" : colors.primary,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Ionicons
                  name={copied ? "checkmark" : "copy-outline"}
                  size={15}
                  color="#FFFFFF"
                />
                <Text style={styles.copyBtnText}>{copied ? "COPIED!" : "COPY"}</Text>
              </Pressable>
            </View>
          ) : null}

          {/* Terms & Conditions */}
          <View
            style={[
              styles.termsCard,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#FAFAFA",
                borderColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9",
              },
            ]}
          >
            <View style={styles.termsHeader}>
              <Ionicons name="information-circle-outline" size={17} color={colors.textSecondary} />
              <Text style={[styles.termsTitle, { color: colors.text }]}>Offer Terms &amp; Conditions</Text>
            </View>
            <Text style={[styles.termsText, { color: colors.textMuted }]}>
              {offer.termsText ||
                "Present or apply this code during checkout at partner app or website. Offer valid subject to merchant availability."}
            </Text>
          </View>
        </ScrollView>

        {/* Bottom CTA Bar */}
        <View
          style={[
            styles.bottomBar,
            {
              backgroundColor: colors.background,
              borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0",
              paddingBottom: Math.max(insets.bottom, 14),
            },
          ]}
        >
          <Pressable
            onPress={handleRedeem}
            disabled={redeeming}
            style={({ pressed }) => [
              styles.redeemBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
            ]}
          >
            <Ionicons name="open-outline" size={18} color="#FFFFFF" />
            <Text style={styles.redeemBtnText}>
              {redeeming ? "Opening Offer..." : "Redeem Offer on Partner Site"}
            </Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  circleBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitleBox: {
    alignItems: "center",
    flex: 1,
    marginHorizontal: 10,
  },
  topBarTitle: {
    fontSize: 16,
    fontWeight: "700",
  },
  verifiedRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    marginTop: 2,
  },
  verifiedText: {
    fontSize: 11,
    color: "#10B981",
    fontWeight: "600",
  },
  scrollContent: {
    padding: 16,
  },
  bannerWrapper: {
    height: 200,
    borderRadius: 20,
    overflow: "hidden",
    position: "relative",
    backgroundColor: "#1E293B",
  },
  bannerImage: {
    width: "100%",
    height: "100%",
  },
  bannerOverlay: {
    position: "absolute",
    bottom: 12,
    left: 12,
    right: 12,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  merchantBadgePill: {
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  merchantBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "700",
    letterSpacing: 0.5,
  },
  validityBadgePill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    backgroundColor: "rgba(15, 23, 42, 0.85)",
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 100,
  },
  validityBadgeText: {
    color: "#FFFFFF",
    fontSize: 11,
    fontWeight: "600",
  },
  infoSection: {
    marginTop: 18,
  },
  headlineText: {
    fontSize: 22,
    fontWeight: "800",
    letterSpacing: -0.4,
  },
  descriptionText: {
    fontSize: 14,
    lineHeight: 21,
    marginTop: 8,
  },
  couponCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderStyle: "dashed",
    marginTop: 20,
  },
  couponMeta: {
    flex: 1,
  },
  couponLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.8,
  },
  couponCodeText: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: 1,
    marginTop: 4,
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
  termsCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginTop: 20,
  },
  termsHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 8,
  },
  termsTitle: {
    fontSize: 13,
    fontWeight: "700",
  },
  termsText: {
    fontSize: 12,
    lineHeight: 18,
  },
  bottomBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  redeemBtn: {
    height: 52,
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
