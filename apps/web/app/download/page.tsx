import Link from "next/link";
import styles from "./download.module.css";

function ArrowIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="6" y="3" width="12" height="18" rx="2.5" />
      <path d="M10 18h4" />
    </svg>
  );
}

export default function DownloadPage() {
  return (
    <main className={styles.page}>
      <section className={styles.card} aria-labelledby="download-title">
        <Link href="/" className={styles.backLink}>← Back</Link>
        <div className={styles.icon}><PhoneIcon /></div>
        <p className={styles.eyebrow}>BINRO MOBILE APP</p>
        <h1 id="download-title">Get more with BinRo</h1>
        <p className={styles.intro}>
          Download the BinRo app to sign in, keep your activity, vote on QR codes, and share community safety signals.
        </p>

        <a
          className={styles.storeButton}
          href="https://play.google.com/store/apps/details?id=com.qrguard.app"
          target="_blank"
          rel="noreferrer"
        >
          <span className={styles.playMark}>▶</span>
          <span><strong>Download on Google Play</strong><small>Available for Android</small></span>
          <ArrowIcon />
        </a>

        <div className={styles.comingSoon}>
          <span className={styles.appleMark}></span>
          <span><strong>iOS app</strong><small>Coming soon</small></span>
        </div>
        <p className={styles.note}>The web experience is for checking QR details before you open them.</p>
      </section>
    </main>
  );
}