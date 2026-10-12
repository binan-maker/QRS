"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Ionicons } from "@/lib/mobile-icons";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import {
  getUserRewardWallet,
  getUserReferralsDashboard,
  getOrCreateUserReferralCode,
  applyReferralCodeForUser,
  buildReferralShareMessage,
  type RewardWallet,
  type UserReferralsDashboard,
} from "@services/rewards";
import styles from "./referrals.module.css";

interface HeroSlide {
  id: string;
  badgeTag: string;
  badgeIcon: "people-outline" | "shield-checkmark-outline";
  titleTop: string;
  titleHighlight: string;
  subtitle: string;
}

const HERO_SLIDES: HeroSlide[] = [
  {
    id: "invite-friends",
    badgeTag: "INVITE FRIENDS",
    badgeIcon: "people-outline",
    titleTop: "Share Safe Scanning",
    titleHighlight: "Protect Friends & Family",
    subtitle: "Help your network preview destination links, check UPI payments, and avoid scams.",
  },
  {
    id: "trusted-network",
    badgeTag: "TRUSTED NETWORK",
    badgeIcon: "shield-checkmark-outline",
    titleTop: "Build Community Trust",
    titleHighlight: "Verified QR Ecosystem",
    subtitle: "Every friend who joins and verifies scans strengthens our shared safety ratings.",
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
      referrals: [],
    };
  });

  const [activeSlide, setActiveSlide] = useState(0);
  const [claimModalOpen, setClaimModalOpen] = useState(false);
  const [referralInput, setReferralInput] = useState("");
  const [applyingCode, setApplyingCode] = useState(false);
  const [referralStatus, setReferralStatus] = useState<string | null>(null);
  const [referralError, setReferralError] = useState(false);

  const [codeCopied, setCodeCopied] = useState(false);
  const [linkCopied, setLinkCopied] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const toastTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const showToast = useCallback((msg: string) => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToastMessage(msg);
    toastTimeoutRef.current = setTimeout(() => setToastMessage(null), 2400);
  }, []);

  const loadData = useCallback(async () => {
    if (!user?.id) return;
    try {
      const [w, rd, userCode] = await Promise.all([
        getUserRewardWallet(user.id).catch(() => null),
        getUserReferralsDashboard(user.id).catch(() => null),
        getOrCreateUserReferralCode(user.id).catch(() => null),
      ]);
      if (w) setWallet(w);
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

  useEffect(() => {
    const timer = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % HERO_SLIDES.length);
    }, 5500);
    return () => clearInterval(timer);
  }, []);

  const inviteCode = (wallet?.ownReferralCode || refDashboard?.referralCode || "krzryn4").toLowerCase();
  const signupLink = `https://www.binro.in/register?ref=${inviteCode}`;
  const displaySignupLink = `binro.in/register?ref=${inviteCode}`;

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(inviteCode.toUpperCase());
      setCodeCopied(true);
      showToast("Referral code copied!");
      setTimeout(() => setCodeCopied(false), 2000);
    } catch {}
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(signupLink);
      setLinkCopied(true);
      showToast("Signup link copied!");
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {}
  };

  const handleNativeShare = async () => {
    const shareData = {
      title: "Join BinRo — Safe QR Scanner",
      text: buildReferralShareMessage(inviteCode),
      url: signupLink,
    };
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share(shareData);
        return;
      } catch {}
    }
    await handleCopyLink();
  };

  const handleApplyReferral = async (e: React.FormEvent) => {
    e.preventDefault();
    const code = referralInput.trim();
    if (!code) return;

    setApplyingCode(true);
    setReferralStatus(null);
    setReferralError(false);

    try {
      if (!user?.id) {
        setReferralError(false);
        setReferralStatus("Saved! Create an account to verify your referral.");
        return;
      }

      const res = await applyReferralCodeForUser(user.id, code);
      setReferralStatus(res.message);
      setReferralError(!res.ok);
      if (res.ok) {
        setReferralInput("");
        await loadData();
      }
    } catch {
      setReferralError(true);
      setReferralStatus("Could not verify referral code.");
    } finally {
      setApplyingCode(false);
    }
  };

  const refereeStatus = (() => {
    if (!wallet) return "eligible";
    if (wallet.referredByCode || wallet.referredByUserId) return "already_referred";
    const scanCount = (wallet.lifetimeEligibleScans || 0) + (wallet.dailyEligibleScans || 0);
    if (scanCount > 0) return "expired";
    return "eligible";
  })();

  return (
    <div className={styles.pageFrame}>
      {toastMessage && (
        <div className={styles.toastPill} role="status">
          <Ionicons name="checkmark-circle" size={17} color="#10B981" />
          <span>{toastMessage}</span>
        </div>
      )}

      <div className={styles.container}>
        <header className={styles.topBar}>
          <button
            type="button"
            onClick={() => router.back()}
            className={styles.circleBtn}
            aria-label="Back"
          >
            <Ionicons name="chevron-back" size={20} />
          </button>
          <h1 className={styles.pageTitle}>Invite Friends</h1>
          <button
            type="button"
            onClick={handleNativeShare}
            className={styles.circleBtn}
            aria-label="Share"
          >
            <Ionicons name="share-social-outline" size={19} />
          </button>
        </header>

        <div className={styles.contentLayout}>
          <div className={styles.mainCol}>
            {/* Hero Carousel */}
            <div className={styles.carouselContainer}>
              <div
                className={styles.carouselTrack}
                style={{ transform: `translateX(-${activeSlide * 100}%)` }}
              >
                {HERO_SLIDES.map((slide) => (
                  <div key={slide.id} className={styles.heroSlide}>
                    <div className={styles.slideTopRow}>
                      <span className={styles.slidePillTag}>
                        <Ionicons name={slide.badgeIcon} size={11} color="var(--primary)" />
                        <span>{slide.badgeTag}</span>
                      </span>
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

            {/* 3-Stat Summary Row */}
            <div className={styles.statsRow}>
              <div className={styles.statPill}>
                <div className={styles.statIconWrap}>
                  <Ionicons name="people-outline" size={18} color="var(--primary)" />
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statNumber}>{refDashboard?.totalInvited ?? 0}</span>
                  <span className={styles.statLabel}>Invited</span>
                </div>
              </div>

              <div className={styles.statPill}>
                <div className={styles.statIconWrap}>
                  <Ionicons name="shield-checkmark-outline" size={18} color="var(--primary)" />
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statNumber}>{refDashboard?.totalQualified ?? 0}</span>
                  <span className={styles.statLabel}>Verified</span>
                </div>
              </div>

              <div className={styles.statPill}>
                <div className={styles.statIconWrap}>
                  <Ionicons name="time-outline" size={18} color="var(--text-muted)" />
                </div>
                <div className={styles.statContent}>
                  <span className={styles.statNumber}>{refDashboard?.totalPending ?? 0}</span>
                  <span className={styles.statLabel}>Pending</span>
                </div>
              </div>
            </div>

            {/* Invitation Method Section */}
            <section className={styles.sectionBlock}>
              <h3 className={styles.sectionHeading}>Invitation Method</h3>
              <div className={styles.methodList}>
                <div className={styles.methodCard}>
                  <div className={styles.methodMeta}>
                    <span className={styles.methodLabel}>Referral code</span>
                    <span className={styles.methodValue}>{inviteCode.toUpperCase()}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyCode}
                    className={`${styles.copyCircleBtn} ${codeCopied ? styles.copyCircleBtnSuccess : ""}`}
                    aria-label="Copy code"
                  >
                    <Ionicons name={codeCopied ? "checkmark" : "copy-outline"} size={16} color="#ffffff" />
                  </button>
                </div>

                <div className={styles.methodCard}>
                  <div className={styles.methodMeta}>
                    <span className={styles.methodLabel}>Signup link</span>
                    <span className={styles.methodValueLink} title={signupLink}>{displaySignupLink}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`${styles.copyCircleBtn} ${linkCopied ? styles.copyCircleBtnSuccess : ""}`}
                    aria-label="Copy link"
                  >
                    <Ionicons name={linkCopied ? "checkmark" : "copy-outline"} size={16} color="#ffffff" />
                  </button>
                </div>
              </div>
            </section>
          </div>

          <div className={styles.sideCol}>
            {/* How to Refer */}
            <section className={styles.sectionBlock}>
              <h3 className={styles.sectionHeading}>How to Refer</h3>
              <div className={styles.stepsList}>
                <div className={styles.stepCard}>
                  <div className={styles.stepBadge}>1</div>
                  <div className={styles.stepContent}>
                    <h4 className={styles.stepTitle}>Share</h4>
                    <p className={styles.stepDesc}>Send your referral link or code to friends</p>
                  </div>
                </div>
                <div className={styles.stepCard}>
                  <div className={styles.stepBadge}>2</div>
                  <div className={styles.stepContent}>
                    <h4 className={styles.stepTitle}>Register</h4>
                    <p className={styles.stepDesc}>Friends sign up using your link or code</p>
                  </div>
                </div>
                <div className={styles.stepCard}>
                  <div className={styles.stepBadge}>3</div>
                  <div className={styles.stepContent}>
                    <h4 className={styles.stepTitle}>Connect</h4>
                    <p className={styles.stepDesc}>Both accounts are verified on first QR scan</p>
                  </div>
                </div>
              </div>
            </section>

            <div className={styles.ctaWrap}>
              <button type="button" onClick={handleNativeShare} className={styles.inviteNowBtn}>
                <span>Invite now</span>
                <Ionicons name="arrow-forward" size={17} color="#ffffff" />
              </button>
              <button type="button" onClick={() => setClaimModalOpen(true)} className={styles.haveCodeBtn}>
                Have a friend&apos;s referral code? Tap to enter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Claim Modal */}
      {claimModalOpen && (
        <div className={styles.modalOverlay} onClick={() => setClaimModalOpen(false)}>
          <div className={styles.modalSheet} onClick={(e) => e.stopPropagation()} role="dialog">
            <div className={styles.modalHeader}>
              <h3 className={styles.modalTitle}>Enter Referee Code</h3>
              <button
                type="button"
                onClick={() => setClaimModalOpen(false)}
                className={styles.modalCloseBtn}
                aria-label="Close"
              >
                <Ionicons name="close" size={20} />
              </button>
            </div>

            {refereeStatus === "already_referred" ? (
              <div className={styles.modalBlockedState}>
                <div className={`${styles.modalStateIconWrap} ${styles.modalStateIconSuccess}`}>
                  <Ionicons name="checkmark-circle" size={32} color="#10B981" />
                </div>
                <h4 className={styles.modalStateTitle}>Already linked</h4>
                <p className={styles.modalStateDesc}>A referral code is already linked to your account.</p>
                <button type="button" onClick={() => setClaimModalOpen(false)} className={styles.modalDismissBtn}>
                  Got it
                </button>
              </div>
            ) : refereeStatus === "expired" ? (
              <div className={styles.modalBlockedState}>
                <div className={`${styles.modalStateIconWrap} ${styles.modalStateIconWarning}`}>
                  <Ionicons name="alert-circle" size={32} color="#F59E0B" />
                </div>
                <h4 className={styles.modalStateTitle}>Code claim window closed</h4>
                <p className={styles.modalStateDesc}>
                  Referral codes must be entered before scanning your first QR code.
                </p>
                <button type="button" onClick={() => setClaimModalOpen(false)} className={styles.modalDismissBtn}>
                  Understood
                </button>
              </div>
            ) : (
              <>
                <p className={styles.modalDesc}>
                  Enter your friend&apos;s 7-character invite code before your first scan to link accounts.
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
                    spellCheck={false}
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

      <BottomTabBar activeTab="profile" />
    </div>
  );
}
