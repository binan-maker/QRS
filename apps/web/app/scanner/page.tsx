import type { Metadata } from "next";
import { createPageMetadata } from "@/lib/seo";
import ScannerView from "./ScannerView";
import styles from "./scanner.module.css";

export const metadata: Metadata = createPageMetadata({
  title: "QR Code Scanner — Inspect Links Safely Before Opening",
  description:
    "Scan any QR code online using your camera or upload an image. Preview the hidden destination URL, verify payment details, and check real-time BinRo community trust scores.",
  path: "/scanner",
});

export default function ScannerPage() {
  return (
    <main className={styles.page}>
      <div className={styles.scannerLayout}>
        <ScannerView />
      </div>
    </main>
  );
}
