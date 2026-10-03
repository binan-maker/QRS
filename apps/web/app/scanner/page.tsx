import ScannerView from "./ScannerView";
import styles from "./scanner.module.css";

export default function ScannerPage() {
  return (
    <main className={styles.page}>
      <div className={styles.scannerLayout}>
        <ScannerView />
      </div>
    </main>
  );
}
