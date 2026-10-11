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
import AsyncStorage from "@react-native-async-storage/async-storage";
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
  const slideWidth = screenWidth - 32;

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
      let guestCode = "krzryn4";
      try {
        const cached =
          (await AsyncStorage.getItem("binro_guest_ref_code")) ||
          (await AsyncStorage.getItem("binro_user_ref_code"));
        if (cached) guestCode = cached;
      } catch {}

      setRefDashboard({
        referralCode: guestCode,
        referralLink: `https://www.binro.in/register?ref=${guestCode}`,
        shortLink: `https://www.binro.in/register?ref=${guestCode}`,
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
        carouselScrollRef.current?.scrollTo({ x: next * slideWidth, animated: true });
        return next;
      });
    }, 5000);
    return () => clearInterval(timer);
  }, [slideWidth]);

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
    const slide = Math.round(event.nativeEvent.contentOffset.x / slideWidth);
    if (slide !== activeSlide && slide >= 0 && slide < HERO_SLIDES.length) {
      setActiveSlide(slide);
    }
  };

  const handleBack = () => {
    if (router.canGoBack()) {
      router.back();
    } else {
      router.replace("/(tabs)");
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
          onPress={handleBack}
          hitSlop={12}
          style={({ pressed }) => [
            styles.circleBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </Pressable>

        <Text style={[styles.topBarTitle, { color: colors.text }]}>Referral</Text>

        <Pressable
          onPress={handleNativeShare}
          hitSlop={12}
          style={({ pressed }) => [
            styles.circleBtn,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
              opacity: pressed ? 0.7 : 1,
            },
          ]}
        >
          <Ionicons name="share-social-outline" size={19} color={colors.text} />
        </Pressable>
      </View>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 90 },
        ]}
      >
        {/* ── 2-Card Hero Carousel (Matches Black & White Themes) ── */}
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
                <View key={item.id} style={[styles.slideCardWrap, { width: slideWidth }]}>
                  <LinearGradient
                    colors={
                      isDark
                        ? ["#18181B", "#121214", "#0A0A0C"]
                        : ["#FFFFFF", "#F9FAFB", "#F1F5F9"]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                      styles.heroSlide,
                      {
                        borderColor: isDark
                          ? "rgba(255, 255, 255, 0.12)"
                          : "rgba(0, 0, 0, 0.08)",
                        shadowColor: isDark ? "#000000" : "#64748B",
                      },
                    ]}
                  >
                    {/* Top Row: Clickable Slide Dots (Left) and Tag Pill (Right) */}
                    <View style={styles.slideTopRow}>
                      <View style={styles.dotsRow}>
                        {HERO_SLIDES.map((slide, idx) => (
                          <Pressable
                            key={slide.id}
                            onPress={() => {
                              carouselScrollRef.current?.scrollTo({
                                x: idx * slideWidth,
                                animated: true,
                              });
                              setActiveSlide(idx);
                            }}
                            hitSlop={8}
                            style={[
                              styles.dot,
                              activeSlide === idx
                                ? [
                                    styles.activeDot,
                                    { backgroundColor: isDark ? "#FFFFFF" : "#09090B" },
                                  ]
                                : [
                                    styles.inactiveDot,
                                    {
                                      backgroundColor: isDark
                                        ? "rgba(255, 255, 255, 0.28)"
                                        : "rgba(0, 0, 0, 0.2)",
                                    },
                                  ],
                            ]}
                          />
                        ))}
                      </View>

                      <View
                        style={[
                          styles.slideTagPill,
                          {
                            backgroundColor: isDark
                              ? isGold
                                ? "rgba(245, 158, 11, 0.16)"
                                : "rgba(255, 255, 255, 0.08)"
                              : isGold
                              ? "rgba(245, 158, 11, 0.12)"
                              : "rgba(0, 0, 0, 0.05)",
                            borderColor: isDark
                              ? isGold
                                ? "rgba(245, 158, 11, 0.35)"
                                : "rgba(255, 255, 255, 0.2)"
                              : isGold
                              ? "rgba(245, 158, 11, 0.25)"
                              : "rgba(0, 0, 0, 0.1)",
                          },
                        ]}
                      >
                        <Ionicons
                          name={item.badgeIcon}
                          size={11}
                          color={
                            isGold
                              ? isDark
                                ? "#FDE047"
                                : "#D97706"
                              : isDark
                              ? "#F8FAFC"
                              : "#09090B"
                          }
                        />
                        <Text
                          style={[
                            styles.slideTagText,
                            {
                              color: isGold
                                ? isDark
                                  ? "#FDE047"
                                  : "#D97706"
                                : isDark
                                ? "#F8FAFC"
                                : "#09090B",
                            },
                          ]}
                        >
                          {item.badgeTag}
                        </Text>
                      </View>
                    </View>

                    <View style={styles.slideBodyWrap}>
                      <Text
                        style={[
                          styles.slideTitleTop,
                          { color: isDark ? "#FFFFFF" : "#09090B" },
                        ]}
                      >
                        {item.titleTop}
                      </Text>
                      <Text
                        style={[
                          styles.slideTitleHighlight,
                          {
                            color: isGold
                              ? isDark
                                ? "#FDE047"
                                : "#D97706"
                              : isDark
                              ? "#FFFFFF"
                              : "#09090B",
                          },
                        ]}
                      >
                        {item.titleHighlight}
                      </Text>
                      <Text
                        style={[
                          styles.slideSubtitle,
                          {
                            color: isDark
                              ? "rgba(255, 255, 255, 0.72)"
                              : "#64748B",
                          },
                        ]}
                      >
                        {item.subtitle}
                      </Text>
                    </View>
                  </LinearGradient>
                </View>
              );
            })}
          </ScrollView>
        </View>

        {/* ── VIP Referral Code Card ── */}
        <View
          style={[
            styles.vipCodeCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
            },
          ]}
        >
          <View style={styles.codeHeaderRow}>
            <View style={styles.codeLabelWrap}>
              <Ionicons name="sparkles" size={13} color={colors.primary} />
              <Text style={[styles.codeLabel, { color: colors.textMuted }]}>
                YOUR REFERRAL CODE
              </Text>
            </View>
            <View
              style={[
                styles.codeActiveBadge,
                { backgroundColor: `${colors.primary}14` },
              ]}
            >
              <Text style={[styles.codeActiveText, { color: colors.primary }]}>
                ACTIVE
              </Text>
            </View>
          </View>

          {/* Monospace Code & Copy Button */}
          <View
            style={[
              styles.codeBox,
              {
                backgroundColor: colors.inputBackground || colors.surfaceLight,
                borderColor: colors.surfaceBorder,
              },
            ]}
          >
            <Text style={[styles.codeText, { color: colors.primary }]}>
              {inviteCode.toUpperCase()}
            </Text>

            <Pressable
              onPress={handleCopyCode}
              style={({ pressed }) => [
                styles.copyActionBtn,
                {
                  backgroundColor: codeCopied ? "#10B981" : colors.primary,
                  opacity: pressed ? 0.88 : 1,
                },
              ]}
            >
              <Ionicons
                name={codeCopied ? "checkmark" : "copy-outline"}
                size={15}
                color="#FFFFFF"
              />
              <Text style={styles.copyActionBtnText}>
                {codeCopied ? "Copied" : "Copy"}
              </Text>
            </Pressable>
          </View>

          {/* Signup Link Row */}
          <View
            style={[
              styles.linkBox,
              {
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.03)"
                  : "rgba(0, 0, 0, 0.02)",
                borderColor: colors.surfaceBorder,
              },
            ]}
          >
            <View style={styles.linkInfo}>
              <Text style={[styles.linkLabel, { color: colors.textMuted }]}>
                SIGNUP LINK
              </Text>
              <Text
                style={[styles.linkValue, { color: colors.text }]}
                numberOfLines={1}
              >
                {displaySignupLink}
              </Text>
            </View>

            <Pressable
              onPress={handleCopyLink}
              hitSlop={8}
              style={({ pressed }) => [
                styles.linkCopyIconBtn,
                {
                  backgroundColor: linkCopied
                    ? "#10B981"
                    : isDark
                    ? "rgba(255, 255, 255, 0.08)"
                    : "#E2E8F0",
                  opacity: pressed ? 0.8 : 1,
                },
              ]}
            >
              <Ionicons
                name={linkCopied ? "checkmark" : "link-outline"}
                size={16}
                color={linkCopied ? "#FFFFFF" : colors.text}
              />
            </Pressable>
          </View>

          {/* Single Clean Share Action Button (No WhatsApp, No Telegram) */}
          <Pressable
            onPress={handleNativeShare}
            style={({ pressed }) => [
              styles.singleShareBtn,
              {
                backgroundColor: isDark
                  ? "rgba(255, 255, 255, 0.06)"
                  : "#F1F5F9",
                borderColor: colors.surfaceBorder,
                opacity: pressed ? 0.85 : 1,
              },
            ]}
          >
            <Ionicons name="share-social-outline" size={17} color={colors.text} />
            <Text style={[styles.singleShareBtnText, { color: colors.text }]}>
              Share Code
            </Text>
          </Pressable>
        </View>

        {/* ── Have a friend's referral code banner ── */}
        <Pressable
          onPress={() => setClaimModalOpen(true)}
          style={({ pressed }) => [
            styles.haveCodeCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
              opacity: pressed ? 0.9 : 1,
            },
          ]}
        >
          <View
            style={[
              styles.haveCodeIconWrap,
              { backgroundColor: `${colors.primary}12` },
            ]}
          >
            <Ionicons name="gift-outline" size={20} color={colors.primary} />
          </View>
          <View style={styles.haveCodeContent}>
            <Text style={[styles.haveCodeTitle, { color: colors.text }]}>
              Have a friend&apos;s code?
            </Text>
            <Text style={[styles.haveCodeSubtitle, { color: colors.textSecondary }]}>
              Enter before your 1st scan to claim Silver Card
            </Text>
          </View>
          <View
            style={[
              styles.haveCodeArrowWrap,
              { backgroundColor: colors.surfaceLight },
            ]}
          >
            <Ionicons name="chevron-forward" size={15} color={colors.primary} />
          </View>
        </Pressable>

        {/* ── How to Refer Section (Simple, Brand-Consistent, Short Text, No Green Arrows) ── */}
        <View style={styles.sectionBlock}>
          <Text style={[styles.sectionHeading, { color: colors.text }]}>
            How it works
          </Text>

          <View
            style={[
              styles.stepsCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfaceBorder,
              },
            ]}
          >
            {/* Step 1 */}
            <View style={styles.stepItemRow}>
              <View
                style={[
                  styles.stepBadge,
                  {
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#F1F5F9",
                    borderColor: colors.surfaceBorder,
                  },
                ]}
              >
                <Text style={[styles.stepBadgeText, { color: colors.text }]}>1</Text>
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>
                  Share invite link
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                  Send your code or link to friends
                </Text>
              </View>
            </View>

            <View style={[styles.stepDivider, { backgroundColor: colors.surfaceBorder }]} />

            {/* Step 2 */}
            <View style={styles.stepItemRow}>
              <View
                style={[
                  styles.stepBadge,
                  {
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#F1F5F9",
                    borderColor: colors.surfaceBorder,
                  },
                ]}
              >
                <Text style={[styles.stepBadgeText, { color: colors.text }]}>2</Text>
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>
                  Friend scans QR
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                  Friend signs up and completes 1st scan
                </Text>
              </View>
            </View>

            <View style={[styles.stepDivider, { backgroundColor: colors.surfaceBorder }]} />

            {/* Step 3 */}
            <View style={styles.stepItemRow}>
              <View
                style={[
                  styles.stepBadge,
                  {
                    backgroundColor: isDark ? "rgba(255, 255, 255, 0.08)" : "#F1F5F9",
                    borderColor: colors.surfaceBorder,
                  },
                ]}
              >
                <Text style={[styles.stepBadgeText, { color: colors.text }]}>3</Text>
              </View>
              <View style={styles.stepTextWrap}>
                <Text style={[styles.stepTitle, { color: colors.text }]}>
                  Get rewards
                </Text>
                <Text style={[styles.stepDesc, { color: colors.textSecondary }]}>
                  You get Gold VIP, friend gets Silver
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* ── Fixed Bottom CTA Bar ("Invite Now" Button) ── */}
      <View
        style={[
          styles.bottomFixedBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.surfaceBorder,
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
          <Ionicons name="share-social-outline" size={18} color="#FFFFFF" />
          <Text style={styles.inviteNowBtnText}>Invite Now</Text>
        </Pressable>
      </View>

      {/* ── Claim Friend's Code Modal (Smooth Fade Animation, Professional Card) ── */}
      <Modal
        visible={claimModalOpen}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => {
          setClaimModalOpen(false);
          setReferralStatus(null);
        }}
      >
        <Pressable
          style={styles.modalBackdrop}
          onPress={() => {
            setClaimModalOpen(false);
            setReferralStatus(null);
          }}
        >
          <Pressable
            style={[
              styles.modalCard,
              {
                backgroundColor: colors.surface,
                borderColor: colors.surfaceBorder,
              },
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]}>
                Enter Invite Code
              </Text>
              <Pressable
                onPress={() => {
                  setClaimModalOpen(false);
                  setReferralStatus(null);
                }}
                hitSlop={12}
                style={[
                  styles.modalCloseBtn,
                  { backgroundColor: colors.surfaceLight },
                ]}
              >
                <Ionicons name="close" size={18} color={colors.text} />
              </Pressable>
            </View>

            {/* Guarded Case 1: Already Referred */}
            {refereeStatus === "already_referred" ? (
              <View style={styles.modalBlockedState}>
                <View style={[styles.modalStateIconWrap, { backgroundColor: "#10B98118" }]}>
                  <Ionicons name="checkmark-circle" size={36} color="#10B981" />
                </View>
                <Text style={[styles.modalStateTitle, { color: colors.text }]}>
                  Already referred!
                </Text>
                <Text style={[styles.modalStateDesc, { color: colors.textSecondary }]}>
                  A referral code has already been linked to your account.
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
                  Code claim window closed
                </Text>
                <Text style={[styles.modalStateDesc, { color: colors.textSecondary }]}>
                  Referral bonus codes must be entered before scanning your first QR code.
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
                  Enter a friend&apos;s 7-character invite code before your first scan to unlock your welcome reward.
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
                      backgroundColor: colors.inputBackground || colors.surfaceLight,
                      color: colors.text,
                      borderColor: colors.surfaceBorder,
                    },
                  ]}
                />

                {referralStatus && (
                  <View
                    style={[
                      styles.modalStatusBox,
                      {
                        backgroundColor: referralError
                          ? isDark
                            ? "rgba(239, 68, 68, 0.15)"
                            : "#FEF2F2"
                          : isDark
                          ? "rgba(16, 185, 129, 0.15)"
                          : "#ECFDF5",
                        borderColor: referralError
                          ? isDark
                            ? "rgba(239, 68, 68, 0.3)"
                            : "#FECACA"
                          : isDark
                          ? "rgba(16, 185, 129, 0.3)"
                          : "#A7F3D0",
                      },
                    ]}
                  >
                    <Ionicons
                      name={referralError ? "alert-circle" : "checkmark-circle"}
                      size={15}
                      color={referralError ? "#EF4444" : "#10B981"}
                    />
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
                        opacity:
                          !referralInput.trim() || applyingCode ? 0.45 : pressed ? 0.85 : 1,
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
          </Pressable>
        </Pressable>
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
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  topBarTitle: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 8,
  },
  carouselWrapper: {
    marginBottom: 16,
  },
  slideCardWrap: {
    paddingRight: 0,
  },
  heroSlide: {
    borderRadius: 22,
    padding: 20,
    minHeight: 160,
    justifyContent: "space-between",
    borderWidth: 1,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
  slideTopRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
  },
  dotsRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
  },
  dot: {
    height: 6,
    borderRadius: 3,
  },
  inactiveDot: {
    width: 6,
  },
  activeDot: {
    width: 20,
  },
  slideTagPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 100,
    borderWidth: 1,
  },
  slideTagText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  slideBodyWrap: {
    marginTop: 8,
  },
  slideTitleTop: {
    fontSize: 17,
    fontWeight: "700",
    lineHeight: 22,
  },
  slideTitleHighlight: {
    fontSize: 21,
    fontWeight: "800",
    lineHeight: 26,
  },
  slideSubtitle: {
    fontSize: 12.5,
    lineHeight: 17,
    marginTop: 4,
  },

  /* ── VIP Referral Code Card ── */
  vipCodeCard: {
    borderRadius: 20,
    borderWidth: 1,
    padding: 16,
    marginBottom: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  codeHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 10,
  },
  codeLabelWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
  },
  codeLabel: {
    fontSize: 11,
    fontWeight: "800",
    letterSpacing: 0.6,
  },
  codeActiveBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  codeActiveText: {
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
  codeBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 14,
    borderWidth: 1,
    marginBottom: 12,
  },
  codeText: {
    fontSize: 20,
    fontWeight: "800",
    letterSpacing: 2,
    fontFamily: "Inter_700Bold",
  },
  copyActionBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 10,
  },
  copyActionBtnText: {
    color: "#FFFFFF",
    fontSize: 12.5,
    fontWeight: "700",
  },
  linkBox: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  linkInfo: {
    flex: 1,
    marginRight: 10,
  },
  linkLabel: {
    fontSize: 10,
    fontWeight: "700",
    letterSpacing: 0.4,
    marginBottom: 2,
  },
  linkValue: {
    fontSize: 12.5,
    fontWeight: "600",
  },
  linkCopyIconBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  singleShareBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 7,
    paddingVertical: 11,
    borderRadius: 12,
    borderWidth: 1,
  },
  singleShareBtnText: {
    fontSize: 13,
    fontWeight: "700",
  },

  /* ── Have Code Card ── */
  haveCodeCard: {
    flexDirection: "row",
    alignItems: "center",
    padding: 14,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 18,
    gap: 12,
  },
  haveCodeIconWrap: {
    width: 38,
    height: 38,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  haveCodeContent: {
    flex: 1,
  },
  haveCodeTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  haveCodeSubtitle: {
    fontSize: 11.5,
    marginTop: 2,
  },
  haveCodeArrowWrap: {
    width: 28,
    height: 28,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },

  /* ── How It Works (Brand-Consistent, Simple Short Text, No Green Arrows) ── */
  sectionBlock: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: "800",
    marginBottom: 12,
    letterSpacing: -0.2,
  },
  stepsCard: {
    borderRadius: 20,
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 8,
    elevation: 2,
  },
  stepItemRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 14,
    paddingVertical: 8,
  },
  stepBadge: {
    width: 30,
    height: 30,
    borderRadius: 15,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  stepBadgeText: {
    fontSize: 13,
    fontWeight: "800",
  },
  stepTextWrap: {
    flex: 1,
  },
  stepTitle: {
    fontSize: 14,
    fontWeight: "700",
  },
  stepDesc: {
    fontSize: 12,
    marginTop: 2,
  },
  stepDivider: {
    height: 1,
    marginVertical: 4,
  },

  /* ── Bottom Fixed Bar ── */
  bottomFixedBar: {
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    paddingTop: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
  },
  inviteNowBtn: {
    height: 48,
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

  /* ── Modal (Clean Fade Backdrop & Centered Sheet) ── */
  modalBackdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
  },
  modalCard: {
    width: "100%",
    maxWidth: 400,
    borderRadius: 22,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 14,
  },
  modalTitle: {
    fontSize: 17,
    fontWeight: "800",
  },
  modalCloseBtn: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: "center",
    justifyContent: "center",
  },
  modalBlockedState: {
    alignItems: "center",
    paddingVertical: 14,
    paddingHorizontal: 8,
  },
  modalStateIconWrap: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 12,
  },
  modalStateTitle: {
    fontSize: 16,
    fontWeight: "800",
    textAlign: "center",
  },
  modalStateDesc: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 18,
    marginTop: 6,
    marginBottom: 18,
  },
  modalDismissBtn: {
    height: 46,
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
    marginTop: 2,
  },
  modalDesc: {
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 14,
  },
  modalInput: {
    height: 48,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    fontSize: 16,
    fontWeight: "700",
    letterSpacing: 1.5,
  },
  modalStatusBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    padding: 10,
    borderRadius: 10,
    borderWidth: 1,
    marginTop: 10,
  },
  modalStatusText: {
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  modalSubmitBtn: {
    height: 48,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 16,
  },
  modalSubmitBtnText: {
    color: "#FFFFFF",
    fontSize: 14.5,
    fontWeight: "700",
  },
  modalSecondaryBtn: {
    height: 42,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  modalSecondaryBtnText: {
    fontSize: 13.5,
    fontWeight: "700",
  },
});
