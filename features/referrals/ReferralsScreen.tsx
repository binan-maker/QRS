import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  TextInput,
  Share,
  Dimensions,
  Modal,
  NativeSyntheticEvent,
  NativeScrollEvent,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import * as Clipboard from "expo-clipboard";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import {
  getUserRewardWallet,
  getUserReferralsDashboard,
  getOrCreateUserReferralCode,
  applyReferralCodeForUser,
  buildReferralShareMessage,
  verifyReferralCode,
  savePendingReferralCode,
  type RewardWallet,
  type UserReferralsDashboard,
} from "@/services/rewards";

interface HeroSlide {
  id: string;
  badgeTag: string;
  badgeIcon: keyof typeof Ionicons.glyphMap;
  titleTop: string;
  titleHighlight: string;
  subtitle: string;
  themeType: "gold" | "silver";
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "gold-vip",
    badgeTag: "REFERRER REWARD",
    badgeIcon: "sparkles",
    titleTop: "Refer a Friend &",
    titleHighlight: "Earn Gold VIP Cards",
    subtitle: "Unlock Gold VIP Scratch Cards when friends complete their first scan.",
    themeType: "gold",
  },
  {
    id: "silver-welcome",
    badgeTag: "FRIEND'S BENEFIT",
    badgeIcon: "gift",
    titleTop: "Friends Get a",
    titleHighlight: "Silver Welcome Card",
    subtitle: "Friends get a Silver Welcome Scratch Card right after signing up.",
    themeType: "silver",
  },
];

export function ReferralsScreen() {
  const insets = useSafeAreaInsets();
  const { colors, isDark } = useTheme();
  const { user } = useAuth();
  const { width: screenWidth } = Dimensions.get("window");

  const [wallet, setWallet] = useState<RewardWallet | null>(null);
  const [refDashboard, setRefDashboard] = useState<UserReferralsDashboard | null>(null);

  // Carousel
  const [activeSlide, setActiveSlide] = useState(0);
  const carouselScrollRef = useRef<ScrollView>(null);

  // Claim referee modal
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [referralInput, setReferralInput] = useState("");
  const [applyingCode, setApplyingCode] = useState(false);
  const [referralStatus, setReferralStatus] = useState<string | null>(null);
  const [referralError, setReferralError] = useState(false);

  // Copy feedbacks
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 2200);
  }, []);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setRefDashboard({
        referralCode: "krzryn4",
        referralLink: "https://www.binro.in/register?ref=krzryn4",
        shortLink: "https://www.binro.in/register?ref=krzryn4",
        totalInvited: 0,
        totalQualified: 0,
        totalPending: 0,
        goldCardsEarned: 0,
        referrals: [],
      });
      return;
    }

    try {
      const [w, rd, userCode] = await Promise.all([
        getUserRewardWallet(user.id).catch(() => null),
        getUserReferralsDashboard(user.id).catch(() => null),
        getOrCreateUserReferralCode(user.id).catch(() => null),
      ]);
      if (w) {
        if (userCode && !w.ownReferralCode) w.ownReferralCode = userCode;
        setWallet(w);
      }
      if (rd) {
        if (userCode && (!rd.referralCode || rd.referralCode === "krzryn4")) {
          rd.referralCode = userCode;
          rd.referralLink = `https://www.binro.in/register?ref=${userCode}`;
          rd.shortLink = `https://www.binro.in/register?ref=${userCode}`;
        }
        setRefDashboard(rd);
      }
    } catch {}
  }, [user?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Auto-slide carousel every 5s
  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => {
        const next = (prev + 1) % HERO_SLIDES.length;
        carouselScrollRef.current?.scrollTo({ x: next * (screenWidth - 32), animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [screenWidth]);

  // Compute referee status
  const refereeStatus = useMemo((): "already_referred" | "expired" | "eligible" => {
    if (!wallet) return "eligible";
    if (wallet.referredByCode || wallet.referredByUserId) {
      return "already_referred";
    }
    const scanCount = (wallet.lifetimeEligibleScans || 0) + (wallet.dailyEligibleScans || 0);
    if (scanCount > 0) {
      return "expired";
    }
    return "eligible";
  }, [wallet]);

  const inviteCode = (wallet?.ownReferralCode || refDashboard?.referralCode || "krzryn4").toLowerCase();
  const signupLink = `https://www.binro.in/register?ref=${inviteCode}`;
  const displaySignupLink = `binro.in/register?ref=${inviteCode}`;

  const handleCopyCode = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(inviteCode.toUpperCase());
    setCodeCopied(true);
    showToast("Referral code copied!");
    setTimeout(() => setCodeCopied(false), 2000);
  };

  const handleCopyLink = async () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    await Clipboard.setStringAsync(signupLink);
    setLinkCopied(true);
    showToast("Signup link copied!");
    setTimeout(() => setLinkCopied(false), 2000);
  };

  const handleNativeShare = async () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Share.share({
        title: "Join BinRo — VIP Invite",
        message: buildReferralShareMessage(inviteCode),
        url: signupLink,
      });
    } catch {}
  };

  const handleApplyReferral = async () => {
    const code = referralInput.trim();
    if (!code) return;

    if (!user?.id) {
      setApplyingCode(true);
      setReferralStatus(null);
      setReferralError(false);
      try {
        const check = await verifyReferralCode(code);
        if (check.valid) {
          await savePendingReferralCode(check.code || code);
          setReferralError(false);
          setReferralStatus("Saved! Create an account to claim your Silver Welcome Card.");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        } else {
          setReferralError(true);
          setReferralStatus(check.error || "Invalid referral code.");
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
        }
      } catch {
        setReferralError(true);
        setReferralStatus("Could not verify referral code.");
      } finally {
        setApplyingCode(false);
      }
      return;
    }

    setApplyingCode(true);
    setReferralStatus(null);
    setReferralError(false);
    try {
      const res = await applyReferralCodeForUser(user.id, code);
      setReferralStatus(res.message);
      setReferralError(!res.ok);
      if (res.ok) {
        setReferralInput("");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        await loadData();
      }
    } catch {
      setReferralError(true);
      setReferralStatus("Could not verify referral code. Please check and try again.");
    } finally {
      setApplyingCode(false);
    }
  };

  const handleScroll = (event: NativeSyntheticEvent<NativeScrollEvent>) => {
    const slide = Math.round(event.nativeEvent.contentOffset.x / (screenWidth - 32));
    if (slide !== activeSlide && slide >= 0 && slide < HERO_SLIDES.length) {
      setActiveSlide(slide);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Toast Notification */}
      {toastMessage && (
        <View style={styles.toastPill}>
          <Ionicons name="checkmark-circle" size={16} color="#10B981" />
          <Text style={styles.toastText}>{toastMessage}</Text>
        </View>
      )}

      {/* Top Header */}
      <View style={[styles.topBar, { paddingTop: Math.max(insets.top, 16) }]}>
        <Pressable
          onPress={() => router.back()}
          hitSlop={12}
          style={({ pressed }) => [
            styles.circleBtn,
            { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9", opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>

        <Text style={[styles.topBarTitle, { color: colors.text }]}>Refer &amp; earn</Text>

        <Pressable
          onPress={handleNativeShare}
          hitSlop={12}
          style={({ pressed }) => [
            styles.circleBtn,
            { backgroundColor: isDark ? "rgba(255,255,255,0.08)" : "#F1F5F9", opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Ionicons name="share-social-outline" size={19} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 110 }]}
      >
        {/* ── 2-Card Hero Carousel ── */}
        <View style={styles.carouselWrapper}>
          <ScrollView
            ref={carouselScrollRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {HERO_SLIDES.map((item) => {
              const isGold = item.themeType === "gold";
              return (
                <View key={item.id} style={[styles.slideCardWrap, { width: screenWidth - 32 }]}>
                  <LinearGradient
                    colors={
                      isGold
                        ? ["#854D0E", "#CA8A04", "#EAB308"]
                        : ["#334155", "#475569", "#64748B"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={styles.heroSlide}
                  >
                    <View style={styles.slideTopRow}>
                      <View
                        style={[
                          styles.slideTagPill,
                          { backgroundColor: isGold ? "rgba(254, 240, 138, 0.25)" : "rgba(241, 245, 249, 0.2)" },
                        ]}
                      >
                        <Ionicons
                          name={item.badgeIcon}
                          size={11}
                          color={isGold ? "#FEF08A" : "#FFFFFF"}
                        />
                        <Text style={[styles.slideTagText, { color: isGold ? "#FEF08A" : "#FFFFFF" }]}>
                          {item.badgeTag}
                        </Text>
                      </View>
                    </View>

                    <Text style={styles.slideTitleTop}>{item.titleTop}</Text>
                    <Text
                      style={[
                        styles.slideTitleHighlight,
                        { color: isGold ? "#FEF08A" : "#F8FAFC" },
                      ]}
                    >
                      {item.titleHighlight}
                    </Text>
                    <Text style={styles.slideSubtitle}>{item.subtitle}</Text>
                  </LinearGradient>
                </View>
              );
            })}
          </ScrollView>

          {/* Carousel Dots */}
          <View style={styles.dotsRow}>
            {HERO_SLIDES.map((slide, idx) => (
              <Pressable
                key={slide.id}
                onPress={() => {
                  carouselScrollRef.current?.scrollTo({ x: idx * (screenWidth - 32), animated: true });
                  setActiveSlide(idx);
                }}
                style={[
                  styles.dot,
                  activeSlide === idx
                    ? [styles.activeDot, { backgroundColor: colors.primary }]
                    : { backgroundColor: isDark ? "rgba(255,255,255,0.2)" : "#CBD5E1" },
                ]}
              />
            ))}
          </View>
        </View>

        {/* ── Clean 2-Stat Row (0 Invite friends, 0 Cards Earned) ── */}
        <View style={styles.statsRow}>
          <View
            style={[
              styles.statPill,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F8FAFC",
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0",
              },
            ]}
          >
            <View style={[styles.statIconWrap, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="people-outline" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {refDashboard?.totalInvited ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Invite friends</Text>
            </View>
          </View>

          <View
            style={[
              styles.statPill,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.05)" : "#F8FAFC",
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0",
              },
            ]}
          >
            <View style={[styles.statIconWrap, { backgroundColor: `${colors.primary}18` }]}>
              <Ionicons name="gift-outline" size={18} color={colors.primary} />
            </View>
            <View>
              <Text style={[styles.statNumber, { color: colors.text }]}>
                {refDashboard?.goldCardsEarned ?? 0}
              </Text>
              <Text style={[styles.statLabel, { color: colors.textSecondary }]}>Cards Earned</Text>
            </View>
          </View>
        </View>

        {/* ── Invitation Method Section ── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>Invitation Method</Text>

          {/* Referral Code Row */}
          <View
            style={[
              styles.methodCard,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC",
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0",
              },
            ]}
          >
            <View style={styles.methodMeta}>
              <Text style={[styles.methodLabel, { color: colors.textMuted }]}>Referral code</Text>
              <Text style={[styles.methodValue, { color: colors.text }]}>
                {inviteCode.toUpperCase()}
              </Text>
            </View>

            <Pressable
              onPress={handleCopyCode}
              style={({ pressed }) => [
                styles.copyCircleBtn,
                {
                  backgroundColor: codeCopied ? "#10B981" : colors.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons
                name={codeCopied ? "checkmark" : "copy-outline"}
                size={16}
                color="#FFFFFF"
              />
            </Pressable>
          </View>

          {/* Signup Link Row */}
          <View
            style={[
              styles.methodCard,
              {
                backgroundColor: isDark ? "rgba(255,255,255,0.04)" : "#F8FAFC",
                borderColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0",
              },
            ]}
          >
            <View style={styles.methodMeta}>
              <Text style={[styles.methodLabel, { color: colors.textMuted }]}>Signup link</Text>
              <Text
                style={[styles.methodValueLink, { color: colors.primary }]}
                numberOfLines={1}
              >
                {displaySignupLink}
              </Text>
            </View>

            <Pressable
              onPress={handleCopyLink}
              style={({ pressed }) => [
                styles.copyCircleBtn,
                {
                  backgroundColor: linkCopied ? "#10B981" : colors.primary,
                  opacity: pressed ? 0.85 : 1,
                },
              ]}
            >
              <Ionicons
                name={linkCopied ? "checkmark" : "copy-outline"}
                size={16}
                color="#FFFFFF"
              />
            </Pressable>
          </View>
        </View>

        {/* ── How to Refer Section ── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>How to Refer</Text>

          <View style={styles.stepsList}>
            {/* Step 1 */}
            <View
              style={[
                styles.stepCard,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#F8FAFC",
                  borderColor: isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0",
                },
              ]}
            >
              <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepBadgeText}>1</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>Share</Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                  Send your referral link or code to friends
                </Text>
              </View>
            </View>

            {/* Step 2 */}
            <View
              style={[
                styles.stepCard,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#F8FAFC",
                  borderColor: isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0",
                },
              ]}
            >
              <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepBadgeText}>2</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>Register</Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                  Friends sign up using your link or code
                </Text>
              </View>
            </View>

            {/* Step 3 */}
            <View
              style={[
                styles.stepCard,
                {
                  backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#F8FAFC",
                  borderColor: isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0",
                },
              ]}
            >
              <View style={[styles.stepBadge, { backgroundColor: colors.primary }]}>
                <Text style={styles.stepBadgeText}>3</Text>
              </View>
              <View style={styles.stepContent}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>Earn</Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                  Get Gold VIP Scratch Cards when they scan
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* ── Invited Friends List (if any exist) ── */}
        {refDashboard?.referrals && refDashboard.referrals.length > 0 ? (
          <View style={styles.sectionBlock}>
            <Text style={[styles.sectionHeading, { color: colors.text }]}>
              Invited Friends ({refDashboard.referrals.length})
            </Text>
            <View style={styles.referralsList}>
              {refDashboard.referrals.map((item) => {
                const isQualified = item.status === "qualified";
                const initial = (item.invitedUserDisplayName || item.invitedUserUsername || "F")
                  .charAt(0)
                  .toUpperCase();
                return (
                  <View
                    key={item.id}
                    style={[
                      styles.referralItemCard,
                      {
                        backgroundColor: isDark ? "rgba(255,255,255,0.03)" : "#F8FAFC",
                        borderColor: isDark ? "rgba(255,255,255,0.06)" : "#E2E8F0",
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.referralAvatar,
                        { backgroundColor: `${colors.primary}18` },
                      ]}
                    >
                      <Text style={[styles.referralAvatarText, { color: colors.primary }]}>
                        {initial}
                      </Text>
                    </View>
                    <View style={styles.referralInfo}>
                      <Text style={[styles.referralName, { color: colors.text }]} numberOfLines={1}>
                        {item.invitedUserDisplayName || `@${item.invitedUserUsername || "friend"}`}
                      </Text>
                      <Text style={[styles.referralDate, { color: colors.textSecondary }]}>
                        {new Date(item.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </Text>
                    </View>
                    <View
                      style={[
                        styles.referralStatusBadge,
                        {
                          backgroundColor: isQualified
                            ? "rgba(16, 185, 129, 0.12)"
                            : "rgba(245, 158, 11, 0.12)",
                          borderColor: isQualified
                            ? "rgba(16, 185, 129, 0.3)"
                            : "rgba(245, 158, 11, 0.3)",
                        },
                      ]}
                    >
                      <Ionicons
                        name={isQualified ? "checkmark-circle" : "time-outline"}
                        size={12}
                        color={isQualified ? "#10B981" : "#F59E0B"}
                      />
                      <Text
                        style={[
                          styles.referralStatusText,
                          { color: isQualified ? "#10B981" : "#F59E0B" },
                        ]}
                      >
                        {isQualified ? "Qualified" : "Pending Scan"}
                      </Text>
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        ) : null}

        {/* ── Have a friend's referral code button ── */}
        <Pressable
          onPress={() => setClaimModalOpen(true)}
          style={({ pressed }) => [
            styles.haveCodeBtn,
            { opacity: pressed ? 0.75 : 1 },
          ]}
        >
          <Text style={[styles.haveCodeBtnText, { color: colors.primary }]}>
            Have a friend&apos;s referral code? Tap to enter
          </Text>
        </Pressable>
      </ScrollView>

      {/* ── Fixed Bottom CTA Bar ── */}
      <View
        style={[
          styles.bottomFixedBar,
          {
            backgroundColor: colors.background,
            borderTopColor: isDark ? "rgba(255,255,255,0.08)" : "#E2E8F0",
            paddingBottom: Math.max(insets.bottom, 14),
          },
        ]}
      >
        <Pressable
          onPress={handleNativeShare}
          style={({ pressed }) => [
            styles.inviteNowBtn,
            { backgroundColor: colors.primary, opacity: pressed ? 0.9 : 1 },
          ]}
        >
          <Text style={styles.inviteNowBtnText}>Invite now</Text>
          <Ionicons name="arrow-forward" size={17} color="#FFFFFF" />
        </Pressable>
      </View>

      {/* ── Claim Friend's Code Modal ── */}
      <Modal
        visible={claimModalOpen}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setClaimModalOpen(false);
          setReferralStatus(null);
        }}
      >
        <View style={styles.modalBackdrop}>
          <View
            style={[
              styles.modalSheet,
              {
                backgroundColor: isDark ? "#0F172A" : "#FFFFFF",
                paddingBottom: Math.max(insets.bottom + 16, 24),
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>Enter referee code</Text>
              <Pressable
                onPress={() => {
                  setClaimModalOpen(false);
                  setReferralStatus(null);
                }}
                hitSlop={12}
                style={styles.modalCloseBtn}
              >
                <Ionicons name="close" size={20} color={colors.text} />
              </Pressable>
            </View>

            {/* Guarded Case 1: Already Referred */}
            {refereeStatus === "already_referred" ? (
              <View style={styles.modalBlockedState}>
                <View style={[styles.modalStateIconWrap, { backgroundColor: "#10B98118" }]}>
                  <Ionicons name="checkmark-circle" size={36} color="#10B981" />
                </View>
                <Text style={[styles.modalStateTitle, { color: colors.text }]}>
                  You are already referred!
                </Text>
                <Text style={[styles.modalStateDesc, { color: colors.textSecondary }]}>
                  A referral code has already been linked to your account. Enjoy your rewards!
                </Text>
                <Pressable
                  onPress={() => setClaimModalOpen(false)}
                  style={[styles.modalDismissBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.modalDismissBtnText}>Got it</Text>
                </Pressable>
              </View>
            ) : refereeStatus === "expired" ? (
              /* Guarded Case 2: Expired after 1st scan */
              <View style={styles.modalBlockedState}>
                <View style={[styles.modalStateIconWrap, { backgroundColor: "#F59E0B18" }]}>
                  <Ionicons name="alert-circle" size={36} color="#F59E0B" />
                </View>
                <Text style={[styles.modalStateTitle, { color: colors.text }]}>
                  You can&apos;t enter, code expired!
                </Text>
                <Text style={[styles.modalStateDesc, { color: colors.textSecondary }]}>
                  Referral bonus codes must be entered before scanning your first QR code. Because you have already scanned a QR code, the code claim window is closed.
                </Text>
                <Pressable
                  onPress={() => setClaimModalOpen(false)}
                  style={[styles.modalDismissBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={styles.modalDismissBtnText}>Understood</Text>
                </Pressable>
              </View>
            ) : (
              /* Eligible Case */
              <View style={styles.modalEligibleBody}>
                <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                  Enter your friend&apos;s 7-character invite code before making your first scan to unlock your welcome reward.
                </Text>

                <TextInput
                  value={referralInput.toUpperCase()}
                  onChangeText={(val) => {
                    setReferralInput(val.replace(/[^a-zA-Z0-9]/g, "").slice(0, 7));
                    setReferralStatus(null);
                  }}
                  placeholder="e.g. KRZRYN4"
                  placeholderTextColor={colors.textMuted}
                  maxLength={7}
                  autoCapitalize="characters"
                  autoCorrect={false}
                  style={[
                    styles.modalInput,
                    {
                      backgroundColor: isDark ? "rgba(255,255,255,0.06)" : "#F1F5F9",
                      color: colors.text,
                      borderColor: isDark ? "rgba(255,255,255,0.1)" : "#CBD5E1",
                    },
                  ]}
                />

                {referralStatus && (
                  <View
                    style={[
                      styles.modalStatusBox,
                      { backgroundColor: referralError ? "#EF444415" : "#10B98115" },
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalStatusText,
                        { color: referralError ? "#EF4444" : "#10B981" },
                      ]}
                    >
                      {referralStatus}
                    </Text>
                  </View>
                )}

                {!user && referralStatus && !referralError ? (
                  <View style={{ gap: 10, marginTop: 14 }}>
                    <Pressable
                      onPress={() => {
                        setClaimModalOpen(false);
                        router.push("/(auth)/register");
                      }}
                      style={({ pressed }) => [
                        styles.modalSubmitBtn,
                        {
                          backgroundColor: "#10B981",
                          opacity: pressed ? 0.85 : 1,
                          marginTop: 0,
                        },
                      ]}
                    >
                      <Text style={styles.modalSubmitBtnText}>Create Account to Claim</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => {
                        setClaimModalOpen(false);
                        router.push("/(auth)/login");
                      }}
                      style={({ pressed }) => [
                        styles.modalSecondaryBtn,
                        { opacity: pressed ? 0.75 : 1 },
                      ]}
                    >
                      <Text style={[styles.modalSecondaryBtnText, { color: colors.primary }]}>
                        Already have an account? Sign In
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <Pressable
                    onPress={handleApplyReferral}
                    disabled={!referralInput.trim() || applyingCode}
                    style={({ pressed }) => [
                      styles.modalSubmitBtn,
                      {
                        backgroundColor: colors.primary,
                        opacity: !referralInput.trim() || applyingCode ? 0.5 : pressed ? 0.85 : 1,
                      },
                    ]}
                  >
                    <Text style={styles.modalSubmitBtnText}>
                      {applyingCode ? "Verifying..." : "Apply Code"}
                    </Text>
                  </Pressable>
                )}
              </View>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  toastPill: {
    position: "absolute",
    top: 60,
    alignSelf: "center",
    zIndex: 9999,
    backgroundColor: "rgba(15, 23, 42, 0.94)",
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 100,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 10,
    elevation: 8,
  },
  toastText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "600",
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
  topBarTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  carouselWrapper: {
    marginBottom: 16,
  },
  slideCardWrap: {
    paddingRight: 6,
  },
  heroSlide: {
    borderRadius: 22,
    padding: 20,
    minHeight: 175,
    justifyContent: "space-between",
  },
  slideTopRow: {
    flexDirection: "row",
  },
  slideTagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 100,
  },
  slideTagText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  slideTitleTop: {
    color: "#FFFFFF",
    fontSize: 20,
    fontWeight: "800",
    lineHeight: 25,
    marginTop: 8,
  },
  slideTitleHighlight: {
    fontSize: 22,
    fontWeight: "900",
    lineHeight: 27,
  },
  slideSubtitle: {
    color: "rgba(255, 255, 255, 0.85)",
    fontSize: 12,
    lineHeight: 17,
    marginTop: 6,
  },
  dotsRow: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 6,
    marginTop: 12,
  },
  dot: {
    width: 7,
    height: 7,
    borderRadius: 4,
  },
  activeDot: {
    width: 20,
  },
  statsRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  statPill: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
  },
  statIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  statNumber: {
    fontSize: 18,
    fontWeight: "800",
  },
  statLabel: {
    fontSize: 12,
    marginTop: 1,
  },
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
  },
  methodCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 10,
  },
  methodMeta: {
    flex: 1,
    marginRight: 10,
  },
  methodLabel: {
    fontSize: 11,
    fontWeight: "600",
  },
  methodValue: {
    fontSize: 16,
    fontWeight: "800",
    marginTop: 3,
  },
  methodValueLink: {
    fontSize: 14,
    fontWeight: "600",
    marginTop: 3,
  },
  copyCircleBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  stepsList: {
    gap: 10,
  },
  stepCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    gap: 14,
  },
  stepBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: {
    color: "#FFFFFF",
    fontSize: 13,
    fontWeight: "800",
  },
  stepContent: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  stepDesc: {
    fontSize: 12,
    marginTop: 2,
    lineHeight: 16,
  },
  haveCodeBtn: {
    alignItems: "center",
    paddingVertical: 14,
    marginBottom: 20,
  },
  haveCodeBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },
  bottomFixedBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 12,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  inviteNowBtn: {
    height: 52,
    borderRadius: 14,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  inviteNowBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "flex-end",
  },
  modalSheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    padding: 20,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "800",
  },
  modalCloseBtn: {
    padding: 4,
  },
  modalBlockedState: {
    alignItems: "center",
    paddingVertical: 18,
    paddingHorizontal: 12,
  },
  modalStateIconWrap: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalStateTitle: {
    fontSize: 17,
    fontWeight: "800",
    textAlign: "center",
  },
  modalStateDesc: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
    marginTop: 8,
    marginBottom: 20,
  },
  modalDismissBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    width: "100%",
  },
  modalDismissBtnText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "700",
  },
  modalEligibleBody: {
    marginTop: 4,
  },
  modalDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  modalInput: {
    height: 50,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  modalStatusBox: {
    padding: 10,
    borderRadius: 10,
    marginTop: 10,
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: "600",
    textAlign: "center",
  },
  modalSubmitBtn: {
    height: 50,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  modalSubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  modalSecondaryBtn: {
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryBtnText: {
    fontSize: 14,
    fontWeight: "700",
  },
});
