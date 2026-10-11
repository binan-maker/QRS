"use client";

import React, { useCallback, useState } from "react";
import { Ionicons } from "@/lib/mobile-icons";
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
  const tier = card.tier;

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

  return (
    <div className={styles.sheetOverlay} onClick={onClose} role="dialog" aria-modal="true">
      <div className={styles.sheetContent} onClick={(e) => e.stopPropagation()}>
        {/* Navigation Bar */}
        <div className={styles.sheetHeader}>
          <button
            type="button"
            onClick={onClose}
            className={styles.backCircleBtn}
            aria-label="Back"
          >
            <Ionicons name="chevron-back" size={20} />
          </button>
          <h3 className={styles.sheetTitle}>Voucher Details</h3>
          <div style={{ width: 38 }} />
        </div>

        {/* Hero Artwork */}
        <div
          className={`${styles.heroArtwork} ${
            tier === "gold"
              ? styles.heroArtworkGold
              : tier === "silver"
                ? styles.heroArtworkSilver
                : ""
          }`}
        >
          <span className={styles.artworkIcon}>
            <Ionicons
              name={
                tier === "gold"
                  ? "trophy-outline"
                  : offer.category === "Fashion"
                    ? "shirt-outline"
                    : offer.category === "Electronics"
                      ? "headset-outline"
                      : "ticket-outline"
              }
              size={52}
            />
          </span>

          <div className={styles.artworkPillRow}>
            <div className={styles.artworkBrandIcon}>
              <span>{offer.merchantName.charAt(0).toUpperCase()}</span>
            </div>
            <span className={styles.artworkPillLabel}>{offer.merchantName}</span>
          </div>
        </div>

        {/* Meta Grid Table */}
        <div className={styles.metaGrid}>
          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Validity</span>
            <span className={styles.metaValue}>Active · 7 Days</span>
          </div>

          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Reward Tier</span>
            <span className={`${styles.metaValue} ${styles.metaValueHighlight}`}>
              {tier === "gold" ? "Gold VIP" : tier === "silver" ? "Silver Tier" : "Bronze Tier"}
            </span>
          </div>

          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Voucher Code</span>
            <span className={styles.metaValue}>
              {offer.couponCode ? offer.couponCode : "Direct Partner Offer"}
            </span>
          </div>

          <div className={styles.metaRow}>
            <span className={styles.metaLabel}>Category</span>
            <span className={styles.metaValue}>{offer.category || "Lifestyle"}</span>
          </div>
        </div>

        {/* Description & Terms */}
        <div className={styles.descBlock}>
          <h4 className={styles.descHeading}>{offer.title}</h4>
          <p className={styles.descText}>
            {offer.description ||
              "Enjoy exclusive savings and partner bonuses verified with cryptographic authentication from BinRo."}
          </p>
          <p className={styles.termsText}>
            {offer.termsText ||
              "Redeemable on partner web & mobile checkout. Standard merchant terms and conditions apply."}
          </p>
        </div>

        {/* Action Button */}
        <button
          type="button"
          onClick={handleCopyAndRedeem}
          className={styles.actionBtn}
        >
          <Ionicons name={copied ? "checkmark" : "open-outline"} size={17} />
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
