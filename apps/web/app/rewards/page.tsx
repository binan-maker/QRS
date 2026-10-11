"use client";

import React, { useEffect, useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { Ionicons } from "@/lib/mobile-icons";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { ScratchModal } from "@/components/rewards/ScratchModal";
import { BonusDetailModal } from "@/components/rewards/BonusDetailModal";
import {
  getUserRewardWallet,
  getUserScratchCards,
  scratchRewardCard,
  recordOfferRedemption,
  getApprovedRewardOffers,
  syncVCommissionOffersClient,
  type RewardOffer,
  type RewardWallet,
  type ScratchCardItem,
} from "@services/rewards";
import styles from "./rewards.module.css";

// ── Baseline Cards corresponding directly to User Reference Image (Left Phone) ───
interface DisplayBonusCard {
  id: string;
  headline: string;
  merchantName: string;
  status: "unlocked" | "scratched" | "expired" | "locked";
  validityText: string;
  bannerUrl?: string | null;
  creativeUrls?: string[];
  badgeType: "lock" | "pink" | "citrus" | "wog" | "arena" | "scissors" | "visa" | "brand";
  isWide?: boolean;
  offer: RewardOffer;
}



export default function ScratchCardsPage() {
  const router = useRouter();
  const { user } = useAuth();

  // User state
  const [wallet, setWallet] = useState<RewardWallet | null>(null);
  const [liveOffers, setLiveOffers] = useState<RewardOffer[]>([]);
  const [scratchedCardIds, setScratchedCardIds] = useState<Set<string>>(new Set());

  // Active modals
  const [scratchModalCard, setScratchModalCard] = useState<ScratchCardItem | null>(null);
  const [detailModalCard, setDetailModalCard] = useState<ScratchCardItem | null>(null);

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }, [router]);

  // Load local scratched state
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const raw = localStorage.getItem("binro_scratched_cards_set");
        if (raw) {
          const arr = JSON.parse(raw);
          if (Array.isArray(arr)) {
            setScratchedCardIds(new Set(arr));
          }
        }
      } catch {}
    }
  }, []);

  // Background auto-sync and load
  const loadData = useCallback(async () => {
    try {
      const [w, o] = await Promise.all([
        user?.id ? getUserRewardWallet(user.id).catch(() => null) : Promise.resolve(null),
        getApprovedRewardOffers().catch(() => []),
      ]);
      if (w) setWallet(w);
      if (Array.isArray(o)) {
        setLiveOffers(o);
      }
    } catch {}

    // Silent background sync with vCommission without frontend prompts
    try {
      await syncVCommissionOffersClient({
        apiKey: "",
        affiliateId: "132680",
        rawText: "",
      }).catch(() => {});
    } catch {}
  }, [user?.id]);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  // Build deck from authentic vCommission partner offers loaded dynamically from Supabase
  const cardsDeck = useMemo((): DisplayBonusCard[] => {
    const offers = liveOffers;
    return offers.map((offer, index) => {
      const cardId = `card_${offer.id}`;
      const isAlreadyScratched = scratchedCardIds.has(cardId);
      const isExpired = offer.expiresAt
        ? new Date(offer.expiresAt).getTime() < Date.now()
        : false;

      let status: "unlocked" | "scratched" | "expired" = "scratched";
      if (isExpired) {
        status = "expired";
      } else if (isAlreadyScratched) {
        status = "scratched";
      } else if (index === 0) {
        status = "unlocked";
      }

      return {
        id: cardId,
        headline: offer.title,
        merchantName: offer.merchantName,
        status,
        validityText:
          status === "scratched"
            ? "Code ready · View"
            : status === "expired"
            ? "Not applicable"
            : "Valid for 7 days",
        bannerUrl: offer.bannerUrl,
        creativeUrls: offer.creativeUrls,
        badgeType: "brand",
        offer,
      };
    });
  }, [liveOffers, scratchedCardIds]);

  // Convert DisplayBonusCard to ScratchCardItem
  const toScratchCardItem = (card: DisplayBonusCard): ScratchCardItem => {
    return {
      id: card.id,
      userId: user?.id || "preview_user",
      tier: card.offer.tier || "gold",
      status: card.status,
      sourceType: "milestone",
      sourceLabel: card.merchantName,
      offerId: card.offer.id,
      offer: card.offer,
      unlockRequirementText: null,
      scratchedAt: card.status === "scratched" ? new Date().toISOString() : null,
      redeemedAt: null,
      expiresAt: card.offer.expiresAt || null,
      createdAt: new Date().toISOString(),
    };
  };

  // Card click handler
  const handleCardClick = (card: DisplayBonusCard) => {
    const item = toScratchCardItem(card);

    // If unscratched -> open interactive foil scratch experience
    if (card.status === "unlocked") {
      setScratchModalCard(item);
      return;
    }

    // If already scratched / revealed / expired / locked -> open right phone details directly
    setDetailModalCard(item);
  };

  // Handle completed scratch
  const handleScratchComplete = useCallback(
    async (item: ScratchCardItem) => {
      setScratchedCardIds((prev) => {
        const next = new Set(prev).add(item.id);
        if (typeof window !== "undefined") {
          try {
            localStorage.setItem("binro_scratched_cards_set", JSON.stringify(Array.from(next)));
          } catch {}
        }
        return next;
      });

      if (user?.id) {
        await scratchRewardCard(user.id, item.id).catch(() => {});
      }
    },
    [user?.id]
  );

  // Handle reward redeem
  const handleRedeem = useCallback(
    async (item: ScratchCardItem) => {
      if (user?.id) {
        await recordOfferRedemption(user.id, item.id).catch(() => {});
      }
      if (item.offer.destinationUrl) {
        window.open(item.offer.destinationUrl, "_blank", "noopener,noreferrer");
      }
    },
    [user?.id]
  );

  return (
    <div className={styles.pageFrame}>
      <main className={styles.container}>
        {/* ── Top Header (Exact Match for Image 1: Back chevron & Centered "My bonuses") ── */}
        <header className={styles.topBar}>
          <button
            type="button"
            onClick={handleBack}
            className={styles.backBtn}
            aria-label="Back"
            title="Back"
          >
            <Ionicons name="chevron-back" size={20} color="#ffffff" />
          </button>
          <h1 className={styles.pageTitle}>My bonuses</h1>
          <div className={styles.topBarSpacer} />
        </header>

        {/* ── 2-Column Responsive Scratch Cards Grid ─────────────────────────────── */}
        {cardsDeck.length > 0 ? (
          <div className={styles.cardsGrid} role="list" aria-label="My bonuses scratch cards">
          {cardsDeck.map((card) => {
            const isExpired = card.status === "expired";
            const isLocked = card.status === "locked";
            const isScratched = card.status === "scratched";
            const isUnscratched = card.status === "unlocked";
            const isWide = card.isWide;

            return (
              <div
                key={card.id}
                role="listitem"
                className={`${styles.bonusCard} ${isWide ? styles.bonusCardWide : ""} ${
                  isExpired ? styles.bonusCardExpired : ""
                }`}
                onClick={() => handleCardClick(card)}
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    handleCardClick(card);
                  }
                }}
                aria-label={`${card.headline} - ${card.validityText}`}
              >
                {/* Media Container: Unscratched shows mystery foil surface, Scratched/Expired shows banner */}
                <div className={styles.cardMediaWrap}>
                  {isUnscratched ? (
                    <div className={styles.cardFoilSurface}>
                      <div className={styles.cardFoilSheen} />
                      <div className={styles.cardFoilPrompt}>
                        <Ionicons name="sparkles" size={13} color="#FBBF24" />
                        <span>Scratch to Reveal</span>
                      </div>
                    </div>
                  ) : (
                    <img
                      src={card.bannerUrl || undefined}
                      alt={card.headline}
                      className={`${styles.cardMediaImg} ${
                        isExpired ? styles.cardMediaImgExpired : ""
                      }`}
                      loading="lazy"
                      referrerPolicy="no-referrer"
                    />
                  )}

                  {/* Overlapping Round Badge on bottom-left of image box */}
                  <div
                    className={`${styles.cardRoundBadge} ${
                      isExpired
                        ? styles.cardRoundBadgeExpired
                        : isLocked
                          ? styles.cardRoundBadgeLocked
                          : card.badgeType === "pink"
                            ? styles.cardRoundBadgePink
                            : ""
                    }`}
                  >
                    {isLocked ? (
                      <Ionicons name="lock-closed" size={15} color="#ffffff" />
                    ) : card.badgeType === "pink" ? (
                      <Ionicons name="restaurant-outline" size={15} color="#ffffff" />
                    ) : card.badgeType === "scissors" ? (
                      <Ionicons name="cut-outline" size={15} color={isExpired ? "#9CA3AF" : "#111827"} />
                    ) : card.badgeType === "arena" ? (
                      <span style={{ fontSize: "9px", fontWeight: 900, color: isExpired ? "#9CA3AF" : "#000" }}>
                        arena
                      </span>
                    ) : card.badgeType === "citrus" ? (
                      <span style={{ fontSize: "8.5px", fontWeight: 800, color: isExpired ? "#9CA3AF" : "#111" }}>
                        ЦИТРУС
                      </span>
                    ) : card.badgeType === "wog" ? (
                      <span style={{ fontSize: "11px", fontWeight: 900, color: isExpired ? "#6B7280" : "#166534" }}>
                        W
                      </span>
                    ) : card.badgeType === "visa" ? (
                      <span style={{ fontSize: "9.5px", fontWeight: 900, color: "#1E40AF" }}>VISA</span>
                    ) : (
                      <Ionicons name="gift-outline" size={15} color="#0052cc" />
                    )}
                  </div>
                </div>

                {/* Card Body with 1-line headline and capsule pill */}
                <div className={styles.cardBody}>
                  <h4 className={styles.cardHeadline}>{card.headline}</h4>

                  <span
                    className={`${styles.statusPill} ${
                      isExpired || isLocked
                        ? styles.statusPillExpired
                        : isScratched
                          ? styles.statusPillScratched
                          : styles.statusPillValid
                    }`}
                  >
                    {card.validityText}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
          <div style={{ textAlign: "center", padding: "64px 20px", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center" }}>
            <Ionicons name="gift-outline" size={44} color="#3b82f6" />
            <h3 style={{ color: "#ffffff", fontSize: "17px", fontWeight: 700, marginTop: "14px", marginBottom: "6px" }}>
              No Partner Bonuses Yet
            </h3>
            <p style={{ fontSize: "13px", color: "#94a3b8", maxWidth: "300px", lineHeight: 1.5, margin: 0 }}>
              Active partner coupons and scratch cards will appear here dynamically once loaded from Supabase &amp; vCommission.
            </p>
          </div>
        )}
      </main>

      {/* ── Interactive Scratch Foil Modal (When scratching unlocked card) ─────────── */}
      {scratchModalCard && (
        <ScratchModal
          card={scratchModalCard}
          onClose={() => setScratchModalCard(null)}
          onScratchComplete={handleScratchComplete}
          onClaim={handleRedeem}
          onOpenDetails={(card) => {
            setScratchModalCard(null);
            setDetailModalCard(card);
          }}
        />
      )}

      {/* ── Opened Card Details (Exact Match for Right Phone in Reference Image) ──── */}
      {detailModalCard && (
        <BonusDetailModal
          card={detailModalCard}
          onClose={() => setDetailModalCard(null)}
          onRedeem={handleRedeem}
        />
      )}

      {/* ── Persistent Bottom Navigation Bar ──────────────────────────────────────── */}
      <BottomTabBar />
    </div>
  );
}
