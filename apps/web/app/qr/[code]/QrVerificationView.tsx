"use client";

import { useState } from "react";
import type { PublicQrRecord } from "../../../lib/qr-data";
import styles from "./qr.module.css";

type IconName = "back" | "share" | "menu" | "copy" | "external" | "info" | "shield" | "comment" | "check";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };

  if (name === "back") return <svg {...common}><path d="m15 18-6-6 6-6" /></svg>;
  if (name === "share") return <svg {...common}><circle cx="18" cy="5" r="3" /><circle cx="6" cy="12" r="3" /><circle cx="18" cy="19" r="3" /><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" /></svg>;
  if (name === "menu") return <svg {...common}><circle cx="12" cy="12" r="1" /><circle cx="19" cy="12" r="1" /><circle cx="5" cy="12" r="1" /></svg>;
  if (name === "copy") return <svg {...common}><rect width="14" height="14" x="8" y="8" rx="2" ry="2" /><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" /></svg>;
  if (name === "check") return <svg {...common}><path d="M20 6 9 17l-5-5" /></svg>;
  if (name === "external") return <svg {...common}><path d="M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></svg>;
  if (name === "shield") return <svg {...common}><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" /><path d="m9 12 2 2 4-4" /></svg>;
  if (name === "comment") return <svg {...common}><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z" /></svg>;
  return <svg {...common}><circle cx="12" cy="12" r="10" /><path d="M12 16v-4M12 8h.01" /></svg>;
}

function scoreLabel(score: number, label: string) {
  if (score < 0) return "Uncertain";
  return label || (score >= 70 ? "Safe & Verified" : score >= 40 ? "Uncertain" : "Risky");
}

export default function QrVerificationView({ record }: { record: PublicQrRecord; code: string }) {
  const [copied, setCopied] = useState(false);
  const [appSheetOpen, setAppSheetOpen] = useState(false);

  const destinationHref = /^https?:\/\//i.test(record.content.trim()) ? record.content.trim() : null;
  const score = Math.max(0, Math.min(100, record.trust.score));

  async function copyDestination() {
    try {
      await navigator.clipboard.writeText(record.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  }

  async function handleShare() {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "BinRo QR Verification",
          text: `Check this QR before opening: ${record.displayDestination || record.content}`,
          url: window.location.href,
        });
        return;
      } catch {
        // User cancelled or unsupported
      }
    }
    setAppSheetOpen(true);
  }

  const isSafe = score >= 70;
  const isRisky = score >= 0 && score < 40;

  return (
    <main className={styles.page}>
      {/* ── Top Navigation Bar ── */}
      <header className={styles.header}>
        <a href="/" className={styles.backButton} aria-label="Back to home">
          <Icon name="back" />
        </a>
        <h1>QR Verification</h1>
        <div className={styles.headerActions}>
          <button type="button" aria-label="Share QR details" onClick={handleShare}>
            <Icon name="share" size={18} />
          </button>
          <button type="button" aria-label="More options" onClick={() => setAppSheetOpen(true)}>
            <Icon name="menu" size={18} />
          </button>
        </div>
      </header>

      {/* ── Main Container ── */}
      <div className={styles.content}>
        {/* Caution / Trust Banner */}
        <section
          className={`${styles.cautionCard} ${isSafe ? styles.cardSafe : isRisky ? styles.cardRisky : ""}`}
          aria-label="Security status banner"
        >
          <div className={styles.cautionIcon}>
            <Icon name={isSafe ? "shield" : "info"} size={24} />
          </div>
          <div className={styles.cautionBody}>
            <p className={styles.cautionEyebrow}>
              {isSafe ? "VERIFIED SAFETY SCAN" : "COMMUNITY SAFETY CHECK"}
            </p>
            <strong>{scoreLabel(record.trust.score, record.trust.label)}</strong>
            <span>
              {record.trust.totalReports > 0
                ? `Based on ${record.trust.totalReports} community reports`
                : "Scanned and evaluated by BinRo Security"}
            </span>
          </div>
        </section>

        {/* Destination Card */}
        <section className={styles.destinationCard}>
          <div className={styles.destinationHeader}>
            <strong>QR Payload Destination</strong>
            <button
              type="button"
              onClick={() => void copyDestination()}
              className={styles.copyButton}
              aria-label="Copy destination"
            >
              <Icon name={copied ? "check" : "copy"} size={15} />
              <span>{copied ? "Copied!" : "Copy"}</span>
            </button>
          </div>

          <div className={styles.urlBox} title={record.content}>
            <code>{record.displayDestination || record.content}</code>
          </div>

          <div className={styles.typeBadgeRow}>
            <span className={styles.typeBadge}>Type: {record.contentType.toUpperCase()}</span>
            {record.scanCount > 0 && (
              <span className={styles.statPill}>{record.scanCount} scans</span>
            )}
          </div>

          {destinationHref && (
            <a
              href={destinationHref}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.openButton}
            >
              <span>Visit Link Safely</span>
              <Icon name="external" size={16} />
            </a>
          )}
        </section>

        {/* Trust Score & Metrics Card */}
        <section className={styles.trustCard}>
          <h2>Trust Score</h2>
          <div className={styles.trustSummary}>
            <div
              className={`${styles.scoreRing} ${isSafe ? styles.ringSafe : isRisky ? styles.ringRisky : ""}`}
              style={{ "--score": `${score}%` } as React.CSSProperties}
            >
              <strong>{record.trust.score >= 0 ? record.trust.score : "—"}</strong>
              {record.trust.score >= 0 && <span>%</span>}
            </div>

            <div className={styles.scoreCopy}>
              <span className={styles.scoreBadge}>
                {scoreLabel(record.trust.score, record.trust.label)}
              </span>
              <div className={styles.scoreBarTrack}>
                <div
                  className={`${styles.scoreBarFill} ${isSafe ? styles.fillSafe : isRisky ? styles.fillRisky : ""}`}
                  style={{ width: `${score}%` }}
                />
              </div>
              <small>
                {record.trust.totalReports} community report{record.trust.totalReports === 1 ? "" : "s"}
              </small>
            </div>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statItem}>
              <strong>{record.scanCount || 1}</strong>
              <span>Total Scans</span>
            </div>
            <div className={styles.statItem}>
              <strong>{record.commentCount}</strong>
              <span>Comments</span>
            </div>
          </div>
        </section>

        {/* Community Comments Section */}
        <section className={styles.commentsSection}>
          <div className={styles.commentsHeadingRow}>
            <h2>Community Comments</h2>
            <span className={styles.commentCountBadge}>{record.comments.length}</span>
          </div>

          <div className={styles.commentInputRow}>
            <input
              type="text"
              aria-label="Add a note or comment"
              placeholder="Add a safety note..."
              onFocus={() => setAppSheetOpen(true)}
              readOnly
            />
            <button
              type="button"
              onClick={() => setAppSheetOpen(true)}
              aria-label="Post comment"
            >
              ➤
            </button>
          </div>

          {record.comments.length > 0 ? (
            <div className={styles.commentsList}>
              {record.comments.map((comment) => (
                <article key={comment.id} className={styles.commentItem}>
                  <div className={styles.commentHeader}>
                    <strong>{comment.userName}</strong>
                    {comment.createdAt && (
                      <time dateTime={comment.createdAt}>
                        {new Date(comment.createdAt).toLocaleDateString()}
                      </time>
                    )}
                  </div>
                  <p className={styles.commentText}>{comment.text}</p>
                  {comment.likes > 0 && (
                    <div className={styles.commentLikes}>
                      <span>👍 {comment.likes}</span>
                    </div>
                  )}
                </article>
              ))}
            </div>
          ) : (
            <div className={styles.emptyComments}>
              <Icon name="comment" size={36} />
              <p>No community comments yet</p>
              <button
                type="button"
                className={styles.addNoteLink}
                onClick={() => setAppSheetOpen(true)}
              >
                Be the first to share notes on this code
              </button>
            </div>
          )}
        </section>
      </div>

      {/* ── App Download Sheet ── */}
      {appSheetOpen && (
        <div
          className={styles.sheetBackdrop}
          role="presentation"
          onClick={(e) => {
            if (e.target === e.currentTarget) setAppSheetOpen(false);
          }}
        >
          <section
            className={styles.appSheet}
            role="dialog"
            aria-modal="true"
            aria-labelledby="app-sheet-title"
          >
            <button
              type="button"
              className={styles.sheetClose}
              onClick={() => setAppSheetOpen(false)}
              aria-label="Close dialog"
            >
              ×
            </button>
            <p className={styles.sheetEyebrow}>BINRO MOBILE SECURITY</p>
            <h2 id="app-sheet-title">Get the BinRo app for full protection</h2>
            <p className={styles.sheetDesc}>
              Vote on safety scores, report scam QR codes, leave verified comments, and get instant threat detection with the Android app.
            </p>
            <a
              href="https://play.google.com/store/apps/details?id=com.qrguard.app"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.sheetDownloadBtn}
            >
              <span>Download on Google Play</span>
              <Icon name="external" size={16} />
            </a>
          </section>
        </div>
      )}
    </main>
  );
}
