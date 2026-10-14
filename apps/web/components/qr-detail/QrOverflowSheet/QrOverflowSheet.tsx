"use client";

import React from "react";
import { Ionicons } from "@/lib/mobile-icons";
import { useTheme } from "@/lib/theme-context";
import styles from "@/app/qr/[code]/qr.module.css";

interface QrOverflowSheetProps {
  isOpen: boolean;
  onClose: () => void;
  onShare: () => void;
  onReport: () => void;
}

export function QrOverflowSheet({
  isOpen,
  onClose,
  onShare,
  onReport,
}: QrOverflowSheetProps) {
  const { colors } = useTheme();

  if (!isOpen) return null;

  return (
    <div
      className={styles.sheetBackdrop}
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <section
        className={styles.bottomSheet}
        role="dialog"
        aria-modal="true"
        aria-label="More QR detail actions"
      >
        <div className={styles.sheetHandle} />

        <button
          type="button"
          className={styles.sheetItem}
          onClick={() => {
            onClose();
            onShare();
          }}
        >
          <span className={styles.sheetIconPrimary}>
            <Ionicons name="share-outline" size={20} color={colors.primary} />
          </span>
          <span className={styles.sheetItemCopy}>
            <strong>Share QR Details</strong>
            <small>Send a link to this QR page</small>
          </span>
        </button>

        <button
          type="button"
          className={styles.sheetItem}
          onClick={() => {
            onClose();
            onReport();
          }}
        >
          <span className={styles.sheetIconDanger}>
            <Ionicons name="flag-outline" size={20} color={colors.danger} />
          </span>
          <span className={styles.sheetItemCopy}>
            <strong className={styles.dangerText}>Report QR</strong>
            <small>Flag this QR as suspicious or harmful</small>
          </span>
        </button>
      </section>
    </div>
  );
}
