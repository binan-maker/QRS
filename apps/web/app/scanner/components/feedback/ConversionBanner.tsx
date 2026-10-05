"use client";

// ─── Conversion Banner ────────────────────────────────────────────────────────
// 1:1 with features/scanner/components/feedback/ConversionBanner.tsx

import React from "react";
import { Ionicons } from "../../icons";
import styles from "../../scanner.module.css";

export function ConversionBanner({
  message,
  visible,
  bottomOffset,
  onSignIn,
  onDismiss,
}: {
  message:      string | null;
  visible:      boolean;
  bottomOffset: number;
  onSignIn:     () => void;
  onDismiss:    () => void;
}) {
  if (!visible || !message) return null;
  return (
    <div
      className={styles.conversionBanner}
      style={{ bottom: bottomOffset }}
    >
      <div className={styles.conversionBody}>
        <Ionicons name="person-circle-outline" size={22} color="#00d4ff" />
        <p className={styles.conversionText}>{message}</p>
      </div>
      <div className={styles.conversionActions}>
        <button
          type="button"
          onClick={onSignIn}
          className={styles.conversionSignInBtn}
        >
          Sign In
        </button>
        <button
          type="button"
          onClick={onDismiss}
          className={styles.conversionDismissBtn}
          aria-label="Dismiss"
        >
          <Ionicons name="close" size={16} color="rgba(255,255,255,0.4)" />
        </button>
      </div>
    </div>
  );
}
