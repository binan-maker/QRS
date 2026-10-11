"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Ionicons } from "@/lib/mobile-icons";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { ScratchModal } from "@/components/rewards/ScratchModal";
import { BonusDetailModal } from "@/components/rewards/BonusDetailModal";
import { MerchantLogo } from "@/lib/rewards-image";
import {
  getUserRewardWallet,
  getUserScratchCards,
  scratchRewardCard,
  recordOfferRedemption,
  getApprovedRewardOffers,
  syncVCommissionOffersClient,
  DEFAULT_REWARD_OFFERS,
  type RewardOffer,
  type RewardWallet,
  type ScratchCardItem,
} from "@services/rewards";
import styles from "./rewards.module.css";

type FilterType = "all" | "unscratched" | "revealed" | "locked";

export const AHMED_TEST_EMAIL = "ahmedsameerbinan2@gmail.com";

// ── Exclusive Free Reward Card for ahmedsameerbinan2@gmail.com ───────────────
const AHMED_FREE_REWARD_CARD: ScratchCardItem = {
  id: "ahmed_exclusive_free_card",
  userId: AHMED_TEST_EMAIL,
  tier: "gold",
  sourceType: "milestone",
  sourceLabel: "Ahmed's Free Reward",
  status: "unlocked",
  offerId: "vc_tatacliq_ahmed_vip",
  offer: {
    id: "vc_tatacliq_ahmed_vip",
    networkProvider: "vcommission",
    campaignId: "10240",
    merchantName: "Tata CLiQ",
    merchantLogoUrl: "https://www.google.com/s2/favicons?domain=tatacliq.com&sz=128",
    title: "Flat ₹500 + Extra 15% OFF VIP Voucher",
    description:
      "Exclusive complimentary test reward for ahmedsameerbinan2@gmail.com. Free to scratch immediately with zero scan requirements.",
    couponCode: "AHMEDFREE500",
    destinationUrl: "https://tracking.vcommission.com/aff_c?offer_id=10240&aff_id=132680",
    tier: "gold",
    category: "Fashion & Lifestyle",
    termsText:
      "Exclusive test voucher for ahmedsameerbinan2@gmail.com. Valid on premium fashion, electronics & lifestyle at Tata CLiQ via vCommission.",
    isApproved: true,
    isActive: true,
    dailyAllocationLimit: 999,
    totalAllocated: 0,
    expiresAt: "2027-12-31T23:59:59Z",
  },
  unlockRequirementText: null,
  scratchedAt: null,
  redeemedAt: null,
  expiresAt: null,
  createdAt: new Date().toISOString(),
};

// ── Built-in Demo Scratch Card (Guaranteed Immediate Visibility) ─────────────
const DEMO_SCRATCH_CARD: ScratchCardItem = {
  id: "demo_card_binro_vip",
  userId: "demo_user",
  tier: "gold",
  sourceType: "milestone",
  sourceLabel: "Demo Reward",
  status: "unlocked",
  offerId: "demo_binro_vip",
  offer: {
    id: "demo_binro_vip",
    networkProvider: "vcommission",
    campaignId: "demo_binro_vip_01",
    merchantName: "BinRo Official",
    merchantLogoUrl: "/icon0.svg",
    title: "VIP Merch & Discount Voucher",
    description: "Interactive demo scratch voucher. Swipe to reveal your code and experience the celebration flow.",
    couponCode: "BINROVIP",
    destinationUrl: "https://www.binro.in",
    tier: "gold",
    category: "Community",
    termsText: "Valid for BinRo community members. Standard terms apply.",
    isApproved: true,
    isActive: true,
    dailyAllocationLimit: 999,
    totalAllocated: 0,
  },
  unlockRequirementText: null,
  scratchedAt: null,
  redeemedAt: null,
  expiresAt: null,
  createdAt: new Date().toISOString(),
};

export default function ScratchCardsPage() {
  const router = useRouter();
  const { user } = useAuth();

  const [wallet, setWallet] = useState<RewardWallet | null>(null);
  const [userCards, setUserCards] = useState<ScratchCardItem[]>([]);
  const [liveOffers, setLiveOffers] = useState<RewardOffer[]>([]);
  const [activeFilter, setActiveFilter] = useState<FilterType>("all");

  // Modals
  const [scratchModalCard, setScratchModalCard] = useState<ScratchCardItem | null>(null);
  const [isDemoModal, setIsDemoModal] = useState(false);
  const [detailModalCard, setDetailModalCard] = useState<ScratchCardItem | null>(null);

  // Exclusive Ahmed Free Reward Tester State
  const [isAhmedActive, setIsAhmedActive] = useState(false);

  useEffect(() => {
    const currentEmail = user?.email?.toLowerCase().trim();
    const storedTest =
      typeof window !== "undefined" &&
      localStorage.getItem("binro_test_as_ahmed") === "true";
    if (currentEmail === AHMED_TEST_EMAIL || storedTest) {
      setIsAhmedActive(true);
    }
  }, [user?.email]);

  const toggleAhmedMode = useCallback(() => {
    setIsAhmedActive((prev) => {
      const next = !prev;
      if (typeof window !== "undefined") {
        if (next) {
          localStorage.setItem("binro_test_as_ahmed", "true");
        } else {
          localStorage.removeItem("binro_test_as_ahmed");
        }
      }
      return next;
    });
  }, []);

  // Restore scratched state for Ahmed free card if already scratched locally
  useEffect(() => {
    if (typeof window !== "undefined") {
      const isScratched = localStorage.getItem("binro_ahmed_card_scratched") === "true";
      const isRedeemed = localStorage.getItem("binro_ahmed_card_redeemed") === "true";
      if (isRedeemed) {
        AHMED_FREE_REWARD_CARD.status = "redeemed";
        AHMED_FREE_REWARD_CARD.redeemedAt = new Date().toISOString();
      } else if (isScratched) {
        AHMED_FREE_REWARD_CARD.status = "scratched";
        AHMED_FREE_REWARD_CARD.scratchedAt = new Date().toISOString();
      }
    }
  }, []);

  // vCommission Automation Sync Modal
  const [showSyncModal, setShowSyncModal] = useState(false);
  const [syncApiKey, setSyncApiKey] = useState("");
  const [syncAffiliateId, setSyncAffiliateId] = useState("132680");
  const [syncPasteText, setSyncPasteText] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncResult, setSyncResult] = useState<string | null>(null);
  const [syncError, setSyncError] = useState<string | null>(null);

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }, [router]);

  // Load wallet, cards, and dynamic approved offers from vCommission / Supabase
  const loadData = useCallback(async () => {
    try {
      const [w, c, o] = await Promise.all([
        user?.id ? getUserRewardWallet(user.id).catch(() => null) : Promise.resolve(null),
        user?.id ? getUserScratchCards(user.id).catch(() => []) : Promise.resolve([]),
        getApprovedRewardOffers().catch(() => DEFAULT_REWARD_OFFERS),
      ]);
      if (w) setWallet(w);
      if (c) setUserCards(c);
      if (Array.isArray(o) && o.length > 0) {
        setLiveOffers(o);
      }
    } catch {}
  }, [user?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Handle Automated Sync with vCommission
  const handleRunSync = async () => {
    setIsSyncing(true);
    setSyncResult(null);
    setSyncError(null);
    try {
      const res = await syncVCommissionOffersClient({
        apiKey: syncApiKey.trim(),
        affiliateId: syncAffiliateId.trim() || "132680",
        rawText: syncPasteText.trim(),
      });
      if (res.success) {
        setSyncResult(
          `Success: Automated sync processed ${res.count} active coupons from vCommission!`
        );
        if (res.offers.length > 0) {
          setLiveOffers(res.offers);
        }
        await loadData();
      } else {
        setSyncError(res.message || "Failed to sync with vCommission. Check credentials.");
      }
    } catch (err: any) {
      setSyncError(err?.message || "Sync request failed");
    } finally {
      setIsSyncing(false);
    }
  };

  // Active Deck: Dynamically built from real offers without hardcoding
  const activeDeck = useMemo(() => {
    const baseCards: ScratchCardItem[] = [];
    if (isAhmedActive) {
      baseCards.push(AHMED_FREE_REWARD_CARD);
    }
    baseCards.push(DEMO_SCRATCH_CARD);

    if (userCards.length > 0) {
      const filtered = userCards.filter(
        (c) => c.id !== DEMO_SCRATCH_CARD.id && c.id !== AHMED_FREE_REWARD_CARD.id
      );
      return [...baseCards, ...filtered];
    }
    const offersPool = liveOffers.length > 0 ? liveOffers : DEFAULT_REWARD_OFFERS;
    const dynamicCards: ScratchCardItem[] = offersPool.map((offer, idx) => ({
      id: `dyn_card_${offer.id}_${idx}`,
      userId: user?.id || "preview_user",
      tier: offer.tier,
      sourceType: idx % 3 === 0 ? "milestone" : idx % 3 === 1 ? "referral_friend" : "welcome",
      sourceLabel: `${offer.merchantName} Reward`,
      status: idx <= 2 ? "unlocked" : idx === 3 || idx === 4 ? "scratched" : "unlocked",
      offerId: offer.id,
      offer,
      unlockRequirementText: null,
      scratchedAt: idx === 3 || idx === 4 ? new Date().toISOString() : null,
      redeemedAt: null,
      expiresAt: offer.expiresAt || null,
      createdAt: new Date().toISOString(),
    }));
    return [...baseCards, ...dynamicCards];
  }, [userCards, liveOffers, user?.id, isAhmedActive]);

  // Filtered Cards
  const filteredCards = useMemo(() => {
    if (activeFilter === "unscratched") {
      return activeDeck.filter((c) => c.status === "unlocked");
    }
    if (activeFilter === "revealed") {
      return activeDeck.filter((c) => c.status === "scratched" || c.status === "redeemed");
    }
    if (activeFilter === "locked") {
      return activeDeck.filter((c) => c.status === "locked");
    }
    return activeDeck;
  }, [activeDeck, activeFilter]);

  const unscratchedCount = activeDeck.filter((c) => c.status === "unlocked").length;
  const revealedCount = activeDeck.filter(
    (c) => c.status === "scratched" || c.status === "redeemed"
  ).length;
  const lockedCount = activeDeck.filter((c) => c.status === "locked").length;

  // Open scratch modal
  const handleOpenScratch = (card: ScratchCardItem) => {
    setIsDemoModal(card.id === DEMO_SCRATCH_CARD.id || card.id === AHMED_FREE_REWARD_CARD.id);
    setScratchModalCard(card);
  };

  // Open detail modal
  const handleOpenDetail = (card: ScratchCardItem) => {
    setDetailModalCard(card);
  };

  // Scratch completed
  const handleScratchComplete = useCallback(
    async (card: ScratchCardItem) => {
      if (card.id === AHMED_FREE_REWARD_CARD.id) {
        AHMED_FREE_REWARD_CARD.status = "scratched";
        AHMED_FREE_REWARD_CARD.scratchedAt = new Date().toISOString();
        if (typeof window !== "undefined") {
          localStorage.setItem("binro_ahmed_card_scratched", "true");
        }
        return;
      }
      if (card.id === DEMO_SCRATCH_CARD.id) {
        // Update local demo state
        DEMO_SCRATCH_CARD.status = "scratched";
        DEMO_SCRATCH_CARD.scratchedAt = new Date().toISOString();
        return;
      }
      if (user?.id) {
        await scratchRewardCard(user.id, card.id);
        await loadData();
      }
    },
    [user?.id, loadData]
  );

  // Claim or Redeem
  const handleRedeem = useCallback(
    async (card: ScratchCardItem) => {
      if (card.id === AHMED_FREE_REWARD_CARD.id) {
        AHMED_FREE_REWARD_CARD.status = "redeemed";
        AHMED_FREE_REWARD_CARD.redeemedAt = new Date().toISOString();
        if (typeof window !== "undefined") {
          localStorage.setItem("binro_ahmed_card_redeemed", "true");
        }
        if (card.offer.destinationUrl) {
          window.open(card.offer.destinationUrl, "_blank", "noopener,noreferrer");
        }
        return;
      }
      if (card.id === DEMO_SCRATCH_CARD.id) {
        DEMO_SCRATCH_CARD.status = "redeemed";
        DEMO_SCRATCH_CARD.redeemedAt = new Date().toISOString();
        return;
      }
      if (user?.id) {
        await recordOfferRedemption(user.id, card.id);
        await loadData();
      }
      if (card.offer.destinationUrl) {
        window.open(card.offer.destinationUrl, "_blank", "noopener,noreferrer");
      }
    },
    [user?.id, loadData]
  );

  // Milestone Progress
  const dailyScans = wallet?.dailyEligibleScans ?? 0;
  const nextTarget = wallet?.nextMilestoneTarget ?? 3;
  const progressPct = wallet?.dailyCapReached
    ? 100
    : Math.min(100, Math.round((dailyScans / Math.max(1, nextTarget)) * 100));

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
              <Ionicons name="chevron-back" size={20} color="currentColor" />
            </button>
            <div className={styles.headingBlock}>
              <h1 className={styles.pageTitle}>Scratch Cards</h1>
              <p className={styles.pageSubtitle}>
                Scan QR codes to earn daily milestone cards and exclusive partner vouchers
              </p>
            </div>
          </div>

          <div className={styles.topBarRight}>
            <button
              type="button"
              onClick={toggleAhmedMode}
              className={styles.syncActionBtn}
              style={{
                borderColor: isAhmedActive ? "#F59E0B" : undefined,
                color: isAhmedActive ? "#D97706" : undefined,
                background: isAhmedActive ? "rgba(245, 158, 11, 0.1)" : undefined,
              }}
              title="Toggle exclusive test reward for ahmedsameerbinan2@gmail.com"
            >
              <Ionicons name="gift-outline" size={16} color={isAhmedActive ? "#D97706" : "currentColor"} />
              <span>{isAhmedActive ? "Ahmed VIP Active" : "Test as Ahmed"}</span>
            </button>
            <button
              type="button"
              onClick={() => setShowSyncModal(true)}
              className={styles.syncActionBtn}
              title="Automate vCommission Deals Sync"
            >
              <Ionicons name="cloud-download-outline" size={16} />
              <span>Sync Deals</span>
            </button>
            <Link
              href="/referrals"
              className={styles.topActionBtn}
              aria-label="Refer & Earn"
            >
              <Ionicons name="people-outline" size={16} />
              <span>Refer &amp; Earn</span>
            </Link>
          </div>
        </header>

        {/* ── Exclusive Free Reward Banner for ahmedsameerbinan2@gmail.com ────── */}
        {isAhmedActive && (
          <div className={styles.ahmedBanner} role="region" aria-label="Exclusive free reward">
            <div className={styles.ahmedBannerLeft}>
              <div className={styles.ahmedBannerIcon}>
                <Ionicons name="sparkles" size={20} />
              </div>
              <div>
                <div className={styles.ahmedBannerTitle}>
                  Free VIP Scratch Card Active for {AHMED_TEST_EMAIL}
                </div>
                <div className={styles.ahmedBannerSub}>
                  Complimentary Tata CLiQ ₹500 test voucher ready below. Zero scan requirements.
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => handleOpenScratch(AHMED_FREE_REWARD_CARD)}
              className={styles.ahmedBannerAction}
            >
              Scratch Free Card
            </button>
          </div>
        )}

        {/* ── Prominent Featured Demo Scratch Card (Clearly Visible at Top) ─── */}
        <div
          className={styles.demoFeatureCard}
          onClick={() => handleOpenScratch(DEMO_SCRATCH_CARD)}
          role="button"
          tabIndex={0}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleOpenScratch(DEMO_SCRATCH_CARD);
            }
          }}
          aria-label="Try demo scratch card"
        >
          <div className={styles.demoFeatureLeft}>
            <span className={styles.demoPillTag}>
              <Ionicons name="sparkles" size={12} />
              <span>Interactive Demo Scratch Card</span>
            </span>
            <h2 className={styles.demoFeatureTitle}>
              {DEMO_SCRATCH_CARD.offer.title}
            </h2>
            <p className={styles.demoFeatureDesc}>
              {DEMO_SCRATCH_CARD.status === "unlocked"
                ? "Tap here to test the metallic foil scratching, real-time particle wipe, and celebratory voucher claim."
                : "Demo voucher scratched. Tap to view code or scratch again."}
            </p>
          </div>

          <button
            type="button"
            className={styles.demoFeatureBtn}
            onClick={(e) => {
              e.stopPropagation();
              handleOpenScratch(DEMO_SCRATCH_CARD);
            }}
          >
            <Ionicons name="sparkles" size={15} color="#003A99" />
            <span>
              {DEMO_SCRATCH_CARD.status === "unlocked"
                ? "Scratch Demo Card"
                : "View Demo Voucher"}
            </span>
          </button>
        </div>

        {/* ── Daily Milestone Progress Card ─────────────────────────────────── */}
        <section className={styles.progressCard} aria-labelledby="milestone-title">
          <div className={styles.progressHeader}>
            <div>
              <h3 id="milestone-title" className={styles.progressTitle}>
                Daily Scan Progress
              </h3>
              <p className={styles.progressSub}>
                {wallet?.dailyCapReached
                  ? "Daily card cap reached (3 of 3 unlocked today)"
                  : `${dailyScans} of ${nextTarget} eligible scans completed`}
              </p>
            </div>
            <span className={styles.progressBadge}>
              {wallet?.dailyCardsUnlocked || 0} / 3 Cards Unlocked
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
        </section>

        {/* ── Filter Segment Bar ────────────────────────────────────────────── */}
        <div className={styles.filterBar} role="group" aria-label="Filter scratch cards">
          <button
            type="button"
            onClick={() => setActiveFilter("all")}
            className={`${styles.filterBtn} ${activeFilter === "all" ? styles.filterBtnActive : ""}`}
            aria-pressed={activeFilter === "all"}
          >
            <span>All ({activeDeck.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("unscratched")}
            className={`${styles.filterBtn} ${
              activeFilter === "unscratched" ? styles.filterBtnActive : ""
            }`}
            aria-pressed={activeFilter === "unscratched"}
          >
            <Ionicons name="sparkles-outline" size={13} />
            <span>Unscratched ({unscratchedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("revealed")}
            className={`${styles.filterBtn} ${
              activeFilter === "revealed" ? styles.filterBtnActive : ""
            }`}
            aria-pressed={activeFilter === "revealed"}
          >
            <Ionicons name="checkmark-circle-outline" size={13} />
            <span>Revealed ({revealedCount})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveFilter("locked")}
            className={`${styles.filterBtn} ${
              activeFilter === "locked" ? styles.filterBtnActive : ""
            }`}
            aria-pressed={activeFilter === "locked"}
          >
            <Ionicons name="lock-closed-outline" size={13} />
            <span>Locked ({lockedCount})</span>
          </button>
        </div>

        {/* ── Mature & Professional Cards Grid ──────────────────────────────── */}
        <div className={styles.cardsGrid} role="list" aria-label="Scratch cards deck">
          {filteredCards.map((card) => {
            const isAhmedCard = card.id === AHMED_FREE_REWARD_CARD.id;
            const isDemo = card.id === DEMO_SCRATCH_CARD.id;
            const isUnscratched = card.status === "unlocked";
            const isRevealed = card.status === "scratched" || card.status === "redeemed";
            const isLocked = card.status === "locked";
            const offer = card.offer;

            return (
              <div
                key={card.id}
                role="listitem"
                className={`${styles.rewardCard} ${isAhmedCard ? styles.cardAhmedFree : ""}`}
                aria-label={`${offer.merchantName} - ${offer.title}`}
              >
                {/* Card Top: Merchant & Tier */}
                <div className={styles.rewardCardTop}>
                  <div className={styles.merchantLogoTagWrap}>
                    <div className={styles.cardMerchantLogoBadge}>
                      <MerchantLogo
                        merchantName={offer.merchantName}
                        directUrl={offer.merchantLogoUrl}
                        className={styles.cardMerchantLogoImg}
                        alt={offer.merchantName}
                        fallbackInitialClassName={styles.cardMerchantLogoInitial}
                      />
                    </div>
                    <span className={styles.merchantTag}>{offer.merchantName}</span>
                  </div>

                  <span
                    className={`${styles.tierPill} ${
                      isAhmedCard
                        ? styles.tierPillAhmed
                        : isDemo
                          ? styles.tierPillDemo
                          : card.tier === "gold"
                            ? styles.tierPillGold
                            : card.tier === "silver"
                              ? styles.tierPillSilver
                              : styles.tierPillBronze
                    }`}
                  >
                    {isAhmedCard
                      ? "Free VIP Reward"
                      : isDemo
                        ? "Demo Card"
                        : card.tier === "gold"
                          ? "Gold VIP"
                          : card.tier === "silver"
                            ? "Silver"
                            : "Bronze"}
                  </span>
                </div>

                {/* Card Body */}
                <div className={styles.rewardCardBody}>
                  <h4 className={styles.rewardCardTitle}>{offer.title}</h4>
                  <p className={styles.rewardCardDesc}>
                    {offer.description || `Special reward voucher from ${offer.merchantName}`}
                  </p>
                </div>

                {/* Card Footer: Status & Action Button */}
                <div className={styles.rewardCardFooter}>
                  <span className={styles.statusIndicator}>
                    {isUnscratched && (
                      <>
                        <Ionicons
                          name="sparkles"
                          size={12}
                          color={isAhmedCard ? "#F59E0B" : "var(--primary)"}
                        />
                        <span>{isAhmedCard ? "Free · Ready to scratch" : "Ready to scratch"}</span>
                      </>
                    )}
                    {isRevealed && (
                      <>
                        <Ionicons name="checkmark-circle" size={12} color="#10B981" />
                        <span>Voucher ready</span>
                      </>
                    )}
                    {isLocked && (
                      <>
                        <Ionicons name="lock-closed" size={12} color="var(--text-muted)" />
                        <span>Locked</span>
                      </>
                    )}
                  </span>

                  {/* Action */}
                  {isUnscratched && (
                    <button
                      type="button"
                      onClick={() => handleOpenScratch(card)}
                      className={`${styles.cardActionBtn} ${
                        isAhmedCard ? styles.ahmedBannerAction : styles.cardActionScratch
                      }`}
                    >
                      <Ionicons name="sparkles" size={13} color="#ffffff" />
                      <span>{isAhmedCard ? "Scratch Free" : "Scratch"}</span>
                    </button>
                  )}

                  {isRevealed && (
                    <button
                      type="button"
                      onClick={() => handleOpenDetail(card)}
                      className={`${styles.cardActionBtn} ${styles.cardActionRevealed}`}
                    >
                      <span>View Code</span>
                      <Ionicons name="chevron-forward" size={13} />
                    </button>
                  )}

                  {isLocked && (
                    <button
                      type="button"
                      onClick={() => router.push("/scanner")}
                      className={`${styles.cardActionBtn} ${styles.cardActionLocked}`}
                    >
                      <span>Scan to Unlock</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* ── Interactive Scratch Modal ─────────────────────────────────────── */}
      {scratchModalCard && (
        <ScratchModal
          card={scratchModalCard}
          isDemo={isDemoModal}
          onClose={() => setScratchModalCard(null)}
          onScratchComplete={handleScratchComplete}
          onClaim={handleRedeem}
        />
      )}

      {/* ── Voucher Detail Modal ──────────────────────────────────────────── */}
      {detailModalCard && (
        <BonusDetailModal
          card={detailModalCard}
          onClose={() => setDetailModalCard(null)}
          onRedeem={handleRedeem}
        />
      )}

      {/* ── Automated vCommission Deals Sync Modal ───────────────────────── */}
      {showSyncModal && (
        <div
          className={styles.syncModalOverlay}
          onClick={() => setShowSyncModal(false)}
        >
          <div
            className={styles.syncModalContent}
            onClick={(e) => e.stopPropagation()}
          >
            <div className={styles.syncModalHeader}>
              <div>
                <h3 className={styles.syncModalTitle}>
                  <Ionicons name="sparkles" size={18} color="#0056D2" />
                  <span>Automate vCommission Deals</span>
                </h3>
                <p className={styles.syncModalSubtitle}>
                  Instantly pull fresh coupons, merchant logos, and discounts into BinRo and Supabase without typing manually.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowSyncModal(false)}
                className={styles.syncCloseBtn}
                aria-label="Close"
              >
                <Ionicons name="close" size={18} />
              </button>
            </div>

            {syncResult && (
              <div className={`${styles.syncStatusAlert} ${styles.syncStatusSuccess}`}>
                <Ionicons name="checkmark-circle" size={18} />
                <span>{syncResult}</span>
              </div>
            )}

            {syncError && (
              <div className={`${styles.syncStatusAlert} ${styles.syncStatusError}`}>
                <Ionicons name="alert-circle" size={18} />
                <span>{syncError}</span>
              </div>
            )}

            <div className={styles.syncFieldGroup}>
              <label className={styles.syncLabel}>vCommission API Key</label>
              <input
                type="password"
                className={styles.syncInput}
                placeholder="Enter your API Key from Tools -> APIs"
                value={syncApiKey}
                onChange={(e) => setSyncApiKey(e.target.value)}
              />
              <span className={styles.syncHint}>
                Found in vCommission dashboard under Tools ➔ APIs. If empty, the server checks VCOMMISSION_API_KEY.
              </span>
            </div>

            <div className={styles.syncFieldGroup}>
              <label className={styles.syncLabel}>Affiliate ID (aff_id)</label>
              <input
                type="text"
                className={styles.syncInput}
                placeholder="132680"
                value={syncAffiliateId}
                onChange={(e) => setSyncAffiliateId(e.target.value)}
              />
            </div>

            <div className={styles.syncFieldGroup}>
              <label className={styles.syncLabel}>Or Quick-Paste Table / Feed</label>
              <textarea
                className={styles.syncTextarea}
                placeholder="Optional: Copy rows directly from vCommission Coupons page and paste here..."
                value={syncPasteText}
                onChange={(e) => setSyncPasteText(e.target.value)}
              />
              <span className={styles.syncHint}>
                Auto-parses codes (AMEXTCF1010, VC15), auto-attaches Tata CLiQ / Blabliblu brand logos and tracking links.
              </span>
            </div>

            <button
              type="button"
              className={styles.syncSubmitBtn}
              onClick={handleRunSync}
              disabled={isSyncing}
            >
              <Ionicons
                name={isSyncing ? "refresh" : "cloud-download-outline"}
                size={18}
              />
              <span>{isSyncing ? "Connecting to vCommission..." : "Run Automated Sync Now"}</span>
            </button>
          </div>
        </div>
      )}

      {/* Bottom Tab Bar */}
      <BottomTabBar activeTab="rewards" />
    </div>
  );
}
