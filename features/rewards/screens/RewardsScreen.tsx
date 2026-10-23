import React, { useState, useEffect, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  RefreshControl,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import * as Haptics from "@/shared/utils/haptics";
import { safePush } from "@/shared/utils/navigation";
import { useTopInset } from "@/shared/utils/platform";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import {
  getUserScratchCards,
  revealScratchCard,
} from "@/services/rewards";
import type {
  UserScratchCard,
  RewardsSummary,
} from "@/services/rewards/types";
import { ScratchCardView } from "../components/ScratchCardView";
import { ScratchModal } from "../components/ScratchModal";
import { CouponDetailModal } from "../components/CouponDetailModal";

type TabSegment = "available" | "revealed" | "expired";

export function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();
  const { colors, isDark } = useTheme();
  const { user, isLoading: authLoading } = useAuth();

  const [activeTab, setActiveTab] = useState<TabSegment>("available");
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [summary, setSummary] = useState<RewardsSummary>({
    availableCards: [],
    revealedCards: [],
    expiredCards: [],
    totalAvailableCount: 0,
    totalRevealedCount: 0,
  });

  const [activeScratchCard, setActiveScratchCard] = useState<UserScratchCard | null>(null);
  const [detailModalCard, setDetailModalCard] = useState<UserScratchCard | null>(null);

  const loadRewardsData = useCallback(async (isRefresh = false) => {
    if (!user?.id) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    if (isRefresh) setRefreshing(true);
    else setLoading(true);

    try {
      const data = await getUserScratchCards(user.id);
      setSummary(data);
    } catch (err) {
      console.warn("[RewardsScreen] Error loading rewards:", err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadRewardsData();
  }, [loadRewardsData]);

  const handleReveal = async (cardId: string) => {
    if (!user?.id) return;
    const res = await revealScratchCard(user.id, cardId);
    if (res.success) {
      await loadRewardsData(true);
      if (activeScratchCard && activeScratchCard.id === cardId) {
        setActiveScratchCard((prev) =>
          prev
            ? {
                ...prev,
                status: "revealed",
                revealedAt: new Date().toISOString(),
              }
            : null
        );
      }
    }
  };

  const currentList = useMemo(() => {
    if (activeTab === "available") return summary.availableCards;
    if (activeTab === "revealed") return summary.revealedCards;
    return summary.expiredCards;
  }, [activeTab, summary]);

  // ─────────────────────────────────────────────────────────────────────────────
  // GUEST STATE
  // ─────────────────────────────────────────────────────────────────────────────
  if (!authLoading && !user) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset + 10 }]}>
        {/* Top Header */}
        <View style={styles.topHeader}>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Rewards</Text>
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        >
          {/* Guest Hero Card */}
          <View
            style={[
              styles.guestCard,
              { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
            ]}
          >
            <View
              style={[
                styles.guestIconCircle,
                {
                  backgroundColor: isDark ? colors.primary + "20" : colors.primary + "10",
                  borderColor: isDark ? colors.primary + "40" : colors.primary + "20",
                },
              ]}
            >
              <Ionicons name="gift" size={38} color={colors.primary} />
            </View>

            <Text style={[styles.guestHeroTitle, { color: colors.text }]}>
              Scan & Unlock Coupons
            </Text>
            <Text style={[styles.guestHeroSubtitle, { color: colors.textSecondary }]}>
              Sign in to BinRo to receive exclusive merchant coupons when you scan eligible QR codes.
            </Text>

            {/* Disclaimer pill */}
            <View
              style={[
                styles.disclaimerPill,
                { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder },
              ]}
            >
              <Ionicons name="information-circle-outline" size={15} color={colors.textMuted} />
              <Text style={[styles.disclaimerPillText, { color: colors.textMuted }]}>
                Scan eligible QR codes to unlock coupon scratch cards. No cash rewards.
              </Text>
            </View>

            <View style={styles.guestActions}>
              <Pressable
                onPress={() => safePush("/(auth)/login")}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
                ]}
              >
                <Text style={styles.primaryBtnText}>Sign In</Text>
              </Pressable>

              <Pressable
                onPress={() => safePush("/(auth)/register")}
                style={({ pressed }) => [
                  styles.outlineBtn,
                  {
                    backgroundColor: colors.surface,
                    borderColor: colors.surfaceBorder,
                    opacity: pressed ? 0.85 : 1,
                  },
                ]}
              >
                <Text style={[styles.outlineBtnText, { color: colors.text }]}>
                  Create Free Account
                </Text>
              </Pressable>
            </View>
          </View>

          {/* How It Works Section */}
          <View style={styles.howItWorksWrap}>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>
              How Rewards Work
            </Text>

            <View
              style={[
                styles.stepCard,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
              ]}
            >
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>1</Text>
              </View>
              <View style={styles.stepTextCol}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>
                  Scan QR Codes
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                  Point your camera at real-world QR codes at stores, restaurants, or transit.
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.stepCard,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
              ]}
            >
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>2</Text>
              </View>
              <View style={styles.stepTextCol}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>
                  Unlock Scratch Cards
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                  Eligible scans earn mystery scratch cards assigned securely by the server.
                </Text>
              </View>
            </View>

            <View
              style={[
                styles.stepCard,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
              ]}
            >
              <View style={styles.stepNumberBadge}>
                <Text style={styles.stepNumberText}>3</Text>
              </View>
              <View style={styles.stepTextCol}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>
                  Reveal Brand Coupons
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                  Rub to reveal verified discount codes and vouchers from partner brands.
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </View>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SIGNED-IN REWARDS SCREEN
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <View style={[styles.container, { backgroundColor: colors.background, paddingTop: topInset + 10 }]}>
      {/* Top Header */}
      <View style={styles.topHeader}>
        <View>
          <Text style={[styles.screenTitle, { color: colors.text }]}>Rewards</Text>
          <Text style={[styles.screenSubtitle, { color: colors.textSecondary }]}>
            Scan eligible QR codes to unlock coupon scratch cards. No cash rewards.
          </Text>
        </View>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            router.push("/(tabs)/scanner");
          }}
          style={[
            styles.scanShortcutBtn,
            { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
          ]}
          accessibilityLabel="Open QR Scanner"
        >
          <Ionicons name="qr-code-outline" size={20} color={colors.primary} />
        </Pressable>
      </View>

      {/* Tabs Segment */}
      <View
        style={[
          styles.tabBarWrap,
          { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
        ]}
      >
        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab("available");
          }}
          style={[
            styles.tabItem,
            activeTab === "available" && [
              styles.tabItemActive,
              { backgroundColor: colors.primary },
            ],
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "available" ? "#FFFFFF" : colors.textSecondary },
            ]}
          >
            New Cards
          </Text>
          {summary.totalAvailableCount > 0 ? (
            <View
              style={[
                styles.badgeCircle,
                {
                  backgroundColor:
                    activeTab === "available" ? "#FFFFFF" : colors.primary,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: activeTab === "available" ? colors.primary : "#FFFFFF",
                  },
                ]}
              >
                {summary.totalAvailableCount}
              </Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab("revealed");
          }}
          style={[
            styles.tabItem,
            activeTab === "revealed" && [
              styles.tabItemActive,
              { backgroundColor: colors.primary },
            ],
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "revealed" ? "#FFFFFF" : colors.textSecondary },
            ]}
          >
            My Coupons
          </Text>
          {summary.totalRevealedCount > 0 ? (
            <View
              style={[
                styles.badgeCircle,
                {
                  backgroundColor:
                    activeTab === "revealed" ? "#FFFFFF" : colors.surfaceLight,
                },
              ]}
            >
              <Text
                style={[
                  styles.badgeText,
                  {
                    color: activeTab === "revealed" ? colors.primary : colors.textSecondary,
                  },
                ]}
              >
                {summary.totalRevealedCount}
              </Text>
            </View>
          ) : null}
        </Pressable>

        <Pressable
          onPress={() => {
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
            setActiveTab("expired");
          }}
          style={[
            styles.tabItem,
            activeTab === "expired" && [
              styles.tabItemActive,
              { backgroundColor: colors.primary },
            ],
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === "expired" ? "#FFFFFF" : colors.textSecondary },
            ]}
          >
            Expired
          </Text>
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 90 }]}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={() => loadRewardsData(true)}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Loading Indicator */}
        {loading && !refreshing ? (
          <View style={styles.loadingWrap}>
            <ActivityIndicator size="large" color={colors.primary} />
            <Text style={[styles.loadingText, { color: colors.textSecondary }]}>
              Loading your scratch cards...
            </Text>
          </View>
        ) : currentList.length === 0 ? (
          /* Empty State */
          <View
            style={[
              styles.emptyCard,
              { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
            ]}
          >
            <View
              style={[
                styles.emptyIconCircle,
                { backgroundColor: isDark ? colors.primary + "20" : colors.primary + "10" },
              ]}
            >
              <Ionicons
                name={
                  activeTab === "available"
                    ? "gift-outline"
                    : activeTab === "revealed"
                    ? "ticket-outline"
                    : "time-outline"
                }
                size={34}
                color={colors.primary}
              />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>
              {activeTab === "available"
                ? "No New Scratch Cards"
                : activeTab === "revealed"
                ? "No Revealed Coupons Yet"
                : "No Expired Cards"}
            </Text>
            <Text style={[styles.emptySubtitle, { color: colors.textSecondary }]}>
              {activeTab === "available"
                ? "Scan eligible QR codes at restaurants, shops, or posters to unlock coupon scratch cards!"
                : activeTab === "revealed"
                ? "Scratch your available cards to reveal merchant discount vouchers here."
                : "Cards that expire will appear here for your reference."}
            </Text>

            {activeTab === "available" ? (
              <Pressable
                onPress={() => router.push("/(tabs)/scanner")}
                style={({ pressed }) => [
                  styles.emptyCtaBtn,
                  { backgroundColor: colors.primary, opacity: pressed ? 0.88 : 1 },
                ]}
              >
                <Ionicons name="scan-outline" size={17} color="#FFFFFF" />
                <Text style={styles.emptyCtaBtnText}>Open QR Scanner</Text>
              </Pressable>
            ) : null}
          </View>
        ) : (
          /* Cards List */
          <View style={styles.cardsList}>
            {currentList.map((card) => (
              <ScratchCardView
                key={card.id}
                card={card}
                onReveal={handleReveal}
                onOpenDetails={(c) => setDetailModalCard(c)}
              />
            ))}
          </View>
        )}

        {/* How Rewards Work Explainer Card */}
        <View
          style={[
            styles.ruleBox,
            { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
          ]}
        >
          <View style={styles.ruleHeader}>
            <Ionicons name="shield-checkmark" size={16} color={colors.primary} />
            <Text style={[styles.ruleTitle, { color: colors.text }]}>
              BinRo Reward Policy
            </Text>
          </View>
          <Text style={[styles.ruleBody, { color: colors.textSecondary }]}>
            • Coupon-only program with discounts from verified brand partners.{"\n"}
            • Max 1 reward per QR code per 24 hours. Daily limit: 3 rewards per user.{"\n"}
            • No cash, wallet balance, UPI payout, or purchase requirement to unlock cards.
          </Text>
        </View>
      </ScrollView>

      {/* Scratch Modal for Full Experience */}
      <ScratchModal
        visible={activeScratchCard !== null}
        card={activeScratchCard}
        onClose={() => setActiveScratchCard(null)}
        onReveal={handleReveal}
        onOpenDetails={(c) => {
          setActiveScratchCard(null);
          setDetailModalCard(c);
        }}
      />

      {/* Coupon Detail Modal */}
      <CouponDetailModal
        visible={detailModalCard !== null}
        card={detailModalCard}
        onClose={() => setDetailModalCard(null)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  topHeader: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  screenTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 24,
  },
  screenSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
    maxWidth: 260,
    marginTop: 2,
  },
  scanShortcutBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  tabBarWrap: {
    flexDirection: "row",
    marginHorizontal: 18,
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 14,
  },
  tabItem: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
    borderRadius: 10,
  },
  tabItemActive: {
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.12,
    shadowRadius: 4,
    elevation: 2,
  },
  tabText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },
  badgeCircle: {
    paddingHorizontal: 6,
    paddingVertical: 1,
    borderRadius: 10,
  },
  badgeText: {
    fontFamily: "Inter_700Bold",
    fontSize: 10,
  },
  scrollContent: {
    paddingHorizontal: 18,
  },
  loadingWrap: {
    paddingVertical: 50,
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  loadingText: {
    fontFamily: "Inter_500Medium",
    fontSize: 13,
  },
  emptyCard: {
    alignItems: "center",
    justifyContent: "center",
    padding: 26,
    borderRadius: 20,
    borderWidth: 1,
    marginVertical: 16,
  },
  emptyIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 14,
  },
  emptyTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 17,
    marginBottom: 6,
  },
  emptySubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginBottom: 18,
  },
  emptyCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingVertical: 11,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  emptyCtaBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  cardsList: {
    marginVertical: 4,
  },
  ruleBox: {
    borderRadius: 16,
    borderWidth: 1,
    padding: 14,
    marginTop: 18,
    marginBottom: 10,
  },
  ruleHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 6,
  },
  ruleTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 13,
  },
  ruleBody: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 18,
  },
  guestCard: {
    alignItems: "center",
    padding: 26,
    borderRadius: 22,
    borderWidth: 1,
    marginVertical: 12,
  },
  guestIconCircle: {
    width: 76,
    height: 76,
    borderRadius: 38,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
  },
  guestHeroTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 20,
    marginBottom: 6,
  },
  guestHeroSubtitle: {
    fontFamily: "Inter_400Regular",
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginBottom: 16,
  },
  disclaimerPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    marginBottom: 20,
  },
  disclaimerPillText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },
  guestActions: {
    width: "100%",
    gap: 10,
  },
  primaryBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
  },
  primaryBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  outlineBtn: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 13,
    borderRadius: 12,
    borderWidth: 1,
  },
  outlineBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
  },
  howItWorksWrap: {
    marginTop: 16,
  },
  sectionTitle: {
    fontFamily: "Inter_700Bold",
    fontSize: 16,
    marginBottom: 12,
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  stepNumberBadge: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "#0052CC",
    alignItems: "center",
    justifyContent: "center",
  },
  stepNumberText: {
    fontFamily: "Inter_700Bold",
    fontSize: 14,
    color: "#FFFFFF",
  },
  stepTextCol: {
    flex: 1,
  },
  stepTitle: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 14,
    marginBottom: 2,
  },
  stepDesc: {
    fontFamily: "Inter_400Regular",
    fontSize: 12,
    lineHeight: 16,
  },
});
