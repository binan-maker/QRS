import React, { useState } from "react";
import {
  View,
  Text,
  Modal,
  Pressable,
  StyleSheet,
  ScrollView,
  Linking,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { UserScratchCard } from "@/services/rewards/types";
import { logRewardEvent } from "@/services/rewards/rewards-service";

interface CouponDetailModalProps {
  visible: boolean;
  card: UserScratchCard | null;
  onClose: () => void;
}

export function CouponDetailModal({ visible, card, onClose }: CouponDetailModalProps) {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const [copied, setCopied] = useState(false);

  if (!card || !card.offer) return null;

  const { offer } = card;

  const handleCopyCode = async () => {
    if (!offer.couponCode) return;
    await Clipboard.setStringAsync(offer.couponCode);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setCopied(true);
    setTimeout(() => setCopied(false), 2200);

    if (card.userId) {
      void logRewardEvent(card.userId, card.id, "copy_code", {
        merchant: offer.merchantName,
        coupon_code: offer.couponCode,
      });
    }
  };

  const handleOpenStore = async () => {
    if (!offer.trackedUrl) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (card.userId) {
      void logRewardEvent(card.userId, card.id, "open_offer", {
        merchant: offer.merchantName,
        url: offer.trackedUrl,
      });
    }

    try {
      const canOpen = await Linking.canOpenURL(offer.trackedUrl);
      if (canOpen) {
        await Linking.openURL(offer.trackedUrl);
      }
    } catch {}
  };

  const formattedExpiry = card.expiresAt
    ? new Date(card.expiresAt).toLocaleDateString("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : null;

  const networkLabel =
    offer.sourceNetwork === "vcommission"
      ? "vCommission Verified Offer"
      : offer.sourceNetwork === "cuelinks"
      ? "Cuelinks Partner Offer"
      : "BinRo Verified Offer";

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Pressable style={StyleSheet.absoluteFill} onPress={onClose} />

        <View
          style={[
            styles.modalContent,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
              paddingBottom: Math.max(20, insets.bottom + 12),
            },
          ]}
        >
          {/* Header Row */}
          <View style={styles.headerRow}>
            <View style={styles.merchantBadge}>
              <View
                style={[
                  styles.brandIconWrap,
                  { backgroundColor: isDark ? colors.primary + "25" : colors.primary + "12" },
                ]}
              >
                <Ionicons name="pricetag" size={18} color={colors.primary} />
              </View>
              <View>
                <Text style={[styles.merchantName, { color: colors.text }]}>
                  {offer.merchantName}
                </Text>
                <Text style={[styles.sourceBadge, { color: colors.textSecondary }]}>
                  {networkLabel}
                </Text>
              </View>
            </View>

            <Pressable
              onPress={onClose}
              style={[
                styles.closeBtn,
                { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder },
              ]}
              hitSlop={8}
            >
              <Ionicons name="close" size={20} color={colors.text} />
            </Pressable>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.scroll}>
            {/* Offer Title */}
            <Text style={[styles.offerTitle, { color: colors.text }]}>
              {offer.title}
            </Text>

            {/* Offer Description */}
            <Text style={[styles.offerDesc, { color: colors.textSecondary }]}>
              {offer.description}
            </Text>

            {/* Coupon Code Box */}
            {offer.couponCode ? (
              <View
                style={[
                  styles.codeBox,
                  {
                    backgroundColor: isDark ? "#121A2B" : "#F0F5FF",
                    borderColor: isDark ? colors.primary + "40" : colors.primary + "30",
                  },
                ]}
              >
                <View style={styles.codeTextCol}>
                  <Text style={[styles.codeLabel, { color: colors.textSecondary }]}>
                    COUPON CODE
                  </Text>
                  <Text style={[styles.codeValue, { color: colors.primary }]}>
                    {offer.couponCode}
                  </Text>
                </View>

                <Pressable
                  onPress={handleCopyCode}
                  style={({ pressed }) => [
                    styles.copyBtn,
                    {
                      backgroundColor: copied ? colors.safe : colors.primary,
                      opacity: pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Ionicons
                    name={copied ? "checkmark" : "copy-outline"}
                    size={16}
                    color="#FFFFFF"
                  />
                  <Text style={styles.copyBtnText}>
                    {copied ? "Copied!" : "Copy"}
                  </Text>
                </Pressable>
              </View>
            ) : null}

            {/* Expiry Pill */}
            {formattedExpiry ? (
              <View style={styles.metaRow}>
                <Ionicons name="time-outline" size={14} color={colors.warning} />
                <Text style={[styles.metaText, { color: colors.textSecondary }]}>
                  Valid until {formattedExpiry}
                </Text>
              </View>
            ) : null}

            {/* Terms and Conditions */}
            <View style={styles.sectionWrap}>
              <Text style={[styles.sectionHeading, { color: colors.text }]}>
                Terms & Conditions
              </Text>
              <Text style={[styles.termsBody, { color: colors.textSecondary }]}>
                {offer.terms || "Standard merchant terms and conditions apply. One coupon per user."}
              </Text>
            </View>

            {/* Disclaimer */}
            <View
              style={[
                styles.disclaimerBox,
                { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder },
              ]}
            >
              <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
              <Text style={[styles.disclaimerText, { color: colors.textMuted }]}>
                Coupon-only reward. No cash, cashback, or wallet balance. BinRo does not guarantee merchant acceptance.
              </Text>
            </View>
          </ScrollView>

          {/* Action Row */}
          <View style={styles.actionRow}>
            {offer.trackedUrl ? (
              <Pressable
                onPress={handleOpenStore}
                style={({ pressed }) => [
                  styles.primaryActionBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
                ]}
              >
                <Ionicons name="open-outline" size={17} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>Visit {offer.merchantName}</Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={handleCopyCode}
                style={({ pressed }) => [
                  styles.primaryActionBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
                ]}
              >
                <Ionicons name="copy-outline" size={17} color="#FFFFFF" />
                <Text style={styles.primaryActionText}>
                  {copied ? "Code Copied!" : "Copy Coupon Code"}
                </Text>
              </Pressable>
            )}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  modalContent: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    borderWidth: 1,
    borderBottomWidth: 0,
    maxHeight: "86%",
    paddingTop: 20,
    paddingHorizontal: 20,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  merchantBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  brandIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  merchantName: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
  },
  sourceBadge: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
    marginTop: 1,
  },
  closeBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    marginBottom: 16,
  },
  offerTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    lineHeight: 26,
    marginBottom: 8,
  },
  offerDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 16,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1.5,
    borderStyle: "dashed",
    marginBottom: 14,
  },
  codeTextCol: {
    flex: 1,
  },
  codeLabel: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 10,
    letterSpacing: 0.6,
    marginBottom: 3,
  },
  codeValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 18,
    letterSpacing: 1,
  },
  copyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 10,
  },
  copyBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 16,
  },
  metaText: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  sectionWrap: {
    marginBottom: 16,
  },
  sectionHeading: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    marginBottom: 6,
    letterSpacing: 0.2,
  },
  termsBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  disclaimerBox: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 6,
    marginBottom: 10,
  },
  disclaimerText: {
    flex: 1,
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    lineHeight: 16,
  },
  actionRow: {
    paddingTop: 8,
  },
  primaryActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 14,
    borderRadius: 14,
  },
  primaryActionText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 15,
    color: "#FFFFFF",
  },
});
