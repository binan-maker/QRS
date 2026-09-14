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
        <nav className={styles.headerNav} aria-label="Main navigation">
          <a href="#method">Our method</a>
          <Link href="/scanner" className={styles.headerLink}>Open scanner <Arrow size={15} /></Link>
        </nav>
      </header>

      <section className={`${styles.hero} page-enter delay-1`} aria-labelledby="home-title">
        <div className={styles.heroCopy}>
          <p className={styles.kicker}><span /> PUBLIC QR SAFETY CHECK</p>
          <h1 id="home-title">Pause.<br /><em>Then open.</em></h1>
          <p className={styles.heroIntro}>BinRo makes the invisible part of a QR code visible. Scan a code or inspect a destination before it asks anything of you.</p>
          <div className={styles.heroActions}>
            <Link href="/scanner" className={styles.primaryButton}><ScanMark size={19} /> Scan a QR code <Arrow size={17} /></Link>
            <span className={styles.actionNote}>No account. No guesswork.</span>
          </div>
        </div>
        <div className={styles.heroArtwork} aria-label="A graphic representation of a QR code being inspected">
          <div className={styles.artTopline}><span>BINRO / 01</span><span>PUBLIC VIEW</span></div>
          <div className={styles.qrPaper}>
            <div className={styles.qrGrid} aria-hidden="true">
              <i className={styles.finderOne} /><i className={styles.finderTwo} /><i className={styles.finderThree} />
              <b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b /><b />
            </div>
            <div className={styles.scanLine} />
            <span className={styles.artStamp}>LOOK<br />CLOSER</span>
          </div>
          <div className={styles.artCaption}><span>01</span><span>Every link has a destination.<br />Know yours.</span></div>
        </div>
      </section>

      <section className={styles.statement} id="method" aria-labelledby="statement-title">
        <div className={styles.statementIndex}>01 — WHY BINRO</div>
        <h2 id="statement-title">A QR code is a doorway.<br /><em>We show you the room.</em></h2>
        <p>Not every QR link is what it appears to be. BinRo gives you a clear look at the destination, the context around it, and the signals people have left behind.</p>
      </section>

      <section className={styles.methodGrid} aria-label="How BinRo works">
        <article className={styles.methodCard}>
          <span className={styles.cardNumber}>01</span>
          <ScanMark size={25} />
          <h3>Scan in the moment</h3>
          <p>Use the camera when a code is in front of you. BinRo finds the matching public check.</p>
        </article>
        <article className={`${styles.methodCard} ${styles.methodCardDark}`}>
          <span className={styles.cardNumber}>02</span>
          <span className={styles.cardRule} />
          <h3>See the destination</h3>
          <p>Read the full link, its type, and its available safety context before you continue.</p>
        </article>
        <article className={styles.methodCard}>
          <span className={styles.cardNumber}>03</span>
          <span className={styles.cardQuote}>“</span>
          <h3>Make your own call</h3>
          <p>BinRo never opens a link for you. The final decision stays with the person holding the phone.</p>
        </article>
      </section>

      <section className={styles.finalCta} aria-labelledby="final-title">
        <div>
          <p className={styles.kicker}><span /> START WITH THE LINK</p>
          <h2 id="final-title">What is<br /><em>behind it?</em></h2>
        </div>
        <Link href="/scanner" className={styles.circleButton} aria-label="Open QR scanner"><Arrow size={27} /></Link>
      </section>

      <footer className={styles.footer}>
        <span className={styles.footerBrand}>BinRo</span>
        <span>Check first. Open second.</span>
        <Link href="/scanner">Scanner <Arrow size={13} /></Link>
      </footer>
    </main>
  );
}