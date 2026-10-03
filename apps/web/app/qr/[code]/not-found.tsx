"use client";

import Link from "next/link";
import { useTheme } from "@/lib/theme-context";
import { Ionicons } from "@/lib/mobile-icons";
import styles from "./qr.module.css";

export default function QrNotFound() {
  const { colors } = useTheme();

  return (
    <main className={styles.page} data-testid="qr-not-found-state">
      <div className={styles.inner}>
        {/* ── Top Navigation Bar (1:1 with mobile) ── */}
        <header className={styles.navBar}>
          <div className={styles.navLeft}>
            <Link href="/" className={styles.navBackBtn} aria-label="Go back">
              <Ionicons name="chevron-back" size={24} color={colors.text} />
            </Link>
            <h1 className={styles.navTitle}>QR Details</h1>
          </div>
        </header>

        {/* ── Not Found Card (1:1 with mobile styles.errorCard) ── */}
        <div className={styles.scrollContent}>
          <div className={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
            <h2 className={styles.errorTitle}>QR Code Not Found</h2>
            <p className={styles.errorSub}>
              This QR code doesn&apos;t exist or couldn&apos;t be loaded.
            </p>
            <Link href="/" className={styles.retryBtn}>
              Go Back
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
