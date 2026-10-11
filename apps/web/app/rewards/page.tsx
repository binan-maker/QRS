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
  DEFAULT_REWARD_OFFERS,
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
  bannerUrl: string;
  creativeUrls?: string[];
  badgeType: "lock" | "pink" | "citrus" | "wog" | "arena" | "scissors" | "visa" | "brand";
  isWide?: boolean;
  offer: RewardOffer;
}

const INITIAL_IMAGE_CARDS: DisplayBonusCard[] = [
  {
    id: "card_citrus_5",
    headline: "5% in Citrus",
    merchantName: "Citrus",
    status: "expired",
    validityText: "Not applicable",
    bannerUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80",
    badgeType: "citrus",
    offer: {
      id: "offer_citrus_5",
      networkProvider: "vcommission",
      campaignId: "citrus_01",
      merchantName: "Citrus",
      merchantLogoUrl: null,
      bannerUrl: "https://images.unsplash.com/photo-1517336714731-489689fd1ca8?auto=format&fit=crop&w=600&q=80",
      title: "5% in Citrus",
      description: "Exclusive consumer tech and electronics cash reward program across partner retail stores.",
      couponCode: "CITRUS5",
      destinationUrl: "https://vcommission.com",
      tier: "bronze",
      category: "Electronics",
      termsText: "Offer validity ended. Standard store terms apply.",
      isApproved: true,
      isActive: false,
      dailyAllocationLimit: 500,
      totalAllocated: 0,
    },
  },
  {
    id: "card_wog_5",
    headline: "5% in WOG",
    merchantName: "WOG",
    status: "expired",
    validityText: "Not applicable",
    bannerUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80",
    badgeType: "wog",
    offer: {
      id: "offer_wog_5",
      networkProvider: "vcommission",
      campaignId: "wog_01",
      merchantName: "WOG",
      merchantLogoUrl: null,
      bannerUrl: "https://images.unsplash.com/photo-1549399542-7e3f8b79c341?auto=format&fit=crop&w=600&q=80",
      title: "5% in WOG",
      description: "Fuel and convenience marketplace rewards with digital contactless redemption.",
      couponCode: "WOG5",
      destinationUrl: "https://vcommission.com",
      tier: "bronze",
      category: "Auto & Travel",
      termsText: "Promotion campaign has completed.",
      isApproved: true,
      isActive: false,
      dailyAllocationLimit: 500,
      totalAllocated: 0,
    },
  },
  {
    id: "card_dutyfree_50",
    headline: "50 Cash in Duty Fr...",
    merchantName: "Duty Free",
    status: "locked",
    validityText: "Not applicable",
    bannerUrl: "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=600&q=80",
    badgeType: "lock",
    offer: {
      id: "offer_dutyfree_50",
      networkProvider: "vcommission",
      campaignId: "dutyfree_01",
      merchantName: "Duty Free",
      merchantLogoUrl: null,
      bannerUrl: "https://images.unsplash.com/photo-1569154941061-e231b4725ef1?auto=format&fit=crop&w=600&q=80",
      title: "50 Cash in Duty Free",
      description: "Airport terminal travel retail cash bonus. Scan verified QR codes to unlock this card.",
      couponCode: "DUTY50",
      destinationUrl: "https://vcommission.com",
      tier: "silver",
      category: "Duty Free",
      termsText: "Locked bonus. Complete daily scan milestone to unlock.",
      isApproved: true,
      isActive: true,
      dailyAllocationLimit: 300,
      totalAllocated: 0,
    },
  },
  {
    id: "card_delicious_cashback",
    headline: "Delicious cashback",
    merchantName: "Sense Bank & ATB",
    status: "unlocked",
    validityText: "Valid for 3 days",
    bannerUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80",
    badgeType: "pink",
    offer: {
      id: "offer_delicious_cashback",
      networkProvider: "vcommission",
      campaignId: "delicious_01",
      merchantName: "Sense Bank & ATB",
      merchantLogoUrl: null,
      bannerUrl: "https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=600&q=80",
      title: "Delicious cashback",
      description: "Delicious shopping, pleasant discounts and everything you need — always nearby at ATB. And the profitable cashback with your partner card makes every trip even more enjoyable.",
      couponCode: "YUMMY20",
      destinationUrl: "https://vcommission.com",
      tier: "gold",
      category: "Food & Dining",
      termsText: "For purchases over 350 UAH in the network of stores or on the website, an additional 2% cashback is credited. The maximum cashback amount is 200 Cash'U bonus points per month during the promotion period.",
      isApproved: true,
      isActive: true,
      dailyAllocationLimit: 999,
      totalAllocated: 0,
    },
  },
  {
    id: "card_kachorovska_6",
    headline: "6% cashback at K...",
    merchantName: "Kachorovska",
    status: "unlocked",
    validityText: "Valid for 3 days",
    bannerUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80",
    badgeType: "scissors",
    offer: {
      id: "offer_kachorovska_6",
      networkProvider: "vcommission",
      campaignId: "kachorovska_01",
      merchantName: "Kachorovska",
      merchantLogoUrl: null,
      bannerUrl: "https://images.unsplash.com/photo-1543163521-1bf539c55dd2?auto=format&fit=crop&w=600&q=80",
      title: "6% cashback at Kachorovska",
      description: "Artisan footwear, handcrafted leather bags, and designer accessories cashback.",
      couponCode: "KACH6",
      destinationUrl: "https://vcommission.com",
      tier: "gold",
      category: "Fashion & Footwear",
      termsText: "Valid on all seasonal collections online and in boutique stores.",
      isApproved: true,
      isActive: true,
      dailyAllocationLimit: 400,
      totalAllocated: 0,
    },
  },
  {
    id: "card_arena_15",
    headline: "15% in Arena",
    merchantName: "Arena",
    status: "unlocked",
    validityText: "Valid for 2 days",
    bannerUrl: "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=600&q=80",
    badgeType: "arena",
    offer: {
      id: "offer_arena_15",
      networkProvider: "vcommission",
      campaignId: "arena_01",
      merchantName: "Arena",
      merchantLogoUrl: null,
      bannerUrl: "https://images.unsplash.com/photo-1530549387789-4c1017266635?auto=format&fit=crop&w=600&q=80",
      title: "15% in Arena",
      description: "Professional swimwear, goggles, training equipment, and athletic apparel discount.",
      couponCode: "ARENA15",
      destinationUrl: "https://vcommission.com",
      tier: "silver",
      category: "Sports & Swim",
      termsText: "Valid on purchases at Arena brand stores and digital checkout.",
      isApproved: true,
      isActive: true,
      dailyAllocationLimit: 500,
      totalAllocated: 0,
    },
  },
  {
    id: "card_tatacliq_125",
    headline: "12.5% in Tata CLiQ",
    merchantName: "Tata CLiQ",
    status: "scratched",
    validityText: "Valid for 5 days",
    bannerUrl: "https://media.hasoffers.com/brand/10240/banner.jpg",
    creativeUrls: [
      "https://media.hasoffers.com/brand/10240/banner.jpg",
      "https://media.hasoffers.com/network_images/vcommission/10240_banner.jpg",
      "https://tracking.vcommission.com/media/offer_10240.png",
    ],
    badgeType: "brand",
    offer: {
      id: "offer_tatacliq_125",
      networkProvider: "vcommission",
      campaignId: "10240",
      merchantName: "Tata CLiQ",
      merchantLogoUrl: "https://media.hasoffers.com/brand/10240/logo.png",
      bannerUrl: "https://media.hasoffers.com/brand/10240/banner.jpg",
      creativeUrls: [
        "https://media.hasoffers.com/brand/10240/banner.jpg",
        "https://media.hasoffers.com/network_images/vcommission/10240_banner.jpg",
        "https://tracking.vcommission.com/media/offer_10240.png",
      ],
      title: "12.5% Instant Discount on Tata CLiQ",
      description: "Instant cardholder savings on luxury fashion, footwear, watches, and electronics.",
      couponCode: "AMEXTCF1010",
      destinationUrl: "https://tracking.vcommission.com/aff_c?offer_id=10240&aff_id=132680",
      tier: "gold",
      category: "Fashion & Lifestyle",
      termsText: "Redeemable on partner checkout. Standard merchant terms apply.",
      isApproved: true,
      isActive: true,
      dailyAllocationLimit: 500,
      totalAllocated: 0,
    },
  },
  {
    id: "card_tenxyou_18",
    headline: "Flat 18% in Tenxyou",
    merchantName: "Tenxyou",
    status: "unlocked",
    validityText: "Valid for 7 days",
    bannerUrl: "https://media.hasoffers.com/brand/13667/banner.jpg",
    creativeUrls: [
      "https://media.hasoffers.com/brand/13667/banner.jpg",
      "https://media.hasoffers.com/network_images/vcommission/13667_banner.jpg",
    ],
    badgeType: "brand",
    offer: {
      id: "offer_tenxyou_18",
      networkProvider: "vcommission",
      campaignId: "13667",
      merchantName: "Tenxyou",
      merchantLogoUrl: "https://media.hasoffers.com/brand/13667/logo.png",
      bannerUrl: "https://media.hasoffers.com/brand/13667/banner.jpg",
      creativeUrls: [
        "https://media.hasoffers.com/brand/13667/banner.jpg",
        "https://media.hasoffers.com/network_images/vcommission/13667_banner.jpg",
      ],
      title: "Flat 18% OFF on Tenxyou",
      description: "Trending streetwear, graphic tees, and apparel collection partner deal.",
      couponCode: "VC18",
      destinationUrl: "https://tracking.vcommission.com/aff_c?offer_id=13667&aff_id=132680",
      tier: "gold",
      category: "Fashion",
      termsText: "Flat 18% off up to ₹600 on qualifying Tenxyou merchandise.",
      isApproved: true,
      isActive: true,
      dailyAllocationLimit: 250,
      totalAllocated: 0,
    },
  },
  {
    id: "card_visa_10x",
    headline: "10x Bonus on Visa",
    merchantName: "Sense Bank & Visa",
    status: "unlocked",
    validityText: "Valid for 14 days",
    isWide: true,
    bannerUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80",
    badgeType: "visa",
    offer: {
      id: "offer_visa_10x",
      networkProvider: "vcommission",
      campaignId: "visa_10x",
      merchantName: "Sense Bank & Visa",
      merchantLogoUrl: null,
      bannerUrl: "https://images.unsplash.com/photo-1556821840-3a63f95609a7?auto=format&fit=crop&w=800&q=80",
      title: "10x Bonus on Visa Cards",
      description: "Earn 10x reward multiplier on shopping, travel, and lifestyle purchases with Visa.",
      couponCode: "VISA10X",
      destinationUrl: "https://vcommission.com",
      tier: "gold",
      category: "Finance",
      termsText: "Applies to contactless Visa card purchases during promotion window.",
      isApproved: true,
      isActive: true,
      dailyAllocationLimit: 500,
      totalAllocated: 0,
    },
  },
];

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
        getApprovedRewardOffers().catch(() => DEFAULT_REWARD_OFFERS),
      ]);
      if (w) setWallet(w);
      if (Array.isArray(o) && o.length > 0) {
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

  // Build deck merging reference image cards and live offers
  const cardsDeck = useMemo(() => {
    return INITIAL_IMAGE_CARDS.map((c) => {
      const isAlreadyScratched = scratchedCardIds.has(c.id);
      return {
        ...c,
        status: isAlreadyScratched ? ("scratched" as const) : c.status,
        validityText: isAlreadyScratched ? "Code ready · View" : c.validityText,
      };
    });
  }, [scratchedCardIds]);

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

        {/* ── 2-Column Responsive Scratch Cards Grid (Matching Left Phone) ────────────── */}
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
                      src={card.bannerUrl}
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
