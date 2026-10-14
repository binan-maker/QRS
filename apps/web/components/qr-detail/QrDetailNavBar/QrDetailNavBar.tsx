"use client";

import React from "react";
import { Ionicons } from "@/lib/mobile-icons";
import { useTheme } from "@/lib/theme-context";
import styles from "@/app/qr/[code]/qr.module.css";

interface QrDetailNavBarProps {
  onBack: () => void;
  onShare: () => void;
  onOpenOverflow: () => void;
}

export function QrDetailNavBar({
  onBack,
  onShare,
  onOpenOverflow,
}: QrDetailNavBarProps) {
  const { colors } = useTheme();

  return (
    <header className={styles.navBar}>
      <div className={styles.navLeft}>
        <button
          type="button"
          onClick={onBack}
          className={styles.navBackBtn}
          aria-label="Go back"
        >
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </button>
        <div className={styles.navTitleWrap}>
          <h1 className={styles.navTitle}>QR Details</h1>
        </div>
      </div>

      <div className={styles.navActions}>
        <button
          type="button"
          className={styles.navActionBtn}
          aria-label="Share QR details"
          onClick={onShare}
        >
          <Ionicons name="share-social-outline" size={20} color={colors.text} />
        </button>
        <button
          type="button"
          className={styles.navActionBtn}
          aria-label="More QR detail actions"
          onClick={onOpenOverflow}
        >
          <Ionicons name="ellipsis-vertical" size={20} color={colors.text} />
        </button>
      </div>
    </header>
  );
}
