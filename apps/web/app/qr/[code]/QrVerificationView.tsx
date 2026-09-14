"use client";

import { useEffect, useMemo, useState, type CSSProperties } from "react";
import type { PublicQrRecord } from "../../../lib/qr-data";
import styles from "./qr.module.css";

type IconName =
  | "check"
  | "arrow"
  | "copy"
  | "external"
  | "flag"
  | "vote"
  | "comment"
  | "shield"
  | "lock"
  | "scan"
  | "info";

function Icon({ name, size = 20 }: { name: IconName; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true
  };

  if (name === "check") {
    return <svg {...common}><path d="m5 12 4.2 4.2L19 6.5" /></svg>;
  }
  if (name === "arrow") {
    return <svg {...common}><path d="M5 12h13M13 6l6 6-6 6" /></svg>;
  }
  if (name === "copy") {
    return <svg {...common}><rect x="8" y="8" width="11" height="11" rx="2" /><path d="M16 8V6.5A2.5 2.5 0 0 0 13.5 4H6.8A2.8 2.8 0 0 0 4 6.8v6.7A2.5 2.5 0 0 0 6.5 16H8" /></svg>;
  }
  if (name === "external") {
    return <svg {...common}><path d="M14 5h5v5M19 5l-8 8" /><path d="M18 13v4.2a1.8 1.8 0 0 1-1.8 1.8H6.8A1.8 1.8 0 0 1 5 17.2V7.8A1.8 1.8 0 0 1 6.8 6H11" /></svg>;
  }
  if (name === "flag") {
    return <svg {...common}><path d="M5 21V4.5M5 5c4-3 7 3 14 0v9c-7 3-10-3-14 0" /></svg>;
  }
  if (name === "vote") {
    return <svg {...common}><path d="m7 12 3 3 7-8" /><path d="M5 20h14" /><path d="M6 4h12v16H6z" /></svg>;
  }
  if (name === "comment") {
    return <svg {...common}><path d="M20 11.5a7 7 0 0 1-7.5 7 8.7 8.7 0 0 1-3.8-.8L4 19l1.3-3.6A6.8 6.8 0 0 1 4 11.5a7 7 0 0 1 7.5-7A7 7 0 0 1 20 11.5Z" /></svg>;
  }
  if (name === "shield") {
    return <svg {...common}><path d="M12 3 19 6v5.3c0 4.5-2.8 7.8-7 9.7-4.2-1.9-7-5.2-7-9.7V6l7-3Z" /><path d="m8.7 12 2.1 2.1 4.5-4.5" /></svg>;
  }
  if (name === "lock") {
    return <svg {...common}><rect x="5" y="10" width="14" height="10" rx="2" /><path d="M8 10V7a4 4 0 0 1 8 0v3" /></svg>;
  }
  if (name === "scan") {
    return <svg {...common}><path d="M5 8V5h3M16 5h3v3M19 16v3h-3M8 19H5v-3" /><path d="M8 9h8v6H8z" /></svg>;
  }
  return <svg {...common}><circle cx="12" cy="12" r="8.5" /><path d="M12 10.5v5M12 7.5h.01" /></svg>;
}

function formatDate(dateValue: string | null | undefined) {
  if (!dateValue) return "Date unavailable";
  const date = new Date(dateValue);
  if (Number.isNaN(date.getTime())) return "Date unavailable";
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", year: "numeric" }).format(date);
}

function formatContentType(contentType: string) {
  return contentType
    .replace(/[-_]/g, " ")
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function scoreTone(score: number) {
  if (score >= 70) return "good";
  if (score >= 40) return "caution";
  return "quiet";
}

function getDestinationHref(content: string) {
  const trimmed = content.trim();
  return /^https?:\/\//i.test(trimmed) ? trimmed : null;
}

const IOS_APP_URL = "https://apps.apple.com/";

export default function QrVerificationView({
  record,
  code
}: {
  record: PublicQrRecord;
  code: string;
}) {
  const [copied, setCopied] = useState(false);
  const [appSheetOpen, setAppSheetOpen] = useState(false);
  const destinationHref = getDestinationHref(record.content);
  const tone = scoreTone(record.trust.score);
  const hasSignal = record.trust.score >= 0;
  const trustLabel = hasSignal
    ? record.trust.label
    : "No community signal yet";
  const reportCount = record.trust.totalReports ?? 0;

  const displayDestination = useMemo(
    () => record.displayDestination?.trim() || record.content.trim(),
    [record.content, record.displayDestination]
  );

  useEffect(() => {
    if (!appSheetOpen) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setAppSheetOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [appSheetOpen]);

  async function copyDestination() {
    try {
      await navigator.clipboard.writeText(record.content);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  }

  return (
    <main className={styles.page} data-testid="qr-verification-page">
      <header className={`${styles.headerShell} page-enter`}>
          <a href="/" className={styles.brand} aria-label="BinRo home">
          <span className={styles.brandGlyph} aria-hidden="true">B</span>
          <span className={styles.brandWord}>BinRo</span>
        </a>
        <div className={styles.headerRight}>
          <span className={styles.livePill}><span className={styles.liveDot} />Public check</span>
          <span className={styles.codeLabel}>/{code}</span>
        </div>
      </header>

      <div className={styles.shell}>
        <section className={`${styles.hero} page-enter delay-1`} aria-labelledby="page-title">
          <div>
            <p className={styles.eyebrow}><span className={styles.eyebrowRule} /> QR SAFETY CHECK</p>
            <h1 id="page-title">Take a second.<br /><em>Know the link.</em></h1>
          </div>
          <div className={styles.heroAside}>
            <div className={styles.assuranceIcon}><Icon name="lock" size={18} /></div>
            <p>BinRo shows you what a shared QR link is, where it leads, and what the community has noticed before you open it.</p>
          </div>
        </section>

        {!record.isActive && (
          <section className={`${styles.inactiveBanner} page-enter delay-2`} data-testid="qr-inactive-banner" role="alert">
            <div className={styles.inactiveIcon}><Icon name="info" size={19} /></div>
            <div>
              <strong>This QR link has been paused.</strong>
              <p>{record.deactivationMessage || "The destination is not currently available through BinRo."}</p>
            </div>
          </section>
        )}

        <div className={`${styles.contentGrid} page-enter delay-2`}>
          <div className={styles.mainColumn}>
            <section className={styles.destinationCard} data-testid="qr-destination-card" aria-labelledby="destination-heading">
              <div className={styles.cardTopline}>
                <p className={styles.cardKicker}>DESTINATION</p>
                <span className={styles.typePill}>{formatContentType(record.contentType)}</span>
              </div>
              <div className={styles.destinationIdentity}>
                <div className={styles.destinationMark}><Icon name="external" size={22} /></div>
                <div>
                  <h2 id="destination-heading">{record.businessName || "Shared QR destination"}</h2>
                  <p className={styles.destinationUrl}>{displayDestination}</p>
                </div>
              </div>
              <div className={styles.destinationValue}>
                <span className={styles.valueLabel}>Full QR content</span>
                <code data-testid="qr-content">{record.content}</code>
                <button type="button" className={styles.copyButton} onClick={copyDestination} aria-label={copied ? "Destination copied" : "Copy full QR content"} data-testid="copy-content">
                  <Icon name={copied ? "check" : "copy"} size={16} />
                  {copied ? "Copied" : "Copy"}
                </button>
              </div>
              {destinationHref && record.isActive && (
                <a href={destinationHref} target="_blank" rel="noreferrer" className={styles.openButton} data-testid="open-destination">
                  Continue to destination <Icon name="arrow" size={18} />
                </a>
              )}
              <p className={styles.safetyNote}><Icon name="lock" size={14} /> BinRo does not open the link automatically.</p>
            </section>

            <section className={styles.statsRow} aria-label="QR activity">
              <div className={styles.stat}>
                <span className={styles.statIcon}><Icon name="scan" size={17} /></span>
                <span><strong>{record.scanCount.toLocaleString()}</strong><small>total scans</small></span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statIcon}><Icon name="comment" size={17} /></span>
                <span><strong>{record.commentCount.toLocaleString()}</strong><small>community notes</small></span>
              </div>
              <div className={styles.stat}>
                <span className={styles.statIcon}><Icon name="info" size={17} /></span>
                <span><strong>{formatDate(record.createdAt)}</strong><small>added to BinRo</small></span>
              </div>
            </section>

            <section className={styles.actionsCard} data-testid="community-actions">
              <div className={styles.sectionHeading}>
                <div>
                  <p className={styles.cardKicker}>COMMUNITY TOOLS</p>
                  <h2>Help the next person decide.</h2>
                </div>
                <div className={styles.sectionHeadingIcon}><Icon name="shield" size={21} /></div>
              </div>
              <p className={styles.sectionIntro}>Use the BinRo Android app to report a concern, vote on this link, or leave context for someone scanning after you.</p>
              <div className={styles.actionList}>
                <button type="button" className={styles.actionRow} onClick={() => setAppSheetOpen(true)} data-testid="button-report-concern">
                  <span className={`${styles.actionIcon} ${styles.actionIconRed}`}><Icon name="flag" size={19} /></span>
                  <div><strong>Report a concern</strong><span>Flag phishing, fraud, or a misleading destination.</span></div>
                  <Icon name="arrow" size={16} />
                </button>
                <button type="button" className={styles.actionRow} onClick={() => setAppSheetOpen(true)} data-testid="button-share-signal">
                  <span className={`${styles.actionIcon} ${styles.actionIconAmber}`}><Icon name="vote" size={19} /></span>
                  <div><strong>Share your signal</strong><span>Vote so the trust score reflects what people see.</span></div>
                  <Icon name="arrow" size={16} />
                </button>
                <button type="button" className={styles.actionRow} onClick={() => setAppSheetOpen(true)} data-testid="button-leave-note">
                  <span className={`${styles.actionIcon} ${styles.actionIconSage}`}><Icon name="comment" size={19} /></span>
                  <div><strong>Leave a note</strong><span>Add useful context without sharing private details.</span></div>
                  <Icon name="arrow" size={16} />
                </button>
              </div>
              <button type="button" className={styles.appButton} onClick={() => setAppSheetOpen(true)} data-testid="button-open-app-sheet">
                Open BinRo on mobile <Icon name="arrow" size={17} />
              </button>
            </section>
          </div>

          <aside className={styles.sideColumn}>
            <section className={`${styles.trustCard} ${styles[`trustCard_${tone}`]}`} data-testid="trust-summary" aria-labelledby="trust-heading">
              <div className={styles.trustCardHeader}>
                <p className={styles.cardKicker}>COMMUNITY SIGNAL</p>
                <span className={styles.signalBadge}><span />{hasSignal ? "Live" : "Waiting"}</span>
              </div>
              <div className={styles.scoreVisual}>
                <div className={styles.scoreRing} style={{ "--score": `${Math.max(0, Math.min(100, record.trust.score))}%` } as CSSProperties}>
                  <div className={styles.scoreCenter}>
                    <strong>{hasSignal ? record.trust.score : "—"}</strong>
                    {hasSignal && <span>/100</span>}
                  </div>
                </div>
                <div className={styles.scoreCopy}>
                  <h2 id="trust-heading">{trustLabel}</h2>
                  <p>{hasSignal ? "Based on signals from people who checked this QR." : "Be the first to add a signal in the BinRo app."}</p>
                </div>
              </div>
              <div className={styles.trustDivider} />
              <div className={styles.trustFoot}>
                <span><Icon name="shield" size={15} /> {reportCount.toLocaleString()} {reportCount === 1 ? "report" : "reports"}</span>
                <span>Updated as people contribute</span>
              </div>
            </section>

            <section className={`${styles.guideCard} page-enter delay-3`}>
              <div className={styles.guideNumber}>01</div>
              <h2>What should you check?</h2>
              <p>Look for a destination you recognize. If the domain, spelling, or request feels unexpected, close it and report the QR.</p>
              <div className={styles.guideRule} />
              <div className={styles.guideMeta}><Icon name="info" size={14} /> Safety context, not a guarantee</div>
            </section>
          </aside>
        </div>
      </div>

      <footer className={styles.footer}>
        <div><span className={styles.footerBrand}>BinRo</span><span>Public QR verification</span></div>
        <span>Check first. Open second.</span>
      </footer>

      {appSheetOpen ? (
        <div className={styles.sheetBackdrop} role="presentation" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setAppSheetOpen(false);
        }}>
          <section className={styles.appSheet} role="dialog" aria-modal="true" aria-labelledby="app-sheet-title">
            <button type="button" className={styles.sheetClose} onClick={() => setAppSheetOpen(false)} aria-label="Close app download options" data-testid="button-close-app-sheet">×</button>
            <p className={styles.cardKicker}>BINRO MOBILE</p>
            <h2 id="app-sheet-title">Bring the full check with you.</h2>
            <p>Community reports, votes, and notes live in the BinRo app. Download it to add your perspective to this QR check.</p>
            <div className={styles.storeList}>
              <a href="https://play.google.com/store/apps/details?id=com.qrguard.app" target="_blank" rel="noreferrer" className={styles.storeLink} data-testid="link-google-play">
                <span className={styles.storeIcon}>G</span>
                <span><strong>Google Play</strong><small>Download for Android</small></span>
                <Icon name="external" size={16} />
              </a>
              <a href={IOS_APP_URL} target="_blank" rel="noreferrer" className={styles.storeLink} data-testid="link-app-store">
                <span className={styles.storeIcon}>iOS</span>
                <span><strong>App Store</strong><small>Find BinRo for iPhone</small></span>
                <Icon name="external" size={16} />
              </a>
            </div>
            <button type="button" className={styles.sheetBack} onClick={() => setAppSheetOpen(false)} data-testid="button-back-to-check">Back to the check</button>
          </section>
        </div>
      ) : null}
    </main>
  );
}