import { useState, useEffect, useCallback, useMemo, useRef } from "react";
import {
  Share,
  Dimensions,
  NativeSyntheticEvent,
  NativeScrollEvent,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import * as Clipboard from "expo-clipboard";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "@/shared/utils/haptics";
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
import { HERO_SLIDES } from "../constants";
import { RefereeStatus, UseReferralsReturn } from "../types";

export function useReferrals(): UseReferralsReturn {
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
  const refereeStatus = useMemo((): RefereeStatus => {
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

  return {
    wallet,
    refDashboard,
    activeSlide,
    setActiveSlide,
    carouselScrollRef,
    slideWidth,
    claimModalOpen,
    setClaimModalOpen,
    referralInput,
    setReferralInput,
    applyingCode,
    referralStatus,
    referralError,
    codeCopied,
    linkCopied,
    toastMessage,
    refereeStatus,
    inviteCode,
    signupLink,
    displaySignupLink,
    user,
    handleScroll,
    handleBack,
    handleCopyCode,
    handleCopyLink,
    handleNativeShare,
    handleApplyReferral,
  };
}
