"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Ionicons } from "@/lib/mobile-icons";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import {
  getUserRewardWallet,
  getUserReferralsDashboard,
  applyReferralCodeForUser,
  buildReferralShareMessage,
  type RewardWallet,
  type UserReferralsDashboard,
} from "@services/rewards";
import styles from "./referrals.module.css";

interface HeroSlide {
  id: string;
  badgeTag: string;
  titleTop: string;
  titleHighlight: string;
  subtitle: string;
  gradientBg: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "gold-vip",
    badgeTag: "REFERRER REWARD",
    titleTop: "Refer a Friend &",
    titleHighlight: "Earn Gold VIP Cards",
    subtitle: "Unlock Gold VIP Scratch Cards when friends complete their first scan.",
    gradientBg: "linear-gradient(135deg, #061120 0%, #003A99 60%, #1D4ED8 100%)",
  },
  {
    id: "silver-welcome",
    badgeTag: "FRIEND'S BENEFIT",
    titleTop: "Friends Get a",
    titleHighlight: "Silver Welcome Card",
    subtitle: "Friends get a Silver Welcome Scratch Card right after signing up.",
    gradientBg: "linear-gradient(135deg, #051428 0%, #0047AB 60%, #0284C7 100%)",
  },
];

export default function ReferralsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [wallet, setWallet] = useState<RewardWallet | null>(null);
  const [refDashboard, setRefDashboard] = useState<UserReferralsDashboard>(() => {
    let guestCode = "krzryn4";
    if (typeof window !== "undefined") {
      try {
        const cached =
          localStorage.getItem("binro_guest_ref_code") ||
          localStorage.getItem("binro_user_ref_code");
        if (cached) guestCode = cached;
      } catch {}
    }
    return {
      referralCode: guestCode,
      referralLink: `https://www.binro.in/register?ref=${guestCode}`,
      shortLink: `https://www.binro.in/register?ref=${guestCode}`,
      totalInvited: 0,
      totalQualified: 0,
      totalPending: 0,
      goldCardsEarned: 0,
      referrals: [],
    };
  });

  // Carousel interactive sliding state (touch + mouse hand-drag)
  const [activeSlide, setActiveSlide] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStartXRef = useRef<number | null>(null);
  const isMouseDownRef = useRef(false);

  // Claim referee modal
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [referralInput, setReferralInput] = useState("");
  const [applyingCode, setApplyingCode] = useState(false);
  const [referralStatus, setReferralStatus] = useState<string | null>(null);
  const [referralError, setReferralError] = useState(false);

  // Copy feedbacks & toast
  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => {
      setToastMessage(null);
    }, 2400);
  }, []);

  // Load wallet & referral data
  const loadData = useCallback(async () => {
    if (!user?.id) {
      let guestCode = "krzryn4";
      if (typeof window !== "undefined") {
        try {
          const cached = localStorage.getItem("binro_guest_ref_code");
          if (cached) guestCode = cached;
          else {
            guestCode = `binro${Math.random().toString(36).substring(2, 5)}`;
            localStorage.setItem("binro_guest_ref_code", guestCode);
          }
        } catch {}
      }
      setRefDashboard((prev) => ({
        ...prev,
        referralCode: guestCode,
        referralLink: `https://www.binro.in/register?ref=${guestCode}`,
        shortLink: `https://www.binro.in/register?ref=${guestCode}`,
      }));
      return;
    }

    try {
      const [w, rd] = await Promise.all([
        getUserRewardWallet(user.id).catch(() => null),
        getUserReferralsDashboard(user.id).catch(() => null),
      ]);
      if (w) setWallet(w);
      if (rd) setRefDashboard(rd);
    } catch {}
  }, [user?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Compute referee status
  // 1. already referred: wallet.referredByCode or wallet.referredByUserId is present
  // 2. expired: not referred, but user has scanned 1 or more QR codes
  // 3. eligible: user is logged in, no referral applied, scan count === 0
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

  // Auto-slide carousel every 5s unless hovered or dragging
  useEffect(() => {
    if (isPaused || isDragging) return;
    const interval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [isPaused, isDragging]);

  const inviteCode = (wallet?.ownReferralCode || refDashboard?.referralCode || "krzryn4").toLowerCase();
  const signupLink = `https://www.binro.in/register?ref=${inviteCode}`;
  const displaySignupLink = `binro.in/register?ref=${inviteCode}`;

  const handleCopyCode = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(inviteCode.toUpperCase()).catch(() => {});
      setCodeCopied(true);
      showToast("Referral code copied!");
      setTimeout(() => setCodeCopied(false), 2200);
    }
  }, [inviteCode, showToast]);

  const handleCopyLink = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(signupLink).catch(() => {});
      setLinkCopied(true);
      showToast("Signup link copied!");
      setTimeout(() => setLinkCopied(false), 2200);
    }
  }, [signupLink, showToast]);

  const handleNativeShare = useCallback(async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Join BinRo — VIP Invite",
          text: buildReferralShareMessage(inviteCode),
          url: signupLink,
        });
        return;
      } catch {}
    }
    await handleCopyLink();
  }, [inviteCode, signupLink, handleCopyLink]);

  const handleApplyReferral = useCallback(
    async (e: React.FormEvent) => {
      e.preventDefault();
      const code = referralInput.trim();
      if (!code) return;

      if (!user?.id) {
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("binro_pending_referral_code", code);
          } catch {}
        }
        setReferralError(false);
        setReferralStatus("Saved! Please sign in to link your code.");
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
          await loadData();
        }
      } catch {
        setReferralError(true);
        setReferralStatus("Could not verify referral code. Please check and try again.");
      } finally {
        setApplyingCode(false);
      }
    },
    [user?.id, referralInput, loadData]
  );

  // ── Hand Sliding / Swipe handling (Touch + Mouse for Desktop & Mobile) ──
  const handleTouchStart = (e: React.TouchEvent) => {
    dragStartXRef.current = e.touches[0].clientX;
    setIsDragging(true);
    setDragOffset(0);
    setIsPaused(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (dragStartXRef.current === null) return;
    const diff = e.touches[0].clientX - dragStartXRef.current;
    setDragOffset(diff);
  };

  const handleTouchEnd = () => {
    if (dragStartXRef.current !== null) {
      if (dragOffset < -40) {
        setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
      } else if (dragOffset > 40) {
        setActiveSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
      }
    }
    dragStartXRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
    setIsPaused(false);
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    isMouseDownRef.current = true;
    dragStartXRef.current = e.clientX;
    setIsDragging(true);
    setDragOffset(0);
    setIsPaused(true);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDownRef.current || dragStartXRef.current === null) return;
    const diff = e.clientX - dragStartXRef.current;
    setDragOffset(diff);
  };

  const handleMouseUp = () => {
    if (isMouseDownRef.current && dragStartXRef.current !== null) {
      if (dragOffset < -40) {
        setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
      } else if (dragOffset > 40) {
        setActiveSlide((prev) => (prev - 1 + HERO_SLIDES.length) % HERO_SLIDES.length);
      }
    }
    isMouseDownRef.current = false;
    dragStartXRef.current = null;
    setIsDragging(false);
    setDragOffset(0);
    setIsPaused(false);
  };

  const handleMouseLeave = () => {
    if (isMouseDownRef.current) {
      handleMouseUp();
    }
    setIsPaused(false);
  };

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/rewards");
    }
  };

  return (
    <div className={styles.pageFrame}>
      {/* Toast Notification */}
      {toastMessage && (
        <div className={styles.toastPill} role="status" aria-live="polite">
          <Ionicons name="checkmark-circle" size={17} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      <main className={styles.container}>
        {/* ── Top Bar ── */}
        <header className={styles.topBar}>
          <button
            type="button"
            onClick={handleBack}
            className={styles.circleBtn}
            aria-label="Back"
          >
            <Ionicons name="chevron-back" size={20} />
          </button>

          <h1 className={styles.pageTitle}>Refer &amp; earn</h1>

          <button
            type="button"
            onClick={handleNativeShare}
            className={styles.circleBtn}
            aria-label="Share invite"
            title="Share invite"
          >
            <Ionicons name="share-social-outline" size={19} />
          </button>
        </header>

        {/* ── Content Layout (Responsive 2-Col on Desktop, Single Col on Mobile) ── */}
        <div className={styles.contentLayout}>
          {/* Main Column */}
          <div className={styles.mainCol}>
            {/* ── Sliding 2-Card Hero Carousel (Hand sliding / mouse drag swinging + Clickable Dots) ── */}
            <div
              className={`${styles.carouselContainer} ${isDragging ? styles.carouselDragging : ""}`}
              onMouseEnter={() => setIsPaused(true)}
              onMouseLeave={handleMouseLeave}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              onMouseDown={handleMouseDown}
              onMouseMove={handleMouseMove}
              onMouseUp={handleMouseUp}
              role="region"
              aria-label="Promotional referral banners"
            >
              {/* Top-Left Dots Overlay (No black background, placed at top-left of the slide) */}
              <div className={styles.sliderControls}>
                <div className={styles.sliderDots} role="tablist" aria-label="Hero card slides">
                  {HERO_SLIDES.map((slide, idx) => (
                    <button
                      key={slide.id}
                      type="button"
                      role="tab"
                      aria-selected={activeSlide === idx}
                      aria-label={`Go to slide ${idx + 1}: ${slide.titleHighlight}`}
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveSlide(idx);
                      }}
                      className={`${styles.sliderDotBtn} ${activeSlide === idx ? styles.sliderDotBtnActive : ""}`}
                    >
                      <span className={styles.sliderDotIndicator} />
                    </button>
                  ))}
                </div>
              </div>

              <div
                className={styles.carouselTrack}
                style={{
                  transform: isDragging
                    ? `translateX(calc(-${activeSlide * 100}% + ${dragOffset}px))`
                    : `translateX(-${activeSlide * 100}%)`,
                  transition: isDragging ? "none" : "transform 0.42s cubic-bezier(0.25, 1, 0.5, 1)",
                }}
              >
                {HERO_SLIDES.map((slide) => (
                  <div
                    key={slide.id}
                    className={styles.heroSlide}
                    style={{ background: slide.gradientBg }}
                  >
                    <div className={styles.slideTopRow}>
                      <span className={styles.slidePillTag}>{slide.badgeTag}</span>
                    </div>
                    <div className={styles.heroTextCol}>
                      <h2 className={styles.heroTitle}>
                        {slide.titleTop}
                        <br />
                        <span className={styles.heroHighlight}>{slide.titleHighlight}</span>
                      </h2>
                      <p className={styles.heroSubtitle}>{slide.subtitle}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Clean 2-Stat Row (0 Invite friends, 0 Cards Earned) ── */}
            <div className={styles.statsRow}>
              <div className={styles.statPill}>
                <div className={styles.statIconWrap}>
                  <Ionicons name="people-outline" size={18} color="var(--primary)" />
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statNumber}>{refDashboard?.totalInvited ?? 0}</span>
                  <span className={styles.statLabel}>Invite friends</span>
                </div>
              </div>

              <div className={styles.statPill}>
                <div className={styles.statIconWrap}>
                  <Ionicons name="gift-outline" size={18} color="var(--primary)" />
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statNumber}>{refDashboard?.goldCardsEarned ?? 0}</span>
                  <span className={styles.statLabel}>Cards Earned</span>
                </div>
              </div>
            </div>

            {/* ── Invitation Method Section ── */}
            <section className={styles.sectionBlock}>
              <h3 className={styles.sectionHeading}>Invitation Method</h3>

              <div className={styles.methodList}>
                {/* Referral Code Row */}
                <div className={styles.methodCard}>
                  <div className={styles.methodMeta}>
                    <span className={styles.methodLabel}>Referral code</span>
                    <span className={styles.methodValue}>{inviteCode.toUpperCase()}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className={`${styles.copyCircleBtn} ${codeCopied ? styles.copyCircleBtnSuccess : ""}`}
                    aria-label="Copy referral code"
                    title="Copy code"
                  >
                    <Ionicons
                      name={codeCopied ? "checkmark" : "copy-outline"}
                      size={16}
                      color="#ffffff"
                    />
                  </button>
                </div>

                {/* Signup Link Row */}
                <div className={styles.methodCard}>
                  <div className={styles.methodMeta}>
                    <span className={styles.methodLabel}>Signup link</span>
                    <span className={styles.methodValueLink} title={signupLink}>
                      {displaySignupLink}
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`${styles.copyCircleBtn} ${linkCopied ? styles.copyCircleBtnSuccess : ""}`}
                    aria-label="Copy signup link"
                    title="Copy signup link"
                  >
                    <Ionicons
                      name={linkCopied ? "checkmark" : "copy-outline"}
                      size={16}
                      color="#ffffff"
                    />
                  </button>
                </div>
              </div>
            </section>
          </div>

          {/* Side Column */}
          <div className={styles.sideCol}>
            {/* ── How to Refer Section (Clean, Brand-Consistent Steps — No Green Color) ── */}
            <section className={styles.sectionBlock}>
              <h3 className={styles.sectionHeading}>How to Refer</h3>

              <div className={styles.stepsList}>
                {/* Step 1: Share */}
                <div className={styles.stepCard}>
                  <div className={styles.stepBadge}>1</div>
                  <div className={styles.stepContent}>
                    <h4 className={styles.stepTitle}>Share</h4>
                    <p className={styles.stepDesc}>Send your referral link or code to friends</p>
                  </div>
                </div>

                {/* Step 2: Register */}
                <div className={styles.stepCard}>
                  <div className={styles.stepBadge}>2</div>
                  <div className={styles.stepContent}>
                    <h4 className={styles.stepTitle}>Register</h4>
                    <p className={styles.stepDesc}>Friends sign up using your link or code</p>
                  </div>
                </div>

                {/* Step 3: Earn */}
                <div className={styles.stepCard}>
                  <div className={styles.stepBadge}>3</div>
                  <div className={styles.stepContent}>
                    <h4 className={styles.stepTitle}>Earn</h4>
                    <p className={styles.stepDesc}>Get Gold VIP Scratch Cards when they scan</p>
                  </div>
                </div>
              </div>
            </section>

            {/* ── CTA Action Wrap ── */}
            <div className={styles.ctaWrap}>
              <button
                type="button"
                onClick={handleNativeShare}
                className={styles.inviteNowBtn}
              >
                <span>Invite now</span>
                <Ionicons name="arrow-forward" size={17} color="#ffffff" />
              </button>

              <button
                type="button"
                onClick={() => setClaimModalOpen(true)}
                className={styles.haveCodeBtn}
              >
                Have a friend&apos;s referral code? Tap to enter
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* ── Claim Friend's Code Modal (Smart Guarded Rules) ── */}
      {claimModalOpen && (
        <div
          className={styles.modalOverlay}
          onClick={() => {
            setClaimModalOpen(false);
            setReferralStatus(null);
            setReferralError(false);
          }}
        >
          <div
            className={styles.modalSheet}
            onClick={(e) => e.stopPropagation()}
            role="dialog"
            aria-modal="true"
          >
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Enter referee code</h3>
              <button
                type="button"
                onClick={() => {
                  setClaimModalOpen(false);
                  setReferralStatus(null);
                  setReferralError(false);
                }}
                className={styles.modalCloseBtn}
                aria-label="Close"
              >
                <Ionicons name="close" size={20} />
              </button>
            </div>

            {/* Guarded Case 1: Already Referred */}
            {refereeStatus === "already_referred" ? (
              <div className={styles.modalBlockedState}>
                <div className={`${styles.modalStateIconWrap} ${styles.modalStateIconSuccess}`}>
                  <Ionicons name="checkmark-circle" size={32} color="#10B981" />
                </div>
                <h4 className={styles.modalStateTitle}>You are already referred!</h4>
                <p className={styles.modalStateDesc}>
                  A referral code has already been linked to your account. Enjoy your rewards!
                </p>
                <button
                  type="button"
                  onClick={() => setClaimModalOpen(false)}
                  className={styles.modalDismissBtn}
                >
                  Got it
                </button>
              </div>
            ) : refereeStatus === "expired" ? (
              /* Guarded Case 2: Not referred, but already scanned 1+ QR codes -> Expired */
              <div className={styles.modalBlockedState}>
                <div className={`${styles.modalStateIconWrap} ${styles.modalStateIconWarning}`}>
                  <Ionicons name="alert-circle" size={32} color="#F59E0B" />
                </div>
                <h4 className={styles.modalStateTitle}>You can&apos;t enter, code expired!</h4>
                <p className={styles.modalStateDesc}>
                  Referral bonus codes must be entered before scanning your first QR code. Because you have already scanned a QR code, the code claim window is closed.
                </p>
                <button
                  type="button"
                  onClick={() => setClaimModalOpen(false)}
                  className={styles.modalDismissBtn}
                >
                  Understood
                </button>
              </div>
            ) : (
              /* Eligible Case: Clean 7-character input */
              <>
                <p className={styles.modalDesc}>
                  Enter your friend&apos;s 7-character invite code before making your first scan to unlock your welcome reward.
                </p>

                <form onSubmit={handleApplyReferral} className={styles.modalForm}>
                  <input
                    type="text"
                    value={referralInput.toUpperCase()}
                    onChange={(e) => {
                      setReferralInput(e.target.value.replace(/[^a-zA-Z0-9]/g, "").slice(0, 7));
                      setReferralStatus(null);
                    }}
                    placeholder="e.g. KRZRYN4"
                    maxLength={7}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    spellCheck="false"
                    className={styles.modalInput}
                  />

                  {referralStatus && (
                    <div
                      className={`${styles.modalStatusMessage} ${
                        referralError ? styles.modalStatusError : styles.modalStatusSuccess
                      }`}
                    >
                      {referralStatus}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={!referralInput.trim() || applyingCode}
                    className={styles.modalSubmitBtn}
                  >
                    {applyingCode ? "Verifying..." : "Apply Code"}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Bottom Tab Bar (shown only on mobile) */}
      <BottomTabBar activeTab="rewards" />
    </div>
  );
}
