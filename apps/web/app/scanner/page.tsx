import Link from "next/link";
import ScannerView from "./ScannerView";
import styles from "./scanner.module.css";

export default function ScannerPage() {
  return (
    <main className={styles.page}>
      <header className={`${styles.header} page-enter`}>
        <Link href="/" className={styles.brand} aria-label="Back to BinRo home">BinRo</Link>
        <span className={styles.headerMeta}><span /> LIVE CAMERA / PUBLIC CHECK</span>
      </header>

      <div className={styles.scannerLayout}>
        <ScannerView />
      </div>

      <footer className={styles.footer}>
        <span>BinRo / Camera access stays in your browser.</span>
        <span>Read-only public check.</span>
      </footer>
    </main>
  );
}