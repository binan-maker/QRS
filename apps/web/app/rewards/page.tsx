"use client";

import React, { useEffect, useState, useCallback, useMemo, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { Ionicons } from "@/lib/mobile-icons";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import {
  getUserRewardWallet,
  getUserScratchCards,
  scratchRewardCard,
  recordOfferRedemption,
  type RewardWallet,
  type ScratchCardItem,
} from "@services/rewards";
import styles from "./rewards.module.css";

type FilterType = "all" | "unscratched" | "revealed" | "locked";

// ── Interactive HTML5 Canvas Scratch Overlay Component ────────────────────────
interface InteractiveScratchProps {
  card: ScratchCardItem;
  onScratchComplete: (card: ScratchCardItem) => void;
}

function InteractiveScratchCard({ card, onScratchComplete }: InteractiveScratchProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const [isScratchedLocal, setIsScratchedLocal] = useState(card.status === "scratched" || card.status === "redeemed");
  const [scratchProgress, setScratchProgress] = useState(0);
  const isDrawingRef = useRef(false);
  const completedRef = useRef(card.status === "scratched" || card.status === "redeemed");

  const tier = card.tier;

  // Initialize Canvas with metallic foil gradient
  useEffect(() => {
    if (completedRef.current) return;
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const rect = container.getBoundingClientRect();
    const width = Math.floor(rect.width) || 320;
    const height = Math.floor(rect.height) || 200;

    canvas.width = width;
    canvas.height = height;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Rich metallic foil gradient based on card tier
    const gradient = ctx.createLinearGradient(0, 0, width, height);
    if (tier === "gold") {
      gradient.addColorStop(0, "#F59E0B");
      gradient.addColorStop(0.3, "#FDE68A");
      gradient.addColorStop(0.6, "#D97706");
      gradient.addColorStop(1, "#B45309");
    } else if (tier === "silver") {
      gradient.addColorStop(0, "#94A3B8");
      gradient.addColorStop(0.3, "#F1F5F9");
      gradient.addColorStop(0.6, "#64748B");
      gradient.addColorStop(1, "#475569");
    } else {
      gradient.addColorStop(0, "#2563EB");
      gradient.addColorStop(0.4, "#93C5FD");
      gradient.addColorStop(0.8, "#1D4ED8");
      gradient.addColorStop(1, "#1E40AF");
    }

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    // Subtle holographic sparkles
    ctx.fillStyle = "rgba(255, 255, 255, 0.4)";
    for (let i = 0; i < 40; i++) {
      const sx = (i * 37) % width;
      const sy = (i * 29) % height;
      const r = (i % 3) + 1;
      ctx.beginPath();
      ctx.arc(sx, sy, r, 0, Math.PI * 2);
      ctx.fill();
    }

    // Centered label & icon on foil
    ctx.fillStyle = tier === "gold" ? "#78350F" : "#FFFFFF";
    ctx.font = "bold 13px Inter, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.letterSpacing = "1px";
    ctx.fillText("✨ SCRATCH WITH FINGER OR MOUSE ✨", width / 2, height / 2 - 10);

    ctx.font = "11px Inter, sans-serif";
    ctx.fillStyle = tier === "gold" ? "#92400E" : "rgba(255, 255, 255, 0.85)";
    ctx.fillText("Scratch to reveal exclusive coupon", width / 2, height / 2 + 14);
  }, [tier]);

  const checkScratchPercentage = useCallback(() => {
    if (completedRef.current) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    try {
      const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const pixels = imgData.data;
      let transparentCount = 0;
      const totalPixels = pixels.length / 4;

      // Sample every 4th pixel for high performance
      for (let i = 3; i < pixels.length; i += 16) {
        if (pixels[i] === 0) {
          transparentCount += 4;
        }
      }

      const pct = Math.round((transparentCount / totalPixels) * 100);
      setScratchProgress(pct);

      if (pct >= 35 && !completedRef.current) {
        completedRef.current = true;
        setIsScratchedLocal(true);
        onScratchComplete(card);
      }
    } catch {}
  }, [card, onScratchComplete]);

  const scratchAtPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = clientX - rect.left;
    const y = clientY - rect.top;

    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();
  }, []);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (completedRef.current) return;
    isDrawingRef.current = true;
    scratchAtPoint(e.clientX, e.clientY);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawingRef.current || completedRef.current) return;
    scratchAtPoint(e.clientX, e.clientY);
  };

  const handlePointerUp = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    checkScratchPercentage();
  };

  const handleQuickReveal = () => {
    if (completedRef.current) return;
    completedRef.current = true;
    setIsScratchedLocal(true);
    onScratchComplete(card);
  };

  if (isScratchedLocal) {
    return null;
  }

  return (
    <div
      ref={containerRef}
      className={styles.scratchArea}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <div className={styles.scratchUnderlay}>
        <span className={styles.merchantName}>{card.offer.merchantName}</span>
        <h4 className={styles.offerTitle}>{card.offer.title}</h4>
        <p className={styles.offerDesc}>{card.offer.description}</p>
      </div>

      <canvas ref={canvasRef} className={styles.scratchCanvas} />

      <div className={styles.tapToScratchOverlay}>
        <span>{scratchProgress > 0 ? `${scratchProgress}% Cleared` : "Scratch Foil"}</span>
      </div>

      <button
        type="button"
        onClick={handleQuickReveal}
        className={styles.quickRevealBtn}
        aria-label="Tap to reveal instantly"
      >
        <Ionicons name="sparkles" size={14} color="var(--primary)" />
        <span>Tap to Reveal Instantly</span>
      </button>
    </div>
  );
}

// ── Main Scratch Cards Only Page ──────────────────────────────────────────────
export default function ScratchCardsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const { colors } = useTheme();

  const [wallet, setWallet] = useState<RewardWallet | null>(null);
  const [cards, setCards] = useState<ScratchCardItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }, [router]);

  const loadData = useCallback(async () => {
    if (!user?.id) {
      setWallet(null);
      setCards([]);
      setLoading(false);
      return;
    }
    try {
      const [w, c] = await Promise.all([
        getUserRewardWallet(user.id),
        getUserScratchCards(user.id),
      ]);
      setWallet(w);
      setCards(c);
    } catch {
      // Fallback
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  const handleScratchComplete = useCallback(
    async (card: ScratchCardItem) => {
      if (!user?.id) return;
      await scratchRewardCard(user.id, card.id);
      await loadData();
    },
    [user?.id, loadData]
  );

  const handleRedeem = useCallback(
    async (card: ScratchCardItem) => {
      if (!user?.id) return;
      if (card.offer.couponCode && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(card.offer.couponCode).catch(() => {});
        setCopiedId(card.id);
        setTimeout(() => setCopiedId(null), 2500);
      }
      await recordOfferRedemption(user.id, card.id);
      await loadData();
      window.location.href = card.offer.destinationUrl;
    },
    [user?.id, loadData]
  );

  const handleCopyCodeOnly = useCallback(
    async (card: ScratchCardItem) => {
      if (card.offer.couponCode && typeof navigator !== "undefined" && navigator.clipboard) {
        await navigator.clipboard.writeText(card.offer.couponCode).catch(() => {});
        setCopiedId(card.id);
        setTimeout(() => setCopiedId(null), 2200);
      }
    },
    []
  );

  // Milestone Progress calculations
  const dailyScans = wallet?.dailyEligibleScans ?? 0;
  const nextTarget = wallet?.nextMilestoneTarget ?? 3;
  const progressPct = wallet?.dailyCapReached
    ? 100
    : Math.min(100, Math.round((dailyScans / Math.max(1, nextTarget)) * 100));

  // Filtered Cards
  const filteredCards = useMemo(() => {
    if (activeFilter === "unscratched") {
      return cards.filter((c) => c.status === "unlocked");
    }
    if (activeFilter === "revealed") {
      return cards.filter((c) => c.status === "scratched" || c.status === "redeemed");
    }
    if (activeFilter === "locked") {
      return cards.filter((c) => c.status === "locked");
    }
    return cards;
  }, [cards, activeFilter]);

  const unscratchedCount = cards.filter((c) => c.status === "unlocked").length;
  const revealedCount = cards.filter((c) => c.status === "scratched" || c.status === "redeemed").length;
  const lockedCount = cards.filter((c) => c.status === "locked").length;

  return (
    <div className={styles.pageFrame}>
      <main className={styles.container}>
        {/* ── Top Navigation Bar ────────────────────────────────────────────── */}
        <header className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <button
              type="button"
              onClick={handleBack}
              className={styles.backBtn}
              aria-label="Back"
              title="Back"
            >
              <Ionicons name="chevron-back" size={22} color="currentColor" />
            </button>
            <div className={styles.headingBlock}>
              <h1 className={styles.pageTitle}>Scratch Cards</h1>
              <p className={styles.pageSubtitle}>
                Scan QR codes to reach milestones &amp; scratch to reveal vouchers
              </p>
            </div>
          </div>

          <div className={styles.topBarRight}>
            <Link
              href="/referrals"
              className={styles.topActionBtn}
              aria-label="Go to Refer & Earn"
            >
              <Ionicons name="people-outline" size={16} />
              <span>Refer &amp; Earn</span>
            </Link>
          </div>
        </header>

        {/* ── Not Signed In State ───────────────────────────────────────────── */}
        {!user ? (
          <div className={styles.guestCard}>
            <div className={styles.guestIconWrap}>
              <Ionicons name="gift-outline" size={32} color="var(--primary)" />
            </div>
            <h2 className={styles.guestTitle}>Sign in to view your scratch cards</h2>
            <p className={styles.guestDesc}>
              Earn Silver Welcome scratch cards, collect partner deals from boAt, AJIO &amp; Swiggy, and unlock daily scan milestones.
            </p>
            <Link href="/profile" className={styles.guestSignInBtn}>
              <Ionicons name="logo-google" size={16} />
              <span>Sign In with Google</span>
            </Link>
          </div>
        ) : (
          <>
            {/* ── Daily Milestone Progress Card ──────────────────────────────── */}
            <section className={styles.progressCard} aria-labelledby="milestone-title">
              <div className={styles.progressHeader}>
                <div>
                  <h2 id="milestone-title" className={styles.progressTitle}>
                    Today&apos;s Scan Progress
                  </h2>
                  <p className={styles.progressSub}>
                    {wallet?.dailyCapReached
                      ? "Daily reward cap reached (3 of 3 cards unlocked today)"
                      : `${dailyScans} of ${nextTarget} eligible scans for next scratch card`}
                  </p>
                </div>
                <span className={styles.progressBadge}>
                  {wallet?.dailyCardsUnlocked || 0} / 3 Cards Today
                </span>
              </div>

              <div
                className={styles.progressBarTrack}
                role="progressbar"
                aria-valuenow={progressPct}
                aria-valuemin={0}
                aria-valuemax={100}
              >
                <div
                  className={styles.progressBarFill}
                  style={{ width: `${progressPct}%` }}
                />
              </div>

              <div className={styles.progressMetaRow}>
                <span className={styles.progressMetaMilestones}>
                  Milestones: 3 scans · 8 scans · 15 scans
                </span>
                <span className={styles.progressMetaStatus}>
                  {wallet?.dailyCapReached
                    ? "Max Unlocked"
                    : wallet?.scansUntilNextCard
                      ? `${wallet.scansUntilNextCard} more to unlock`
                      : "Ready"}
                </span>
              </div>
            </section>

            {/* ── Promo Banner Linking to the Separate Referral Page ─────────── */}
            <Link
              href="/referrals"
              className={styles.referralBanner}
              aria-label="Open Refer and Earn to get Gold VIP Cards"
            >
              <div className={styles.referralBannerLeft}>
                <div className={styles.referralBannerIconWrap}>
                  <Ionicons name="sparkles" size={22} color="#FFFFFF" />
                </div>
                <div>
                  <h3 className={styles.referralBannerHeading}>
                    Want a Gold VIP Scratch Card?
                  </h3>
                  <p className={styles.referralBannerText}>
                    Invite a friend. When they complete 1 verified QR scan, you unlock a Gold VIP Card!
                  </p>
                </div>
              </div>
              <div className={styles.referralBannerCta}>
                <span>Refer &amp; Earn</span>
                <Ionicons name="arrow-forward" size={14} color="#FFFFFF" />
              </div>
            </Link>

            {/* ── Filter Controls ────────────────────────────────────────────── */}
            <div className={styles.filterBar} role="group" aria-label="Filter scratch cards">
              <button
                type="button"
                onClick={() => setActiveFilter("all")}
                className={`${styles.filterBtn} ${activeFilter === "all" ? styles.filterBtnActive : ""}`}
                aria-pressed={activeFilter === "all"}
              >
                <span>All Cards ({cards.length})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter("unscratched")}
                className={`${styles.filterBtn} ${activeFilter === "unscratched" ? styles.filterBtnActive : ""}`}
                aria-pressed={activeFilter === "unscratched"}
              >
                <Ionicons name="sparkles-outline" size={13} />
                <span>Unscratched ({unscratchedCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter("revealed")}
                className={`${styles.filterBtn} ${activeFilter === "revealed" ? styles.filterBtnActive : ""}`}
                aria-pressed={activeFilter === "revealed"}
              >
                <Ionicons name="checkmark-circle-outline" size={13} />
                <span>Revealed ({revealedCount})</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveFilter("locked")}
                className={`${styles.filterBtn} ${activeFilter === "locked" ? styles.filterBtnActive : ""}`}
                aria-pressed={activeFilter === "locked"}
              >
                <Ionicons name="lock-closed-outline" size={13} />
                <span>Locked ({lockedCount})</span>
              </button>
            </div>

            {/* ── Scratch Cards Deck ─────────────────────────────────────────── */}
            {cards.length === 0 ? (
              <div className={styles.emptyState}>
                <div className={styles.emptyIcon}>
                  <Ionicons name="gift-outline" size={44} />
                </div>
                <h3 className={styles.emptyTitle}>No scratch cards yet</h3>
                <p className={styles.emptyText}>
                  Scan your 1st verified QR code with the BinRo scanner or invite a friend to unlock your first scratch card!
                </p>
                <Link href="/scanner" className={styles.emptyScanBtn}>
                  <Ionicons name="scan" size={16} color="#FFFFFF" />
                  <span>Open Scanner</span>
                </Link>
              </div>
            ) : filteredCards.length === 0 ? (
              <div className={styles.emptyState}>
                <Ionicons name="funnel-outline" size={36} color="var(--text-muted)" />
                <h3 className={styles.emptyTitle}>No cards in this filter</h3>
                <p className={styles.emptyText}>
                  You don&apos;t have any {activeFilter} scratch cards right now.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveFilter("all")}
                  className={styles.emptyScanBtn}
                >
                  Show All Cards
                </button>
              </div>
            ) : (
              <div className={styles.cardsGrid}>
                {filteredCards.map((card) => {
                  const isLocked = card.status === "locked";
                  const isUnscratched = card.status === "unlocked";
                  const isRevealed = card.status === "scratched" || card.status === "redeemed";

                  const tierClass =
                    card.tier === "gold"
                      ? styles.cardBoxGold
                      : card.tier === "silver"
                        ? styles.cardBoxSilver
                        : styles.cardBoxBronze;

                  const badgeTierClass =
                    card.tier === "gold"
                      ? styles.tierBadgeGold
                      : card.tier === "silver"
                        ? styles.tierBadgeSilver
                        : styles.tierBadgeBronze;

                  return (
                    <article
                      key={card.id}
                      className={`${styles.cardBox} ${tierClass}`}
                      aria-label={`${card.tier} tier scratch card: ${card.offer.title}`}
                    >
                      {/* Card Header */}
                      <div className={styles.cardHeaderRow}>
                        <span className={`${styles.tierBadge} ${badgeTierClass}`}>
                          {card.tier === "gold" && <Ionicons name="trophy" size={11} />}
                          <span>{card.tier} Tier</span>
                        </span>
                        <span className={styles.sourceLabel}>{card.sourceLabel}</span>
                      </div>

                      {/* State 1: Locked */}
                      {isLocked && (
                        <div className={styles.lockedContent}>
                          <div className={styles.lockedIconRing}>
                            <Ionicons name="lock-closed" size={24} />
                          </div>
                          <span className={styles.lockedText}>
                            {card.unlockRequirementText || "Complete 1 scan to unlock"}
                          </span>
                          <Link href="/scanner" className={styles.lockedScanBtn}>
                            <Ionicons name="scan-outline" size={14} />
                            <span>Scan QR to Unlock</span>
                          </Link>
                        </div>
                      )}

                      {/* State 2: Unscratched Interactive Surface */}
                      {isUnscratched && (
                        <InteractiveScratchCard
                          card={card}
                          onScratchComplete={handleScratchComplete}
                        />
                      )}

                      {/* State 3: Scratched / Revealed Offer */}
                      {isRevealed && (
                        <div className={styles.revealedContent}>
                          <span className={styles.merchantName}>
                            {card.offer.merchantName}
                          </span>
                          <h3 className={styles.offerTitle}>{card.offer.title}</h3>
                          <p className={styles.offerDesc}>{card.offer.description}</p>

                          {card.offer.couponCode && (
                            <div className={styles.couponBox}>
                              <span className={styles.couponCodeText}>
                                {card.offer.couponCode}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleCopyCodeOnly(card)}
                                className={`${styles.copyBadge} ${
                                  copiedId === card.id ? styles.copyBadgeActive : ""
                                }`}
                                style={{
                                  background: "none",
                                  border: "none",
                                  cursor: "pointer",
                                  padding: 0,
                                }}
                              >
                                {copiedId === card.id ? "COPIED! ✓" : "COPY CODE"}
                              </button>
                            </div>
                          )}

                          <button
                            type="button"
                            onClick={() => handleRedeem(card)}
                            className={styles.redeemBtn}
                            aria-label={`Redeem coupon for ${card.offer.merchantName}`}
                          >
                            <Ionicons name="open-outline" size={16} />
                            <span>Copy Code &amp; Redeem Offer</span>
                          </button>
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </>
        )}
      </main>

      <BottomTabBar activeTab="rewards" />
    </div>
  );
}
