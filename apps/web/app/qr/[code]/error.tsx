"use client";

import styles from "./qr.module.css";

export default function QrError({
  reset
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <main className={styles.statePage} data-testid="qr-error-state">
      <div className={styles.stateCard}>
        <div className={`${styles.stateIcon} ${styles.stateIconError}`} aria-hidden="true">
          <span className={styles.stateIconLine} />
          <span className={styles.stateIconDot} />
        </div>
        <p className={styles.eyebrow}>PUBLIC QR CHECK</p>
        <h1 className={styles.stateTitle}>We could not check this link.</h1>
        <p className={styles.stateCopy}>
          The safety service did not respond. Try again in a moment; no destination was opened.
        </p>
        <button type="button" className={styles.primaryButton} onClick={reset}>
          Try again
        </button>
      </div>
      <p className={styles.stateFooter}>Your safety comes before speed.</p>
    </main>
  );
}