import styles from "./qr.module.css";

export default function Loading() {
  return (
    <main className={styles.page} data-testid="qr-loading-state" aria-busy="true">
      <div className={styles.headerShell}>
        <div className={styles.brandMark}>
          <span className={styles.brandGlyph} aria-hidden="true">B</span>
          <span>BinRo</span>
        </div>
        <div className={`${styles.skeleton} ${styles.loadingPill}`} />
      </div>
      <div className={styles.loadingWrap}>
        <div className={`${styles.skeleton} ${styles.loadingKicker}`} />
        <div className={`${styles.skeleton} ${styles.loadingTitle}`} />
        <div className={`${styles.skeleton} ${styles.loadingTitleShort}`} />
        <div className={styles.loadingGrid}>
          <div className={`${styles.skeleton} ${styles.loadingCard}`} />
          <div className={`${styles.skeleton} ${styles.loadingCard}`} />
        </div>
      </div>
    </main>
  );
}