"use client";

import React, { useCallback, useState } from "react";
import { Ionicons } from "@/lib/mobile-icons";
import { MerchantSlideBanner } from "@/lib/rewards-image";
import type { ScratchCardItem } from "@services/rewards";
import styles from "./bonus-detail.module.css";

interface BonusDetailModalProps {
  card: ScratchCardItem;
  onClose: () => void;
  onRedeem?: (card: ScratchCardItem) => void;
}

export function BonusDetailModal({ card, onClose, onRedeem }: BonusDetailModalProps) {
  const [copied, setCopied] = useState(false);
  const offer = card.offer;
  const isExpired = card.status === "expired" || card.offer.isActive === false;

  const handleCopyAndRedeem = useCallback(async () => {
    if (offer.couponCode && typeof navigator !== "undefined" && navigator.clipboard) {
      await navigator.clipboard.writeText(offer.couponCode).catch(() => {});
      setCopied(true);
      setTimeout(() => setCopied(false), 2400);
    }
    if (onRedeem) {
      onRedeem(card);
    }
  }, [card, offer.couponCode, onRedeem]);

  // Format category icon
  const getCategoryIcon = () => {
    const cat = (offer.category || "").toLowerCase();
    if (cat.includes("food") || cat.includes("dining") || cat.includes("restaurant") || offer.title.toLowerCase().includes("delicious")) {
      return "restaurant-outline";
    }
    if (cat.includes("fashion") || cat.includes("apparel") || cat.includes("clothing")) {
      return "shirt-outline";
    }
    if (cat.includes("electronic") || cat.includes("gadget")) {
      return "headset-outline";
    }
    if (cat.includes("sport") || cat.includes("fitness")) {
      return "fitness-outline";
    }
    return "gift-outline";
  };

  // Format period text
  const getPeriodText = () => {
    if (isExpired) return "Period ended · Expired";
    return "from 05.09 - to 11.09";
  };

  // Format cashback/reward text
  const getCashbackText = () => {
    if (offer.title.toLowerCase().includes("cashback")) {
      return "3% credit · 2% own";
    }
    if (offer.title.includes("%")) {
      const match = offer.title.match(/\d+(\.\d+)?%/);
      if (match) return `${match[0]} instant savings`;
    }
    return "Special partner reward";
  };

  return (
    <div className={styles.sheetOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.sheetContent} onClick={(e) => e.stopPropagation()}>
        {/* Top Header with Back chevron */}
        <div className={styles.sheetHeader}>
          <button
            type="button"
            onClick={onClose}
            className={styles.backCircleBtn}
            aria-label="Back"
          >
            <Ionicons name="chevron-back" size={22} color="#ffffff" />
          </button>
          <span className={styles.headerSpacer} />
        </div>

        {/* Hero Artwork Box taking upper screen, clean rounded bottom, no trophy */}
        <div className={`${styles.heroArtwork} ${isExpired ? styles.heroArtworkExpired : ""}`}>
          <MerchantSlideBanner
            merchantName={offer.merchantName}
            bannerUrl={offer.bannerUrl}
            creativeUrls={offer.creativeUrls}
            campaignId={offer.campaignId}
            category={offer.category}
            className={styles.heroArtworkImg}
            alt={`${offer.merchantName} Artwork`}
          />
        </div>

        {/* Floating Title Bar (Matching Image 2 Right Phone) */}
        <div className={styles.floatingTitleBar}>
          <div className={styles.floatingIconBadge}>
            <Ionicons name={getCategoryIcon()} size={20} color="#ffffff" />
          </div>
          <h3 className={styles.floatingTitleText}>
            {offer.title || "Delicious cashback"}
          </h3>
        </div>

        {/* Meta Info Card: Period, Cashback, Received bonuses */}
        <div className={styles.metaCard}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Period</span>
            <span className={styles.metaValue}>{getPeriodText()}</span>
          </div>

          <div className={styles.metaDivider} />

          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Cashback</span>
            <span className={styles.metaValue}>{getCashbackText()}</span>
          </div>

          <div className={styles.metaDivider} />

          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Received bonuses</span>
            <div className={styles.bonusValueWrap}>
              {offer.couponCode ? (
                <button
                  type="button"
                  onClick={handleCopyAndRedeem}
                  className={styles.couponCopyPill}
                  title="Copy coupon code"
                >
                  <span>{offer.couponCode}</span>
                  <Ionicons name={copied ? "checkmark" : "copy-outline"} size={13} />
                </button>
              ) : (
                <span className={styles.bonusPointsTag}>
                  <span>20</span>
                  <Ionicons name="chevron-forward" size={14} color="#FBBF24" />
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Detailed Description Paragraphs (Matching Image 2 Right Phone text layout) */}
        <div className={styles.descBlock}>
          <p className={styles.descParagraph}>
            {offer.description ||
              `Delicious shopping, pleasant discounts and everything you need — always nearby at ${offer.merchantName}. And the profitable cashback with your BinRo partner card makes every trip even more enjoyable.`}
          </p>

          <p className={styles.descParagraph}>
            For qualifying purchases in the network of stores or online checkout at {offer.merchantName}, an additional cashback bonus is credited directly to your account.
          </p>

          <p className={styles.descParagraph}>
            The maximum cashback savings and promotional discount points apply per checkout during the active promotion period.
          </p>

          <p className={styles.descParagraph}>
            There is never too much cashback. It makes sense to take advantage of this profitable opportunity.
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleCopyAndRedeem}
          className={styles.actionBtn}
        >
          <Ionicons name={copied ? "checkmark-circle" : "open-outline"} size={18} />
          <span>
            {copied
              ? "Code Copied! Opening..."
              : offer.couponCode
                ? `Copy ${offer.couponCode} & Redeem`
                : "Redeem Offer"}
          </span>
        </button>
      </div>
    </div>
  );
}
