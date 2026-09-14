import Link from "next/link";
import styles from "./home.module.css";

function Arrow({ size = 18 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

function ScanMark({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M5 8V5h3M16 5h3v3M19 16v3h-3M8 19H5v-3" />
      <path d="M8.5 9.5h7v5h-7zM11 11h2v2h-2z" />
    </svg>
  );
}

export default function HomePage() {
  return (
    <main className={styles.page}>
      <header className={`${styles.header} page-enter`}>
        <Link href="/" className={styles.brand} aria-label="BinRo home">
          <span className={styles.brandGlyph}>B</span>
          <span>BinRo</span>
        </Link>
        <span className={styles.headerStatus}><span /> PUBLIC QR SAFETY</span>
      </header>

      <section className={`${styles.hero} page-enter delay-1`} aria-labelledby="home-title">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}><span /> BEFORE YOU OPEN</p>
          <h1 id="home-title">Scan<br /><em>with intent.</em></h1>
          <p className={styles.heroIntro}>See where a QR code leads before you open it. A quiet, read-only check for the moment before a tap.</p>
          <div className={styles.heroActions}>
            <Link href="/scanner" className={styles.primaryButton}>
              <ScanMark size={18} /> Open scanner <Arrow size={16} />
            </Link>
            <span className={styles.actionNote}>No account required</span>
          </div>
        </div>

        <div className={styles.heroArtwork} aria-label="Illustration of a QR code being inspected">
          <div className={styles.artTopline}><span>BINRO / FIELD NOTE 001</span><span>PUBLIC VIEW</span></div>
          <div className={styles.qrPaper}>
            <div className={styles.qrGrid} aria-hidden="true">
              <i className={styles.finderOne} /><i className={styles.finderTwo} /><i className={styles.finderThree} />
              <b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b />
            </div>
            <div className={styles.scanLine} />
            <span className={styles.artStamp}>CHECK<br />FIRST</span>
          </div>
          <div className={styles.artCaption}><span>01 / 01</span><span>Every link has a destination.<br />Know yours.</span></div>
        </div>
      </section>

      <section className={`${styles.quietLine} page-enter delay-2`} aria-label="BinRo approach">
        <p><strong>Read first. Decide second.</strong>BinRo shows the public details without sending you anywhere automatically.</p>
        <span>CAMERA ACCESS STAYS IN YOUR BROWSER</span>
      </section>

      <footer className={styles.footer}>
        <span className={styles.footerBrand}>BinRo</span>
        <span>Check first. Open second.</span>
        <Link href="/scanner">Open scanner <Arrow size={13} /></Link>
      </footer>
    </main>
  );
}