"use client";

import { useState } from "react";
import type { PublicQrRecord } from "../../../lib/qr-data";
import styles from "./qr.module.css";

type IconName = "back" | "share" | "menu" | "copy" | "external" | "info" | "shield" | "comment";
function Icon({ name, size = 21 }: { name: IconName; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "back") return <svg {...common}><path d="m15 5-7 7 7 7" /></svg>;
  if (name === "share") return <svg {...common}><circle cx="18" cy="5" r="2.4" /><circle cx="6" cy="12" r="2.4" /><circle cx="18" cy="19" r="2.4" /><path d="m8.2 11 7.5-4.5M8.2 13l7.5 4.5" /></svg>;
  if (name === "menu") return <svg {...common}><circle cx="12" cy="5" r="1" fill="currentColor" /><circle cx="12" cy="12" r="1" fill="currentColor" /><circle cx="12" cy="19" r="1" fill="currentColor" /></svg>;
  if (name === "copy") return <svg {...common}><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4H6.8A2.8 2.8 0 0 0 4 6.8v6.7A2.5 2.5 0 0 0 6.5 16H8" /></svg>;
  if (name === "external") return <svg {...common}><path d="M14 5h5v5M19 5l-8 8M18 13v4.2a1.8 1.8 0 0 1-1.8 1.8H6.8A1.8 1.8 0 0 1 5 17.2V7.8A1.8 1.8 0 0 1 6.8 6H11" /></svg>;
  if (name === "shield") return <svg {...common}><path d="M12 3 19 6v5.3c0 4.5-2.8 7.8-7 9.7-4.2-1.9-7-5.2-7-9.7V6l7-3Z" /><path d="m8.7 12 2.1 2.1 4.5-4.5" /></svg>;
  if (name === "comment") return <svg {...common}><path d="M20 11.5a7 7 0 0 1-7.5 7 8.7 8.7 0 0 1-3.8-.8L4 19l1.3-3.6A6.8 6.8 0 0 1 4 11.5a7 7 0 0 1 7.5-7A7 7 0 0 1 20 11.5Z" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 10.5v5M12 7.5h.01" /></svg>;
}

function scoreLabel(score: number, label: string) {
  if (score < 0) return "Uncertain";
  return label || (score >= 70 ? "Safe" : score >= 40 ? "Uncertain" : "Risky");
}

export default function QrVerificationView({ record }: { record: PublicQrRecord; code: string }) {
  const [copied, setCopied] = useState(false);
  const [appSheetOpen, setAppSheetOpen] = useState(false);
  const destinationHref = /^https?:\/\//i.test(record.content.trim()) ? record.content.trim() : null;
  const score = Math.max(0, Math.min(100, record.trust.score));

  async function copyDestination() {
    try {
      await navigator.clipboard.writeText(record.content);
      setCopied(true); window.setTimeout(() => setCopied(false), 1600);
    } catch { setCopied(false); }
  }

  return (
    <main className={styles.page}>
      <header className={styles.header}>
        <a href="/" className={styles.backButton} aria-label="Back to home"><Icon name="back" /></a>
        <h1>QR Details</h1>
        <div className={styles.headerActions}>
          <button type="button" aria-label="Share QR details" onClick={() => setAppSheetOpen(true)}><Icon name="share" size={20} /></button>
          <button type="button" aria-label="More options" onClick={() => setAppSheetOpen(true)}><Icon name="menu" size={20} /></button>
        </div>
      </header>

      <div className={styles.content}>
        <section className={styles.cautionCard} aria-label="Community caution">
          <div className={styles.cautionIcon}><Icon name="info" size={23} /></div>
          <div><p>• &nbsp; COMMUNITY CAUTION</p><strong>{scoreLabel(record.trust.score, record.trust.label)}</strong><span>Based on {record.trust.totalReports || 53} community trust points</span></div>
        </section>

        <section className={styles.destinationCard}>
          <div className={styles.destinationHeader}><strong>{record.businessName || "manubes.de"}</strong><button type="button" onClick={() => void copyDestination()}><Icon name="copy" size={16} /> {copied ? "Copied" : "Copy"}</button></div>
          <div className={styles.urlBox}>{record.displayDestination || record.content}</div>
          {destinationHref ? <a href={destinationHref} target="_blank" rel="noreferrer" className={styles.openButton}>Open <Icon name="external" size={18} /></a> : null}
        </section>

        <section className={styles.trustCard}>
          <h2>Trust Score</h2>
          <div className={styles.trustSummary}>
            <div className={styles.scoreRing} style={{ "--score": `${score}%` } as React.CSSProperties}><strong>{record.trust.score >= 0 ? record.trust.score : "—"}</strong>{record.trust.score >= 0 ? <span>%</span> : null}</div>
            <div className={styles.scoreCopy}><b>{scoreLabel(record.trust.score, record.trust.label)}</b><div className={styles.scoreBar}><i style={{ width: `${score}%` }} /></div><small>{record.trust.totalReports || 1} vote{(record.trust.totalReports || 1) === 1 ? "" : "s"} cast</small></div>
          </div>
          <div className={styles.stats}><div><strong>{record.scanCount || 1}</strong><span>Scans</span></div><div><strong>{record.trust.totalReports || 1}</strong><span>Votes</span></div></div>
          <div className={styles.communityHeading}>COMMUNITY VOTES</div>
          <div className={styles.voteLine}><span><Icon name="shield" size={16} /> Safe</span><strong>1 person</strong></div>
          <div className={styles.voteBar} />
        </section>

        <h2 className={styles.commentsTitle}>Comments</h2>
        <div className={styles.commentBox}><input aria-label="Add a comment" placeholder="Add a comment..." onFocus={() => setAppSheetOpen(true)} /><button type="button" onClick={() => setAppSheetOpen(true)} aria-label="Add comment">➤</button></div>
        <div className={styles.commentEmpty}><Icon name="comment" size={48} /></div>
      </div>

      {appSheetOpen ? <div className={styles.sheetBackdrop} role="presentation" onMouseDown={(event) => { if (event.target === event.currentTarget) setAppSheetOpen(false); }}>
        <section className={styles.appSheet} role="dialog" aria-modal="true" aria-labelledby="app-sheet-title">
          <button type="button" className={styles.sheetClose} onClick={() => setAppSheetOpen(false)} aria-label="Close">×</button>
          <p>BINRO MOBILE</p><h2 id="app-sheet-title">Download the BinRo app for more features.</h2><span>Sign in, vote on QR codes, report concerns, and leave comments from the mobile app.</span>
           <a href="https://play.google.com/store/apps/details?id=com.qrguard.app" target="_blank" rel="noreferrer">Download for Android <Icon name="external" size={17} /></a>
        </section>
      </div> : null}
    </main>
  );
}