import React, { useEffect, useState } from "react";
import { View, Text, StyleSheet, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Haptics from "@/shared/utils/haptics";
import { safePush } from "@/shared/utils/navigation";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import {
  getScanRewardResult,
  subscribeScanReward,
  revealScratchCard,
} from "@/services/rewards";
import type { RewardEligibilityResult, UserScratchCard } from "@/services/rewards/types";
import { ScratchModal } from "./ScratchModal";
import { CouponDetailModal } from "./CouponDetailModal";

interface ScanRewardBannerProps {
  qrId: string;
}

export function ScanRewardBanner({ qrId }: ScanRewardBannerProps) {
  const { colors, isDark } = useTheme();
  const { user } = useAuth();

  const [result, setResult] = useState<RewardEligibilityResult | null>(() =>
    getScanRewardResult(qrId)
  );
  const [scratchModalOpen, setScratchModalOpen] = useState(false);
  const [detailCard, setDetailCard] = useState<UserScratchCard | null>(null);

  useEffect(() => {
    // Check initial cached result
    const current = getScanRewardResult(qrId);
    if (current) setResult(current);

    // Subscribe to background emission
    const unsubscribe = subscribeScanReward((id, newRes) => {
      if (id === qrId) {
        setResult(newRes);
      }
    });

    return unsubscribe;
  }, [qrId]);

  const handleReveal = async (cardId: string) => {
    if (!user?.id) return;
    const res = await revealScratchCard(user.id, cardId);
    if (res.success && result?.card) {
      setResult((prev) =>
        prev
          ? {
              ...prev,
              card: {
                ...prev.card!,
                status: "revealed",
                revealedAt: new Date().toISOString(),
              },
            }
          : null
      );
    }
  };

  // 1. Signed-out guest banner
  if (!user) {
    return (
      <View
        style={[
          styles.container,
          {
            backgroundColor: isDark ? "#0D182B" : "#F0F5FF",
            borderColor: isDark ? colors.primary + "35" : colors.primary + "20",
          },
        ]}
      >
        <View style={styles.guestRow}>
          <View
            style={[
              styles.iconRing,
              { backgroundColor: isDark ? colors.primary + "25" : colors.primary + "15" },
            ]}
          >
            <Ionicons name="gift-outline" size={18} color={colors.primary} />
          </View>
          <View style={styles.textCol}>
            <Text style={[styles.guestTitle, { color: colors.text }]}>
              Unlock Coupon Scratch Cards
            </Text>
            <Text style={[styles.guestSub, { color: colors.textSecondary }]}>
              Sign in to earn merchant discounts on eligible QR scans.
            </Text>
          </View>
          <Pressable
            onPress={() => {
              Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              safePush("/(auth)/login");
            }}
            style={[styles.signInBtn, { backgroundColor: colors.primary }]}
          >
            <Text style={styles.signInBtnText}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  // 2. No reward evaluated yet or loading
  if (!result) {
    return null;
  }

  // 3. Card Unlocked! (Eligible scan)
  if (result.eligible && result.card) {
    const isRevealed = result.card.status === "revealed";

    return (
      <>
        <View
          style={[
            styles.container,
            styles.unlockedContainer,
            { borderColor: colors.primary + "40" },
          ]}
        >
          <LinearGradient
            colors={
              isDark
                ? ["#0E2145", "#132D5E", "#0B1A38"]
                : ["#EBF3FF", "#DCEBFF", "#E6F0FF"]
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.gradientPad}
          >
            <View style={styles.unlockedHeader}>
              <View
                style={[
                  styles.sparkleWrap,
                  { backgroundColor: isDark ? colors.primary + "30" : colors.primary + "20" },
                ]}
              >
                <Ionicons name="gift" size={20} color={colors.primary} />
              </View>
              <View style={styles.textCol}>
                <Text style={[styles.unlockedTitle, { color: colors.text }]}>
                  {isRevealed ? "Coupon Unlocked!" : "🎉 Scratch Card Unlocked!"}
                </Text>
                <Text style={[styles.unlockedSub, { color: colors.textSecondary }]}>
                  {isRevealed
                    ? `${result.card.offer?.merchantName || "Merchant"}: ${result.card.offer?.title || "Discount"}`
                    : "You earned a coupon scratch card for this scan."}
                </Text>
              </View>
            </View>

            <View style={styles.btnRow}>
              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                  setScratchModalOpen(true);
                }}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
                ]}
              >
                <Ionicons
                  name={isRevealed ? "ticket-outline" : "sparkles-outline"}
                  size={15}
                  color="#FFFFFF"
                />
                <Text style={styles.primaryBtnText}>
                  {isRevealed ? "View Coupon" : "Scratch Now"}
                </Text>
              </Pressable>

              <Pressable
                onPress={() => {
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  safePush("/(tabs)/rewards");
                }}
                style={[
                  styles.secondaryBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfaceBorder,
                  },
                ]}
              >
                <Text style={[styles.secondaryBtnText, { color: colors.text }]}>
                  All Rewards
                </Text>
              </Pressable>
            </View>
          </LinearGradient>
        </View>

        <ScratchModal
          visible={scratchModalOpen}
          card={result.card}
          onClose={() => setScratchModalOpen(false)}
          onReveal={handleReveal}
          onOpenDetails={(c) => {
            setScratchModalOpen(false);
            setDetailCard(c);
          }}
        />

        <CouponDetailModal
          visible={detailCard !== null}
          card={detailCard}
          onClose={() => setDetailCard(null)}
        />
      </>
    );
  }

  // 4. Not eligible (e.g. already claimed today, cooldown, daily limit)
  return (
    <View
      style={[
        styles.container,
        {
          backgroundColor: colors.surface,
          borderColor: colors.surfaceBorder,
        },
      ]}
    >
      <View style={styles.ineligibleRow}>
        <Ionicons
          name="information-circle-outline"
          size={18}
          color={colors.textSecondary}
        />
        <View style={styles.textCol}>
          <Text style={[styles.ineligibleText, { color: colors.textSecondary }]}>
            {result.reason || "Scan not eligible for reward. 1 reward per QR code daily."}
          </Text>
        </View>
        <Pressable
          onPress={() => safePush("/(tabs)/rewards")}
          style={styles.viewRewardsLink}
          hitSlop={6}
        >
          <Text style={[styles.viewRewardsText, { color: colors.primary }]}>
            Rewards
          </Text>
          <Ionicons name="chevron-forward" size={13} color={colors.primary} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginVertical: 10,
    borderRadius: 16,
    borderWidth: 1,
    overflow: "hidden",
  },
  unlockedContainer: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  gradientPad: {
    padding: 14,
  },
  unlockedHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    marginBottom: 12,
  },
  sparkleWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  textCol: {
    flex: 1,
  },
  unlockedTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 15,
    marginBottom: 2,
  },
  unlockedSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  btnRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  primaryBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  primaryBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
    color: "#FFFFFF",
  },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    borderWidth: 1,
  },
  secondaryBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  guestRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  iconRing: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  guestTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  guestSub: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    marginTop: 2,
  },
  signInBtn: {
    paddingVertical: 7,
    paddingHorizontal: 12,
    borderRadius: 8,
  },
  signInBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: "#FFFFFF",
  },
  ineligibleRow: {
    flexDirection: "row",
    alignItems: "center",
    padding: 12,
    gap: 10,
  },
  ineligibleText: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
  viewRewardsLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  viewRewardsText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
});
