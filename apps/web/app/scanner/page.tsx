import Link from "next/link";
import ScannerView from "./ScannerView";
import styles from "./scanner.module.css";

export default function ScannerPage() {
  return (
    <main className={styles.page}>
      <header className={`${styles.header} page-enter`}>
        <Link href="/" className={styles.brand} aria-label="Back to BinRo home"><span>BinRo</span></Link>
        <span className={styles.headerMeta}>LIVE CAMERA / PUBLIC CHECK</span>
      </header>
      <div className={styles.scannerLayout}>
        <div className={styles.intro}>
          <p className={styles.kicker}><span /> SCANNER</p>
          <h1>Point.<br /><em>Pause.</em><br />Know.</h1>
          <p>Hold the code inside the frame. We will take you to its public BinRo check, not straight to the destination.</p>
          <Link href="/" className={styles.backLink}>← Back to the beginning</Link>
        </div>
        <ScannerView />
      </div>
      <footer className={styles.footer}><span>BinRo / Camera access stays in your browser.</span><span>Nothing opens automatically.</span></footer>
    </main>
  );
}