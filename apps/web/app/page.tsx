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
          <p className={styles.kicker}><span /> PUBLIC QR SAFETY CHECK / 01</p>
          <h1 id="home-title">Scan<br /><em>with intent.</em></h1>
          <p className={styles.heroIntro}>See where a QR code leads before you open it. BinRo gives you the destination, context, and public safety signals in one clear view.</p>
          <div className={styles.heroActions}>
            <Link href="/scanner" className={styles.primaryButton}><ScanMark size={19} /> Open scanner <Arrow size={17} /></Link>
            <span className={styles.actionNote}>No account required</span>
          </div>
        </div>
        <div className={styles.heroArtwork} aria-label="A graphic representation of a QR code being inspected">
          <div className={styles.artTopline}><span>BINRO / FIELD NOTE 001</span><span>PUBLIC VIEW</span></div>
          <div className={styles.qrPaper}>
            <div className={styles.qrGrid} aria-hidden="true">
              <i className={styles.finderOne} /><i className={styles.finderTwo} /><i className={styles.finderThree} />
              <b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b />
            </div>
            <div className={styles.scanLine} />
            <span className={styles.artStamp}>CHECK<br />FIRST</span>
          </div>
          <div className={styles.artCaption}><span>01 / 03</span><span>Every link has a destination.<br />Know yours.</span></div>
        </div>
      </section>

      <section className={styles.statement} id="method" aria-labelledby="statement-title">
        <div className={styles.statementIndex}>02 — THE IDEA</div>
        <h2 id="statement-title">A QR code is a doorway.<br /><em>Look before you enter.</em></h2>
        <p>BinRo is a read-only public check. Nothing signs you up, asks for your email, or opens a link without you choosing it.</p>
      </section>

      <section className={styles.methodGrid} aria-label="How BinRo works">
        <article className={styles.methodCard}>
          <span className={styles.cardNumber}>01</span>
          <ScanMark size={25} />
          <h3>Scan the code</h3>
          <p>Open the full-screen camera and hold the QR code inside the frame.</p>
        </article>
        <article className={`${styles.methodCard} ${styles.methodCardDark}`}>
          <span className={styles.cardNumber}>02</span>
          <span className={styles.cardRule} />
          <h3>Read the details</h3>
          <p>Inspect the destination, type, scan activity, and public trust signals.</p>
        </article>
        <article className={styles.methodCard}>
          <span className={styles.cardNumber}>03</span>
          <span className={styles.cardQuote}>“</span>
          <h3>Choose what happens</h3>
          <p>Continue only when it feels right. Community actions belong in the mobile app.</p>
        </article>
      </section>

      <section className={styles.finalCta} aria-labelledby="final-title">
        <div>
          <p className={styles.kicker}><span /> START WITH THE CAMERA</p>
          <h2 id="final-title">See what is<br /><em>behind it.</em></h2>
        </div>
        <Link href="/scanner" className={styles.circleButton} aria-label="Open QR scanner"><ScanMark size={29} /></Link>
      </section>

      <footer className={styles.footer}>
        <span className={styles.footerBrand}>BinRo</span>
        <span>Check first. Open second.</span>
        <Link href="/scanner">Open scanner <Arrow size={13} /></Link>
      </footer>
    </main>
  );
}