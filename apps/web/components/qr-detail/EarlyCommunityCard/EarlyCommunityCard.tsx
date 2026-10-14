"use client";

import React from "react";
import { Ionicons } from "@/lib/mobile-icons";
import { useTheme } from "@/lib/theme-context";
import styles from "@/app/qr/[code]/qr.module.css";

interface EarlyCommunityCardProps {
  isLoggedIn: boolean;
  onRateCtaPress: () => void;
}

export function EarlyCommunityCard({
  isLoggedIn,
  onRateCtaPress,
}: EarlyCommunityCardProps) {
  const { colors } = useTheme();

  return (
    <section className={styles.earlyCommunityCard} aria-label="No community rating yet">
      <div className={styles.earlyHeader}>
        <div className={styles.earlyIconWrap}>
          <Ionicons name="people-outline" size={21} color={colors.primary} />
        </div>
        <div className={styles.earlyHeaderCopy}>
          <p className={styles.earlyEyebrow}>COMMUNITY CHECK</p>
          <h2 className={styles.earlyTitle}>No community rating yet</h2>
        </div>
      </div>

      <p className={styles.earlyBody}>
        This QR code has not received a community rating yet. That does not mean it is safe or unsafe — your experience can help the next person.
      </p>

      <button
        type="button"
        onClick={onRateCtaPress}
        className={styles.earlyActionBtn}
      >
        <Ionicons
          name={isLoggedIn ? "flag-outline" : "log-in-outline"}
          size={16}
          color={colors.primaryText}
        />
        <span>{isLoggedIn ? "Be the first to rate" : "Sign in to rate"}</span>
        {isLoggedIn && <Ionicons name="arrow-forward" size={15} color={colors.primaryText} />}
      </button>
    </section>
  );
}
