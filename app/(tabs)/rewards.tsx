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
  getUserReferralsDashboard,
  scratchRewardCard,
  recordOfferRedemption,
  applyReferralCodeForUser,
  buildReferralShareMessage,
  getWhatsAppShareUrl,
  getTelegramShareUrl,
  type RewardWallet,
  type ScratchCardItem,
  type UserReferralsDashboard,
  type ReferralRecord,
} from "@/services/rewards";

type RewardsTab = "cards" | "referrals";
type ReferralFilter = "all" | "pending" | "qualified";

export default function RewardsScreen() {
  const insets = useSafeAreaInsets();
  const topInset = useTopInset();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { onTabScroll, resetTabBar } = useTabBarScroll();

  const [activeTab, setActiveTab] = useState<RewardsTab>("cards");
  const [wallet, setWallet] = useState<RewardWallet | null>(null);
  const [cards, setCards] = useState<ScratchCardItem[]>([]);
  const [refDashboard, setRefDashboard] = useState<UserReferralsDashboard | null>(null);
  const [refFilter, setRefFilter] = useState<ReferralFilter>("all");
  const [refreshing, setRefreshing] = useState(false);
  const [referralInput, setReferralInput] = useState("");
  const [referralStatus, setReferralStatus] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [codeCopied, setCodeCopied] = useState(false);

  const inviteCode =
    wallet?.ownReferralCode || refDashboard?.referralCode || "binro7x";

  const inviteUrl = `https://www.binro.in/invite/${inviteCode}`;

  const loadRewards = useCallback(async () => {
    if (!user?.id) {
      setWallet(null);
      setCards([]);
      setRefDashboard(null);
      return;
    }
    const [w, c, rd] = await Promise.all([
      getUserRewardWallet(user.id),
      getUserScratchCards(user.id),
      getUserReferralsDashboard(user.id),
    ]);
    setWallet(w);
    setCards(c);
    setRefDashboard(rd);
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

  const handleCopyCode = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    await Clipboard.setStringAsync(inviteCode.toUpperCase());
    setCodeCopied(true);
    setTimeout(() => setCodeCopied(false), 2000);
  }, [inviteCode]);

  const handleNativeShare = useCallback(async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        message: buildReferralShareMessage(inviteCode),
        url: inviteUrl,
      });
    } catch {}
  }, [inviteCode, inviteUrl]);

  const handleWhatsAppShare = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(getWhatsAppShareUrl(inviteCode)).catch(() => {});
  }, [inviteCode]);

  const handleTelegramShare = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Linking.openURL(getTelegramShareUrl(inviteCode)).catch(() => {});
  }, [inviteCode]);

  const handleNudgeFriend = useCallback((friend: ReferralRecord) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const msg = `Hey @${friend.invitedUserUsername || "friend"}! Your BinRo Silver Welcome Scratch Card is waiting in your account. Scan any QR code with BinRo to unlock it right away: https://www.binro.in/invite/${inviteCode}`;
    Linking.openURL(`https://api.whatsapp.com/send?text=${encodeURIComponent(msg)}`).catch(() => {});
  }, [inviteCode]);

  const dailyScans = wallet?.dailyEligibleScans ?? 0;
  const nextTarget = wallet?.nextMilestoneTarget ?? 3;
  const progressPct = wallet?.dailyCapReached
    ? 100
    : Math.min(100, Math.round((dailyScans / Math.max(1, nextTarget)) * 100));

  const filteredReferrals = useMemo(() => {
    if (!refDashboard?.referrals) return [];
    if (refFilter === "pending") return refDashboard.referrals.filter((r) => r.status === "pending_first_scan");
    if (refFilter === "qualified") return refDashboard.referrals.filter((r) => r.status === "qualified");
    return refDashboard.referrals;
  }, [refDashboard, refFilter]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingTop: topInset + 6 }]}
        onScroll={onTabScroll}
        scrollEventThrottle={16}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
            colors={[colors.primary]}
          />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View>
            <Text style={[styles.headerTitle, { color: colors.text }]}>BinRo Rewards</Text>
            <Text style={[styles.headerSubtitle, { color: colors.textSecondary }]}>
              Scan safely, unlock coupons &amp; earn VIP cards
            </Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/scanner")}
            style={({ pressed }) => [
              styles.scanHeaderBtn,
              { backgroundColor: `${colors.primary}18`, opacity: pressed ? 0.8 : 1 },
            ]}
          >
            <Ionicons name="scan" size={16} color={colors.primary} />
            <Text style={[styles.scanHeaderBtnText, { color: colors.primary }]}>Scan QR</Text>
          </Pressable>
        </View>

        {/* Tab Segment Controls (Scratch Cards vs Refer & Earn) */}
        <View style={[styles.tabBar, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab("cards");
            }}
            style={[
              styles.tabBtn,
              activeTab === "cards" && { backgroundColor: colors.primary },
            ]}
          >
            <Ionicons
              name="gift"
              size={15}
              color={activeTab === "cards" ? "#ffffff" : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === "cards" ? "#ffffff" : colors.textSecondary },
              ]}
            >
              Scratch Cards ({cards.length})
            </Text>
          </Pressable>

          <Pressable
            onPress={() => {
              Haptics.selectionAsync();
              setActiveTab("referrals");
            }}
            style={[
              styles.tabBtn,
              activeTab === "referrals" && { backgroundColor: colors.primary },
            ]}
          >
            <Ionicons
              name="people"
              size={15}
              color={activeTab === "referrals" ? "#ffffff" : colors.textSecondary}
            />
            <Text
              style={[
                styles.tabBtnText,
                { color: activeTab === "referrals" ? "#ffffff" : colors.textSecondary },
              ]}
            >
              Refer &amp; Earn ({refDashboard?.totalInvited ?? 0})
            </Text>
          </Pressable>
        </View>

        {!user ? (
          <View
            style={[
              styles.card,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfaceBorder,
                alignItems: "center",
                paddingVertical: 32,
              },
            ]}
          >
            <Ionicons name="gift-outline" size={48} color={colors.primary} />
            <Text style={[styles.cardTitle, { color: colors.text, marginTop: 12 }]}>
              Sign In to Unlock Rewards
            </Text>
            <Text
              style={[
                styles.cardSubtitle,
                { color: colors.textSecondary, textAlign: "center", marginHorizontal: 20 },
              ]}
            >
              Sign in with Google to earn Welcome scratch cards, collect partner deals, and invite friends.
            </Text>
            <Pressable
              onPress={() => router.push("/(tabs)/profile")}
              style={({ pressed }) => [
                styles.actionBtn,
                { backgroundColor: colors.primary, marginTop: 16, opacity: pressed ? 0.85 : 1 },
              ]}
            >
              <Text style={styles.actionBtnText}>Sign In with Google</Text>
            </Pressable>
          </View>
        ) : activeTab === "cards" ? (
          <>
            {/* Daily Milestone Progress Card */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Today&apos;s Scan Progress</Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                    {wallet?.dailyCapReached
                      ? "Daily reward cap reached (3/3 cards unlocked)"
                      : `${dailyScans} of ${nextTarget} eligible scans for next card`}
                  </Text>
                </View>
                <View style={[styles.badge, { backgroundColor: `${colors.primary}18` }]}>
                  <Text style={[styles.badgeText, { color: colors.primary }]}>
                    {wallet?.dailyCardsUnlocked || 0} / 3 Cards
                  </Text>
                </View>
              </View>

              {/* Progress Bar */}
              <View style={[styles.progressTrack, { backgroundColor: isDark ? colors.surfaceLight : "#E2E8F0" }]}>
                <LinearGradient
                  colors={["#0066FF", "#38BDF8"]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={[styles.progressFill, { width: `${progressPct}%` }]}
                />
              </View>

              <View style={styles.milestoneRow}>
                <Text style={[styles.milestoneHint, { color: colors.textMuted }]}>
                  Milestones: 3 scans → 8 scans → 15 scans
                </Text>
                <Text style={[styles.milestoneHint, { color: colors.textMuted }]}>
                  {wallet?.scansUntilNextCard
                    ? `${wallet.scansUntilNextCard} more to go`
                    : "Completed"}
                </Text>
              </View>
            </View>

            {/* Quick Switch to Referrals Banner */}
            <Pressable
              onPress={() => {
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                setActiveTab("referrals");
              }}
              style={({ pressed }) => [
                styles.referralBanner,
                {
                  backgroundColor: isDark ? "rgba(30, 41, 59, 0.7)" : "#EFF6FF",
                  borderColor: `${colors.primary}30`,
                  opacity: pressed ? 0.9 : 1,
                },
              ]}
            >
              <View style={styles.referralBannerLeft}>
                <View style={[styles.bannerIconWrap, { backgroundColor: `${colors.primary}20` }]}>
                  <Ionicons name="sparkles" size={20} color={colors.primary} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={[styles.referralBannerTitle, { color: colors.text }]}>
                    Want a Gold VIP Card?
                  </Text>
                  <Text style={[styles.referralBannerSub, { color: colors.textSecondary }]}>
                    Invite a friend to BinRo. When they scan 1 QR code, you unlock a Gold VIP Card!
                  </Text>
                </View>
              </View>
              <Ionicons name="chevron-forward" size={18} color={colors.primary} />
            </Pressable>

            {/* Scratch Cards Section */}
            <View style={{ marginTop: 8 }}>
              <Text style={[styles.sectionTitle, { color: colors.text }]}>Your Scratch Cards</Text>

              {cards.length === 0 ? (
                <View
                  style={[
                    styles.emptyCard,
                    { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                  ]}
                >
                  <Ionicons name="scan-outline" size={40} color={colors.textMuted} />
                  <Text style={[styles.emptyTitle, { color: colors.text }]}>No scratch cards yet</Text>
                  <Text style={[styles.emptySub, { color: colors.textSecondary }]}>
                    Scan your 1st verified QR code or invite a friend to unlock your first card!
                  </Text>
                  <Pressable
                    onPress={() => router.push("/(tabs)/scanner")}
                    style={({ pressed }) => [
                      styles.actionBtn,
                      { backgroundColor: colors.primary, marginTop: 12, opacity: pressed ? 0.85 : 1 },
                    ]}
                  >
                    <Text style={styles.actionBtnText}>Open Scanner</Text>
                  </Pressable>
                </View>
              ) : (
                <View style={styles.cardsGrid}>
                  {cards.map((card) => {
                    const isLocked = card.status === "locked";
                    const isUnscratched = card.status === "unlocked";

                    return (
                      <View
                        key={card.id}
                        style={[
                          styles.scratchCardContainer,
                          {
                            backgroundColor: colors.surface,
                            borderColor:
                              card.tier === "gold"
                                ? "#F59E0B"
                                : card.tier === "silver"
                                  ? "#94A3B8"
                                  : colors.surfaceBorder,
                          },
                        ]}
                      >
                        {/* Card Header */}
                        <View style={styles.cardTopRow}>
                          <View
                            style={[
                              styles.tierChip,
                              {
                                backgroundColor:
                                  card.tier === "gold"
                                    ? "#F59E0B20"
                                    : card.tier === "silver"
                                      ? "#94A3B820"
                                      : `${colors.primary}18`,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.tierChipText,
                                {
                                  color:
                                    card.tier === "gold"
                                      ? "#F59E0B"
                                      : card.tier === "silver"
                                        ? "#94A3B8"
                                        : colors.primary,
                                },
                              ]}
                            >
                              {card.tier.toUpperCase()} TIER
                            </Text>
                          </View>
                          <Text style={[styles.cardSource, { color: colors.textMuted }]}>
                            {card.sourceLabel}
                          </Text>
                        </View>

                        {/* Interactive Scratch / Content Area */}
                        {isLocked ? (
                          <View style={styles.lockedArea}>
                            <Ionicons name="lock-closed" size={28} color={colors.textMuted} />
                            <Text style={[styles.lockedText, { color: colors.textSecondary }]}>
                              {card.unlockRequirementText || "Complete 1 scan to unlock"}
                            </Text>
                          </View>
                        ) : isUnscratched ? (
                          <Pressable
                            onPress={() => handleScratch(card)}
                            style={({ pressed }) => [
                              styles.unscratchedArea,
                              { opacity: pressed ? 0.9 : 1 },
                            ]}
                          >
                            <LinearGradient
                              colors={
                                card.tier === "gold"
                                  ? ["#F59E0B", "#D97706"]
                                  : card.tier === "silver"
                                    ? ["#64748B", "#475569"]
                                    : ["#2563EB", "#1D4ED8"]
                              }
                              style={styles.scratchGradient}
                            >
                              <Ionicons name="sparkles" size={28} color="#FFFFFF" />
                              <Text style={styles.tapToScratchText}>TAP TO SCRATCH &amp; REVEAL</Text>
                            </LinearGradient>
                          </Pressable>
                        ) : (
                          <View style={styles.revealedArea}>
                            <Text style={[styles.offerMerchant, { color: colors.textMuted }]}>
                              {card.offer.merchantName}
                            </Text>
                            <Text style={[styles.offerTitle, { color: colors.text }]}>
                              {card.offer.title}
                            </Text>
                            <Text style={[styles.offerDesc, { color: colors.textSecondary }]}>
                              {card.offer.description}
                            </Text>

                            {card.offer.couponCode && (
                              <View
                                style={[
                                  styles.couponBox,
                                  { backgroundColor: isDark ? colors.surfaceLight : "#F1F5F9" },
                                ]}
                              >
                                <Text style={[styles.couponCodeText, { color: colors.text }]}>
                                  {card.offer.couponCode}
                                </Text>
                                <Text style={[styles.couponHint, { color: colors.primary }]}>
                                  {copiedId === card.id ? "COPIED!" : "TAP REDEEM TO COPY"}
                                </Text>
                              </View>
                            )}

                            <Pressable
                              onPress={() => handleCopyAndRedeem(card)}
                              style={({ pressed }) => [
                                styles.redeemBtn,
                                { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                              ]}
                            >
                              <Ionicons name="open-outline" size={15} color="#FFFFFF" />
                              <Text style={styles.redeemBtnText}>Copy Code &amp; Redeem</Text>
                            </Pressable>
                          </View>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </>
        ) : (
          /* Refer & Earn — Zerodha / Upstox Style Production Dashboard */
          <View style={{ gap: 16 }}>
            {/* VIP Referral Hero Card */}
            <LinearGradient
              colors={
                isDark
                  ? ["#1E293B", "#0F172A"]
                  : ["#EFF6FF", "#DBEAFE"]
              }
              style={[
                styles.referralHero,
                { borderColor: `${colors.primary}40`, borderWidth: 1 },
              ]}
            >
              <View style={styles.referralHeroBadge}>
                <Ionicons name="trophy" size={13} color="#F59E0B" />
                <Text style={styles.referralHeroBadgeText}>TWO-SIDED VIP REFERRAL ENGINE</Text>
              </View>

              <Text style={[styles.referralHeroTitle, { color: colors.text }]}>
                Give Silver, Get Gold VIP
              </Text>
              <Text style={[styles.referralHeroDesc, { color: colors.textSecondary }]}>
                Friends get a Silver Welcome Card with AJIO &amp; boAt coupons upon joining. When they complete their first verified QR scan, you unlock a Gold VIP Scratch Card!
              </Text>

              {/* Code Chip & Copy */}
              <View
                style={[
                  styles.codeDisplayCard,
                  { backgroundColor: isDark ? "rgba(0,0,0,0.4)" : "#FFFFFF" },
                ]}
              >
                <View>
                  <Text style={[styles.codeLabel, { color: colors.textMuted }]}>YOUR REFERRAL CODE</Text>
                  <Text style={[styles.codeValue, { color: colors.text }]}>
                    {inviteCode.toUpperCase()}
                  </Text>
                </View>
                <Pressable
                  onPress={handleCopyCode}
                  style={({ pressed }) => [
                    styles.copyCodeBtn,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Ionicons name={codeCopied ? "checkmark" : "copy-outline"} size={16} color="#FFFFFF" />
                  <Text style={styles.copyCodeBtnText}>
                    {codeCopied ? "COPIED!" : "COPY"}
                  </Text>
                </Pressable>
              </View>

              {/* One-Tap Share Action Buttons */}
              <View style={styles.shareButtonsRow}>
                <Pressable
                  onPress={handleWhatsAppShare}
                  style={({ pressed }) => [
                    styles.socialShareBtn,
                    { backgroundColor: "#25D366", opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Ionicons name="logo-whatsapp" size={18} color="#FFFFFF" />
                  <Text style={styles.socialShareBtnText}>WhatsApp</Text>
                </Pressable>

                <Pressable
                  onPress={handleTelegramShare}
                  style={({ pressed }) => [
                    styles.socialShareBtn,
                    { backgroundColor: "#229ED9", opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Ionicons name="paper-plane" size={18} color="#FFFFFF" />
                  <Text style={styles.socialShareBtnText}>Telegram</Text>
                </Pressable>

                <Pressable
                  onPress={handleNativeShare}
                  style={({ pressed }) => [
                    styles.socialShareBtn,
                    { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
                  ]}
                >
                  <Ionicons name="share-social" size={18} color="#FFFFFF" />
                  <Text style={styles.socialShareBtnText}>Share</Text>
                </Pressable>
              </View>
            </LinearGradient>

            {/* Performance Analytics Grid (Zerodha / Upstox Metrics) */}
            <View style={styles.analyticsGrid}>
              <View
                style={[
                  styles.metricCell,
                  { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                ]}
              >
                <Text style={[styles.metricNumber, { color: colors.primary }]}>
                  {refDashboard?.totalInvited ?? 0}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Friends Joined</Text>
              </View>

              <View
                style={[
                  styles.metricCell,
                  { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                ]}
              >
                <Text style={[styles.metricNumber, { color: "#F59E0B" }]}>
                  {refDashboard?.totalPending ?? 0}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Pending 1st Scan</Text>
              </View>

              <View
                style={[
                  styles.metricCell,
                  { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                ]}
              >
                <Text style={[styles.metricNumber, { color: "#10B981" }]}>
                  {refDashboard?.totalQualified ?? 0}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Completed Scans</Text>
              </View>

              <View
                style={[
                  styles.metricCell,
                  { backgroundColor: colors.surface, borderColor: colors.surfaceBorder },
                ]}
              >
                <Text style={[styles.metricNumber, { color: "#8B5CF6" }]}>
                  {refDashboard?.goldCardsEarned ?? 0}
                </Text>
                <Text style={[styles.metricLabel, { color: colors.textSecondary }]}>Gold VIP Cards</Text>
              </View>
            </View>

            {/* Invited Friends Live Ledger */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <View style={styles.cardHeaderRow}>
                <View>
                  <Text style={[styles.cardTitle, { color: colors.text }]}>Invited Friends Ledger</Text>
                  <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                    Live attribution &amp; qualification status
                  </Text>
                </View>
              </View>

              {/* Filter Pills */}
              <View style={styles.filterRow}>
                <Pressable
                  onPress={() => setRefFilter("all")}
                  style={[
                    styles.filterChip,
                    refFilter === "all"
                      ? { backgroundColor: colors.primary }
                      : { backgroundColor: `${colors.textMuted}15` },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: refFilter === "all" ? "#FFFFFF" : colors.textSecondary },
                    ]}
                  >
                    All ({refDashboard?.totalInvited ?? 0})
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setRefFilter("pending")}
                  style={[
                    styles.filterChip,
                    refFilter === "pending"
                      ? { backgroundColor: "#F59E0B" }
                      : { backgroundColor: `${colors.textMuted}15` },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: refFilter === "pending" ? "#FFFFFF" : colors.textSecondary },
                    ]}
                  >
                    Pending ({refDashboard?.totalPending ?? 0})
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => setRefFilter("qualified")}
                  style={[
                    styles.filterChip,
                    refFilter === "qualified"
                      ? { backgroundColor: "#10B981" }
                      : { backgroundColor: `${colors.textMuted}15` },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterChipText,
                      { color: refFilter === "qualified" ? "#FFFFFF" : colors.textSecondary },
                    ]}
                  >
                    Qualified ({refDashboard?.totalQualified ?? 0})
                  </Text>
                </Pressable>
              </View>

              {/* List */}
              {filteredReferrals.length === 0 ? (
                <View style={styles.emptyLedger}>
                  <Ionicons name="people-outline" size={32} color={colors.textMuted} />
                  <Text style={[styles.emptyLedgerText, { color: colors.textSecondary }]}>
                    {refFilter === "all"
                      ? "No friends invited yet. Share your code above to start earning!"
                      : `No ${refFilter} referrals right now.`}
                  </Text>
                </View>
              ) : (
                <View style={styles.friendsList}>
                  {filteredReferrals.map((friend) => {
                    const isQualified = friend.status === "qualified";
                    return (
                      <View
                        key={friend.id}
                        style={[
                          styles.friendItem,
                          { borderBottomColor: `${colors.surfaceBorder}` },
                        ]}
                      >
                        <View style={styles.friendLeft}>
                          <View
                            style={[
                              styles.friendAvatar,
                              {
                                backgroundColor: isQualified
                                  ? "#10B98120"
                                  : "#F59E0B20",
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.friendAvatarText,
                                { color: isQualified ? "#10B981" : "#F59E0B" },
                              ]}
                            >
                              {(friend.invitedUserUsername || "F").slice(0, 1).toUpperCase()}
                            </Text>
                          </View>
                          <View>
                            <Text style={[styles.friendName, { color: colors.text }]}>
                              @{friend.invitedUserUsername || "friend"}
                            </Text>
                            <Text style={[styles.friendDate, { color: colors.textMuted }]}>
                              Joined {new Date(friend.createdAt).toLocaleDateString()}
                            </Text>
                          </View>
                        </View>

                        <View style={styles.friendRight}>
                          {isQualified ? (
                            <View style={[styles.statusBadge, { backgroundColor: "#10B98120" }]}>
                              <Ionicons name="checkmark-circle" size={13} color="#10B981" />
                              <Text style={[styles.statusBadgeText, { color: "#10B981" }]}>
                                Gold Card Issued
                              </Text>
                            </View>
                          ) : (
                            <Pressable
                              onPress={() => handleNudgeFriend(friend)}
                              style={({ pressed }) => [
                                styles.nudgeBtn,
                                { backgroundColor: `${colors.primary}18`, opacity: pressed ? 0.8 : 1 },
                              ]}
                            >
                              <Ionicons name="logo-whatsapp" size={13} color={colors.primary} />
                              <Text style={[styles.nudgeBtnText, { color: colors.primary }]}>
                                Remind
                              </Text>
                            </Pressable>
                          )}
                        </View>
                      </View>
                    );
                  })}
                </View>
              )}
            </View>

            {/* Manual Referral Binding (If not already referred) */}
            <View style={[styles.card, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}>
              <Text style={[styles.cardTitle, { color: colors.text }]}>Have a Referral Code?</Text>
              <Text style={[styles.cardSubtitle, { color: colors.textSecondary }]}>
                {wallet?.referredByCode
                  ? `Active gift linked to referral code ${wallet.referredByCode}.`
                  : (wallet?.lifetimeEligibleScans || 0) > 0 || (wallet?.dailyEligibleScans || 0) > 0
                    ? "In accordance with Google Pay referral rules, codes can only be claimed before your very first QR scan."
                    : "Type your friend's 7-character code to claim your Silver Welcome Scratch Card before your first scan."}
              </Text>

              {wallet?.referredByCode ? (
                <View style={[styles.activeReferralPill, { backgroundColor: `${colors.safe}15`, marginTop: 12 }]}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.safe} />
                  <Text style={[styles.activeReferralPillText, { color: colors.safe }]}>
                    Linked to code: {wallet.referredByCode}
                  </Text>
                </View>
              ) : (wallet?.lifetimeEligibleScans || 0) > 0 || (wallet?.dailyEligibleScans || 0) > 0 ? (
                <View
                  style={{
                    marginTop: 12,
                    padding: 14,
                    borderRadius: 14,
                    backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F1F5F9",
                    borderWidth: 1,
                    borderColor: `${colors.textMuted}30`,
                    flexDirection: "row",
                    alignItems: "center",
                    gap: 10,
                  }}
                >
                  <Ionicons name="lock-closed" size={20} color={colors.textMuted} />
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 13, fontWeight: "700", color: colors.text }}>
                      Referral Code Input Disabled
                    </Text>
                    <Text style={{ fontSize: 11, color: colors.textSecondary, marginTop: 2, lineHeight: 16 }}>
                      Because you have already scanned your first QR code with BinRo, friend referral codes can no longer be applied to this account.
                    </Text>
                  </View>
                </View>
              ) : (
                <View style={{ marginTop: 12 }}>
                  <View style={styles.inputRow}>
                    <TextInput
                      value={referralInput}
                      onChangeText={setReferralInput}
                      placeholder="e.g. yn5i82v"
                      placeholderTextColor={colors.textMuted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      maxLength={10}
                      style={[
                        styles.input,
                        {
                          backgroundColor: isDark ? colors.surfaceLight : "#F1F5F9",
                          color: colors.text,
                          borderColor: colors.surfaceBorder,
                        },
                      ]}
                    />
                    <Pressable
                      onPress={handleApplyReferral}
                      disabled={!referralInput.trim()}
                      style={({ pressed }) => [
                        styles.applyBtn,
                        {
                          backgroundColor: colors.primary,
                          opacity: !referralInput.trim() ? 0.5 : pressed ? 0.85 : 1,
                        },
                      ]}
                    >
                      <Text style={styles.applyBtnText}>Apply</Text>
                    </Pressable>
                  </View>
                  <Text style={{ fontSize: 11, color: colors.textMuted, marginTop: 6 }}>
                    ⚠️ Note: This input will be permanently disabled once you scan your first QR code.
                  </Text>
                  {referralStatus && (
                    <Text style={[styles.statusMsg, { color: colors.primary }]}>
                      {referralStatus}
                    </Text>
                  )}
                </View>
              )}
            </View>
          </View>
        )}

        <View style={{ height: Math.max(160, 110 + insets.bottom) }} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scrollContent: { paddingHorizontal: 16, paddingTop: 6 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerTitle: { fontSize: 24, fontWeight: "800", letterSpacing: -0.5 },
  headerSubtitle: { fontSize: 13, marginTop: 2 },
  scanHeaderBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  scanHeaderBtnText: { fontSize: 13, fontWeight: "700" },
  tabBar: {
    flexDirection: "row",
    borderRadius: 14,
    borderWidth: 1,
    padding: 4,
    marginBottom: 16,
    gap: 4,
  },
  tabBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 10,
    borderRadius: 10,
  },
  tabBtnText: { fontSize: 13, fontWeight: "700" },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
  },
  cardHeaderRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
  },
  cardTitle: { fontSize: 16, fontWeight: "700" },
  cardSubtitle: { fontSize: 13, marginTop: 2 },
  badge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 10,
  },
  badgeText: { fontSize: 12, fontWeight: "700" },
  progressTrack: {
    height: 10,
    borderRadius: 6,
    marginTop: 14,
    overflow: "hidden",
  },
  progressFill: { height: "100%", borderRadius: 6 },
  milestoneRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginTop: 8,
  },
  milestoneHint: { fontSize: 11, fontWeight: "500" },
  referralBanner: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderRadius: 18,
    borderWidth: 1,
    padding: 14,
    marginBottom: 14,
  },
  referralBannerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    flex: 1,
  },
  bannerIconWrap: {
    width: 40,
    height: 40,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  referralBannerTitle: { fontSize: 15, fontWeight: "700" },
  referralBannerSub: { fontSize: 12, marginTop: 2, lineHeight: 16 },
  sectionTitle: { fontSize: 18, fontWeight: "800", marginBottom: 12 },
  emptyCard: {
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    padding: 32,
    gap: 8,
  },
  emptyTitle: { fontSize: 16, fontWeight: "700" },
  emptySub: { fontSize: 13, textAlign: "center", maxWidth: 280, lineHeight: 18 },
  actionBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
  },
  actionBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  cardsGrid: { gap: 14 },
  scratchCardContainer: {
    borderRadius: 20,
    borderWidth: 1.5,
    padding: 16,
    gap: 12,
  },
  cardTopRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  tierChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
  },
  tierChipText: { fontSize: 11, fontWeight: "800", letterSpacing: 0.5 },
  cardSource: { fontSize: 12, fontWeight: "500" },
  lockedArea: {
    alignItems: "center",
    paddingVertical: 24,
    gap: 8,
  },
  lockedText: { fontSize: 13, textAlign: "center", fontWeight: "500" },
  unscratchedArea: {
    borderRadius: 14,
    overflow: "hidden",
  },
  scratchGradient: {
    paddingVertical: 28,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  tapToScratchText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
    letterSpacing: 0.8,
  },
  revealedArea: { gap: 8 },
  offerMerchant: { fontSize: 12, fontWeight: "700", textTransform: "uppercase" },
  offerTitle: { fontSize: 17, fontWeight: "800", lineHeight: 22 },
  offerDesc: { fontSize: 13, lineHeight: 18 },
  couponBox: {
    padding: 12,
    borderRadius: 12,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  couponCodeText: { fontSize: 16, fontWeight: "800", letterSpacing: 1 },
  couponHint: { fontSize: 11, fontWeight: "700" },
  redeemBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingVertical: 13,
    borderRadius: 12,
    marginTop: 4,
  },
  redeemBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  /* Referrals Hero */
  referralHero: {
    borderRadius: 22,
    padding: 20,
    gap: 12,
  },
  referralHeroBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  referralHeroBadgeText: {
    color: "#F59E0B",
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  referralHeroTitle: { fontSize: 22, fontWeight: "800", letterSpacing: -0.4 },
  referralHeroDesc: { fontSize: 13, lineHeight: 19 },
  codeDisplayCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 14,
    marginTop: 4,
  },
  codeLabel: { fontSize: 10, fontWeight: "700", letterSpacing: 0.5 },
  codeValue: { fontSize: 20, fontWeight: "900", letterSpacing: 1.5, marginTop: 2 },
  copyCodeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 10,
  },
  copyCodeBtnText: { color: "#FFFFFF", fontSize: 12, fontWeight: "800" },
  shareButtonsRow: {
    flexDirection: "row",
    gap: 10,
    marginTop: 4,
  },
  socialShareBtn: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 12,
    borderRadius: 12,
  },
  socialShareBtnText: { color: "#FFFFFF", fontSize: 13, fontWeight: "700" },
  /* Analytics Grid */
  analyticsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  metricCell: {
    flex: 1,
    minWidth: "45%",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    alignItems: "center",
  },
  metricNumber: { fontSize: 24, fontWeight: "800" },
  metricLabel: { fontSize: 12, fontWeight: "600", marginTop: 2 },
  /* Ledger */
  filterRow: {
    flexDirection: "row",
    gap: 8,
    marginVertical: 12,
  },
  filterChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  filterChipText: { fontSize: 12, fontWeight: "700" },
  emptyLedger: {
    alignItems: "center",
    paddingVertical: 28,
    gap: 8,
  },
  emptyLedgerText: { fontSize: 13, textAlign: "center", maxWidth: 260 },
  friendsList: { marginTop: 4 },
  friendItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  friendLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  friendAvatar: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  friendAvatarText: { fontSize: 16, fontWeight: "800" },
  friendName: { fontSize: 14, fontWeight: "700" },
  friendDate: { fontSize: 11, marginTop: 1 },
  friendRight: {},
  statusBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statusBadgeText: { fontSize: 11, fontWeight: "700" },
  nudgeBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  nudgeBtnText: { fontSize: 12, fontWeight: "700" },
  activeReferralPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    marginTop: 10,
  },
  activeReferralPillText: { fontSize: 13, fontWeight: "700" },
  inputRow: {
    flexDirection: "row",
    gap: 10,
  },
  input: {
    flex: 1,
    height: 46,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 14,
    fontSize: 14,
  },
  applyBtn: {
    paddingHorizontal: 18,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  applyBtnText: { color: "#FFFFFF", fontSize: 14, fontWeight: "700" },
  statusMsg: { fontSize: 12, fontWeight: "600", marginTop: 8 },
});
