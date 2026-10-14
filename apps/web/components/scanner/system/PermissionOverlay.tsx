"use client";

// ─── Processing Overlay ───────────────────────────────────────────────────────
// 1:1 with features/scanner/components/system/ProcessingOverlay.tsx

import React from "react";
import { MaterialCommunityIcons } from "../../icons";
import styles from "../../scanner.module.css";

const GLOW = "#00D4FF";

export default function ProcessingOverlay() {
  return (
    <div className={styles.processingOverlay} role="status" aria-live="polite">
      <div className={styles.processingBox}>
        {/* Spinning ring + icon */}
        <div className={styles.processingIconContainer}>
          {/* Outer ambient glow */}
          <div className={styles.processingAmbientRing} />

          {/* Rotating dashed ring */}
          <div className={styles.processingSpinRing} />

          {/* Static inner ring */}
          <div className={styles.processingInnerRing}>
            <MaterialCommunityIcons name="qrcode-scan" size={30} color={GLOW} />
          </div>
        </div>

        <div className={styles.processingTextGroup}>
          <p className={styles.processingTitle}>Reading QR Code</p>
          <p className={styles.processingSubtitle}>Preparing the QR details…</p>
        </div>

        {/* Bottom branding */}
        <div className={styles.processingBrandRow}>
          <MaterialCommunityIcons name="qrcode" size={11} color="rgba(0,212,255,0.35)" />
          <span className={styles.processingBrandText}>BinRo Scanner</span>
        </div>
      </div>
    </div>
  );
}
