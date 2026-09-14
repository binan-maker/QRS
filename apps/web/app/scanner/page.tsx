import Link from "next/link";
import ScannerView from "./ScannerView";
import styles from "./scanner.module.css";

export default function ScannerPage() {
  return (
    <main className={styles.page}>
      <header className={`${styles.header} page-enter`}>
        <Link href="/" className={styles.brand} aria-label="Back to BinRo home"><span>BinRo</span></Link>
        <span className={styles.headerMeta}><span /> LIVE CAMERA / PUBLIC CHECK</span>
      </header>
      <div className={styles.scannerLayout}>
        <div className={styles.intro}>
          <p className={styles.kicker}><span /> SCANNER / 02</p>
          <h1>Point.<br /><em>Pause.</em><br />Know.</h1>
          <p>Hold a QR code inside the frame. BinRo opens its public details page, never the destination automatically.</p>
          <Link href="/" className={styles.backLink}>← Back to home</Link>
        </div>
        <ScannerView />
      </div>
      <footer className={styles.footer}><span>BinRo / Camera access stays in your browser.</span><span>Read-only public check.</span></footer>
    </main>
  );
}