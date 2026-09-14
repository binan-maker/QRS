import Link from "next/link";
import styles from "./scanner.module.css";

function ScanIcon() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 8V5h3M16 5h3v3M19 16v3h-3M8 19H5v-3" />
      <path d="M8 9h8v6H8zM11 11h2v2h-2zM16 18h3M18 15v3" />
    </svg>
  );
}

function HomeIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="m3.5 10.7 8.5-7 8.5 7" />
      <path d="M5.5 9.5v10h13v-10M9.5 19.5v-5h5v5" />
    </svg>
  );
}

function PersonIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <circle cx="12" cy="8" r="3.2" />
      <path d="M5.5 20c.6-3.2 2.9-5 6.5-5s5.9 1.8 6.5 5" />
    </svg>
  );
}

export default function ScannerPage() {
  return (
    <main className={styles.appFrame}>
      <div className={styles.page}>
        <header className={styles.header}>
          <div>
            <span className={styles.eyebrow}>SCANNER</span>
            <h1>Scan a QR code</h1>
          </div>
          <Link href="/" className={styles.backLink}>Home</Link>
        </header>

        <section className={styles.scannerCard} aria-labelledby="scanner-title">
          <div className={styles.scannerIcon}>
            <ScanIcon />
          </div>
          <h2 id="scanner-title">Camera scanner</h2>
          <p>QR scanning will be connected here in the next step. You can already explore the guest home and profile screens.</p>
          <Link href="/" className={styles.primaryButton}>Back to Home</Link>
        </section>

        <nav className={styles.bottomNav} aria-label="Primary navigation">
          <Link href="/" className={styles.navItem}>
            <HomeIcon />
            <span>Home</span>
          </Link>
          <Link href="/scanner" className={`${styles.navItem} ${styles.navItemActive}`}>
            <ScanIcon />
            <span>Scanner</span>
          </Link>
          <Link href="/profile" className={styles.navItem}>
            <PersonIcon />
            <span>Profile</span>
          </Link>
        </nav>
      </div>
    </main>
  );
}