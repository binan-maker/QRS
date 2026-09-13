import Link from "next/link";
import styles from "./qr.module.css";

export default function QrNotFound() {
  return (
    <main className={styles.statePage} data-testid="qr-not-found-state">
      <div className={styles.stateCard}>
        <div className={`${styles.stateIcon} ${styles.stateIconNeutral}`} aria-hidden="true">
          <span className={styles.stateIconLine} />
          <span className={styles.stateIconDot} />
        </div>
        <p className={styles.eyebrow}>PUBLIC QR CHECK</p>
        <h1 className={styles.stateTitle}>This QR link is not available.</h1>
        <p className={styles.stateCopy}>
          It may have been removed, the code may be incomplete, or the link may no longer be public.
        </p>
        <Link href="https://play.google.com/store/apps/details?id=com.qrguard.app" className={styles.primaryButton}>
          Get the BinRo app
        </Link>
      </div>
      <p className={styles.stateFooter}>BinRo helps people make informed choices before opening shared links.</p>
    </main>
  );
}