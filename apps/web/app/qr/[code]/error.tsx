"use client";

import Link from "next/link";
import { useTheme } from "@/lib/theme-context";
import { Ionicons } from "@/lib/mobile-icons";
import styles from "./qr.module.css";

export default function QrError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const { colors } = useTheme();

  return (
    <main className={styles.page} data-testid="qr-error-state">
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

        {/* ── Error Card (1:1 with mobile styles.errorCard) ── */}
        <div className={styles.scrollContent}>
          <div className={styles.errorCard}>
            <Ionicons name="alert-circle-outline" size={48} color={colors.danger} />
            <h2 className={styles.errorTitle}>QR Code Not Found</h2>
            <p className={styles.errorSub}>
              This QR code doesn&apos;t exist or couldn&apos;t be loaded.
            </p>
            <div style={{ display: "flex", gap: 10 }}>
              <button type="button" onClick={reset} className={styles.retryBtn}>
                Try Again
              </button>
              <Link href="/" className={styles.retryBtn} style={{ background: colors.surface, color: colors.text, border: `1px solid ${colors.surfaceBorder}` }}>
                Go Back
              </Link>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
