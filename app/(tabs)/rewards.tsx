import React, { useEffect, useState, useCallback, useMemo } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Linking,
  Share,
  RefreshControl,
} from "react-native";
import { router, useFocusEffect } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";
import { useTopInset } from "@/shared/utils/platform";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useTabBarScroll } from "@/shared/contexts/TabBarContext";
import {
  getUserRewardWallet,
  getUserScratchCards,
  scratchRewardCard,
  recordOfferRedemption,
  applyReferralCodeForUser,
  type RewardWallet,
  type ScratchCardItem,
} from "@/services/rewards";

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { onTabScroll, resetTabBar } = useTabBarScroll();

  const [wallet, setWallet] = useState<RewardWallet | null>(null);
  const [cards, setCards] = useState<ScratchCardItem[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [referralInput, setReferralInput] = useState("");
  const [referralStatus, setReferralStatus] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const loadRewards = useCallback(async () => {
    if (!user?.id) {
      setWallet(null);
      setCards([]);
      return;
    }
    const [w, c] = await Promise.all([
      getUserRewardWallet(user.id),
      getUserScratchCards(user.id),
    ]);
    setWallet(w);
    setCards(c);
  }, [user?.id]);

  useFocusEffect(
    useCallback(() => {
      resetTabBar();
      void loadRewards();
    }, [resetTabBar, loadRewards])
  );

  useEffect(() => {
    void loadRewards();
  }, [loadRewards]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await loadRewards();
    setRefreshing(false);
  }, [loadRewards]);

  const handleScratch = useCallback(
    async (card: ScratchCardItem) => {
      if (!user?.id || card.status === "locked") return;
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await scratchRewardCard(user.id, card.id);
      await loadRewards();
    },
    [user?.id, loadRewards]
  );

  const handleCopyAndRedeem = useCallback(
    async (card: ScratchCardItem) => {
      if (!user?.id) return;
      if (card.offer.couponCode) {
        await Clipboard.setStringAsync(card.offer.couponCode);
        setCopiedId(card.id);
        setTimeout(() => setCopiedId(null), 2500);
      }
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
      await recordOfferRedemption(user.id, card.id);
      await loadRewards();
      Linking.openURL(card.offer.destinationUrl).catch(() => {});
    },
    [user?.id, loadRewards]
  );

  const handleApplyReferral = useCallback(async () => {
    if (!user?.id || !referralInput.trim()) return;
    const res = await applyReferralCodeForUser(user.id, referralInput);
    setReferralStatus(res.message);
    if (res.ok) {
      setReferralInput("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      await loadRewards();
    }
  }, [user?.id, referralInput, loadRewards]);

  const inviteCode = useMemo(() => {
    const raw =
      (user as any)?.username ||
      user?.displayName?.replace(/\s+/g, "").toLowerCase() ||
      user?.email?.split("@")[0]?.toLowerCase() ||
      "binro";
    return raw.replace(/[^a-z0-9_]/gi, "").toLowerCase() || "binro";
  }, [user]);

  const inviteUrl = `https://www.binro.in/invite/${inviteCode}`;

  const handleShareInvite = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: `Verify QR codes before you pay or open links with BinRo! Join with my invite link (${inviteUrl}) or code @${inviteCode} and scan 1 QR code to unlock a Silver Scratch Card.`,
        url: inviteUrl,
      });
    } catch {}
  }, [inviteUrl, inviteCode]);

  const dailyScans = wallet?.dailyEligibleScans ?? 0;
  const nextTarget = wallet?.nextMilestoneTarget ?? 3;
  const progressPct = wallet?.dailyCapReached
    ? 100
    : Math.min(100, Math.round((dailyScans / Math.max(1, nextTarget)) * 100));

  const tierColors = (tier: string): readonly [string, string] => {
    if (tier === "gold") return ["#B45309", "#F59E0B"] as const;
    if (tier === "silver") return ["#334155", "#64748B"] as const;
    return ["#1E3A8A", "#2563EB"] as const;
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + 10 }]}
        onScroll={onTabScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={colors.primary} />
        }
      >
        <View style={styles.headerRow}>
          <View>
            <Text style={[styles.title, { color: colors.text }]}>BinRo Rewards</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Scan safely, unlock Scratch Cards & partner deals
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/scanner")}
            style={[styles.scanCtaBtn, { backgroundColor: colors.primary }]}
          >
            <Ionicons name="scan" size={16} color={colors.primaryText} />
            <Text style={[styles.scanCtaText, { color: colors.primaryText }]}>Scan QR</Text>
          </Pressable>
        </View>

        {!user ? (
          <View
            style={[
              styles.authBanner,
              { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
            ]}
          >
            <Ionicons name="gift-outline" size={28} color={colors.primary} />
            <Text style={[styles.authTitle, { color: colors.text }]}>
              Sign in to Unlock Your First-Scan Scratch Card
            </Text>
            <Text style={[styles.authDesc, { color: colors.textSecondary }]}>
              Sign in with Google to earn a Welcome Scratch Card on your first QR scan, track daily
              milestones (3, 8, 15 scans), and invite friends for Gold VIP rewards.
            </Text>
            <Pressable
              onPress={() => router.push("/(auth)/login")}
              style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={[styles.primaryBtnText, { color: colors.primaryText }]}>
                Sign In to Claim Rewards
              </Text>
            </Pressable>
          </View>
        ) : (
          <>
            {/* Daily Progressive Milestone Card */}
            <View
              style={[
                styles.milestoneCard,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
              ]}
            >
              <View style={styles.milestoneHeader}>
                <View style={styles.milestoneLeft}>
                  <Text style={[styles.milestoneLabel, { color: colors.primary }]}>
                    DAILY SCAN MILESTONES (3 • 8 • 15)
                  </Text>
                  <Text style={[styles.milestoneTitle, { color: colors.text }]}>
                    {!wallet?.welcomeCardClaimed
                      ? "Scan 1 QR Code to Unlock Your Welcome Card!"
                      : wallet?.dailyCapReached
                        ? "Daily Cap Reached (3/3 Cards Unlocked Today)"
                        : `${wallet?.scansUntilNextCard ?? 3} more unique scan${
                            (wallet?.scansUntilNextCard ?? 3) === 1 ? "" : "s"
                          } to unlock your next Scratch Card`}
                  </Text>
                </View>
                <View style={[styles.badgePill, { backgroundColor: colors.primaryDim }]}>
                  <Text style={[styles.badgePillText, { color: colors.primary }]}>
                    {wallet?.dailyCardsUnlocked ?? 0}/3 Today
                  </Text>
                </View>
              </View>

              <View
                style={[
                  styles.progressTrack,
                  { backgroundColor: isDark ? "#1E293B" : "#E2E8F0" },
                ]}
              >
                <View
                  style={[
                    styles.progressFill,
                    { width: `${progressPct}%`, backgroundColor: colors.primary },
                  ]}
                />
              </View>

              <View style={styles.milestoneFooter}>
                <Text style={[styles.milestoneMeta, { color: colors.textSecondary }]}>
                  Today: {dailyScans} unique scans • Lifetime: {wallet?.lifetimeEligibleScans ?? 0}{" "}
                  scans
                </Text>
                <Text style={[styles.milestoneMeta, { color: colors.textMuted }]}>
                  Safety verdicts never affect reward eligibility
                </Text>
              </View>
            </View>

            {/* Scratch Cards Grid */}
            <View style={styles.sectionHeader}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>
                Your Scratch Cards ({cards.length})
              </Text>
            </View>

            {cards.length === 0 ? (
              <View
                style={[
                  styles.emptyBox,
                  { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                ]}
              >
                <Ionicons name="sparkles-outline" size={26} color={colors.primary} />
                <Text style={[styles.emptyTitle, { color: colors.text }]}>
                  No Scratch Cards Yet
                </Text>
                <Text style={[styles.emptyDesc, { color: colors.textSecondary }]}>
                  Scan your first unique QR code to immediately unlock your Welcome Scratch Card!
                </Text>
              </View>
            ) : (
              <View style={styles.cardsList}>
                {cards.map((card) => {
                  const isLocked = card.status === "locked";
                  const isUnscratched = card.status === "unlocked";
                  const grad = tierColors(card.tier);

                  return (
                    <View
                      key={card.id}
                      style={[
                        styles.cardItem,
                        { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                      ]}
                    >
                      {isLocked || isUnscratched ? (
                        <LinearGradient
                          colors={grad}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 1 }}
                          style={styles.scratchFoil}
                        >
                          <View style={styles.foilTopRow}>
                            <Text style={styles.tierBadgeText}>
                              {card.tier.toUpperCase()} SCRATCH CARD
                            </Text>
                            <Ionicons
                              name={isLocked ? "lock-closed" : "sparkles"}
                              size={18}
                              color="#FFF"
                            />
                          </View>

                          <Text style={styles.foilSourceText}>{card.sourceLabel}</Text>

                          {isLocked ? (
                            <Text style={styles.foilHintText}>
                              {card.unlockRequirementText ||
                                "Scan 1 unique QR code to unlock this card"}
                            </Text>
                          ) : (
                            <Pressable
                              onPress={() => handleScratch(card)}
                              style={styles.scratchActionBtn}
                            >
                              <Ionicons name="hand-left-outline" size={16} color="#0F172A" />
                              <Text style={styles.scratchActionText}>Tap to Scratch & Reveal</Text>
                            </Pressable>
                          )}
                        </LinearGradient>
                      ) : (
                        <View style={styles.revealedBody}>
                          <View style={styles.revealedHeader}>
                            <View>
                              <Text style={[styles.merchantText, { color: colors.primary }]}>
                                {card.offer.merchantName} • {card.tier.toUpperCase()} TIER
                              </Text>
                              <Text style={[styles.offerTitle, { color: colors.text }]}>
                                {card.offer.title}
                              </Text>
                            </View>
                            <View
                              style={[
                                styles.networkTag,
                                { backgroundColor: colors.primaryDim },
                              ]}
                            >
                              <Text style={[styles.networkTagText, { color: colors.primary }]}>
                                Verified Partner
                              </Text>
                            </View>
                          </View>

                          <Text style={[styles.offerDesc, { color: colors.textSecondary }]}>
                            {card.offer.description}
                          </Text>

                          {card.offer.couponCode ? (
                            <View
                              style={[
                                styles.couponBox,
                                {
                                  backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                                  borderColor: colors.surfaceBorder,
                                },
                              ]}
                            >
                              <Text style={[styles.couponLabel, { color: colors.textMuted }]}>
                                COUPON CODE
                              </Text>
                              <Text style={[styles.couponCode, { color: colors.text }]}>
                                {card.offer.couponCode}
                              </Text>
                            </View>
                          ) : null}

                          <Pressable
                            onPress={() => handleCopyAndRedeem(card)}
                            style={[styles.redeemBtn, { backgroundColor: colors.primary }]}
                          >
                            <Ionicons name="copy-outline" size={16} color={colors.primaryText} />
                            <Text style={[styles.redeemBtnText, { color: colors.primaryText }]}>
                              {copiedId === card.id
                                ? "Code Copied! Opening Partner..."
                                : card.offer.couponCode
                                  ? "Copy Code & Redeem Offer"
                                  : "Redeem Partner Offer"}
                            </Text>
                          </Pressable>

                          <Text style={[styles.termsNote, { color: colors.textMuted }]}>
                            {card.offer.termsText}
                          </Text>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}

            {/* Two-Sided Referral Engine */}
            <View
              style={[
                styles.referralCard,
                { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
              ]}
            >
              <View style={styles.referralHeader}>
                <Ionicons name="people-outline" size={22} color={colors.primary} />
                <Text style={[styles.referralTitle, { color: colors.text }]}>
                  Invite a Friend • Both Unlock VIP Scratch Cards
                </Text>
              </View>
              <Text style={[styles.referralDesc, { color: colors.textSecondary }]}>
                When your friend joins with your code @{inviteCode} and scans their first QR code,
                they unlock a Silver Welcome Card and you unlock a Gold VIP Scratch Card!
              </Text>

              <Pressable
                onPress={handleShareInvite}
                style={[styles.primaryBtn, { backgroundColor: colors.primary }]}
              >
                <Ionicons name="share-social-outline" size={16} color={colors.primaryText} />
                <Text style={[styles.primaryBtnText, { color: colors.primaryText }]}>
                  Share Invite Link (binro.in/invite/{inviteCode})
                </Text>
              </Pressable>

              {!wallet?.referredByCode && (
                <View style={styles.referralInputRow}>
                  <TextInput
                    value={referralInput}
                    onChangeText={setReferralInput}
                    placeholder="Have a friend's @username code?"
                    placeholderTextColor={colors.textMuted}
                    style={[
                      styles.referralInput,
                      {
                        color: colors.text,
                        borderColor: colors.surfaceBorder,
                        backgroundColor: isDark ? "#0F172A" : "#F8FAFC",
                      },
                    ]}
                  />
                  <Pressable
                    onPress={handleApplyReferral}
                    style={[styles.applyBtn, { backgroundColor: colors.primaryDim }]}
                  >
                    <Text style={[styles.applyBtnText, { color: colors.primary }]}>Apply</Text>
                  </Pressable>
                </View>
              )}

              {referralStatus ? (
                <Text style={[styles.statusText, { color: colors.primary }]}>{referralStatus}</Text>
              ) : null}
            </View>
          </>
        )}

        <View style={{ height: Math.max(140, 100 + insets.bottom) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 18 },
  headerRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 18,
  },
  title: { fontSize: 22, fontFamily: "Inter_700Bold" },
  subtitle: { fontSize: 13, fontFamily: "Inter_400Regular", marginTop: 2 },
  scanCtaBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 12,
  },
  scanCtaText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  authBanner: {
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 10,
  },
  authTitle: { fontSize: 16, fontFamily: "Inter_700Bold", textAlign: "center" },
  authDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 19 },
  milestoneCard: {
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    gap: 12,
  },
  milestoneHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  milestoneLeft: { flex: 1 },
  milestoneLabel: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.5 },
  milestoneTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold", marginTop: 4 },
  badgePill: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  badgePillText: { fontSize: 12, fontFamily: "Inter_700Bold" },
  progressTrack: { height: 9, borderRadius: 5, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 5 },
  milestoneFooter: { gap: 2 },
  milestoneMeta: { fontSize: 12, fontFamily: "Inter_400Regular" },
  sectionHeader: { marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontFamily: "Inter_700Bold" },
  emptyBox: {
    padding: 22,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
    gap: 8,
    marginBottom: 20,
  },
  emptyTitle: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  emptyDesc: { fontSize: 13, fontFamily: "Inter_400Regular", textAlign: "center" },
  cardsList: { gap: 14, marginBottom: 22 },
  cardItem: { borderRadius: 16, borderWidth: 1, overflow: "hidden" },
  scratchFoil: { padding: 18, gap: 10 },
  foilTopRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  tierBadgeText: {
    color: "#FFF",
    fontSize: 11,
    fontFamily: "Inter_700Bold",
    letterSpacing: 0.7,
  },
  foilSourceText: { color: "#FFF", fontSize: 16, fontFamily: "Inter_700Bold" },
  foilHintText: { color: "#E2E8F0", fontSize: 13, fontFamily: "Inter_500Medium" },
  scratchActionBtn: {
    marginTop: 4,
    backgroundColor: "#FFFFFF",
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  scratchActionText: { color: "#0F172A", fontSize: 13, fontFamily: "Inter_700Bold" },
  revealedBody: { padding: 16, gap: 10 },
  revealedHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 8,
  },
  merchantText: { fontSize: 11, fontFamily: "Inter_700Bold", letterSpacing: 0.4 },
  offerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", marginTop: 2 },
  networkTag: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  networkTagText: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  offerDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  couponBox: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  couponLabel: { fontSize: 11, fontFamily: "Inter_600SemiBold" },
  couponCode: { fontSize: 15, fontFamily: "Inter_700Bold", letterSpacing: 1 },
  redeemBtn: {
    paddingVertical: 11,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  redeemBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  termsNote: { fontSize: 11, fontFamily: "Inter_400Regular", lineHeight: 15 },
  referralCard: { padding: 16, borderRadius: 16, borderWidth: 1, gap: 12 },
  referralHeader: { flexDirection: "row", alignItems: "center", gap: 8 },
  referralTitle: { fontSize: 15, fontFamily: "Inter_700Bold", flex: 1 },
  referralDesc: { fontSize: 13, fontFamily: "Inter_400Regular", lineHeight: 18 },
  primaryBtn: {
    paddingVertical: 11,
    paddingHorizontal: 14,
    borderRadius: 10,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
  },
  primaryBtnText: { fontSize: 13, fontFamily: "Inter_600SemiBold" },
  referralInputRow: { flexDirection: "row", gap: 8, marginTop: 4 },
  referralInput: {
    flex: 1,
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    fontFamily: "Inter_400Regular",
  },
  applyBtn: {
    paddingHorizontal: 16,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnText: { fontSize: 13, fontFamily: "Inter_700Bold" },
  statusText: { fontSize: 12, fontFamily: "Inter_600SemiBold" },
});
