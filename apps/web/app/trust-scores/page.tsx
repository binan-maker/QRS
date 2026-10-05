"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import styles from "./trust-scores.module.css";

export default function TrustScoresPage() {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/settings");
    }
  };

  return (
    <main className={styles.container}>
      <div className={styles.inner}>
        {/* Single Navigation Header */}
        <header className={styles.navBar}>
          <button
            type="button"
            onClick={handleBack}
            className={styles.backBtn}
            aria-label="Back"
          >
            <Ionicons name="chevron-back" size={20} />
          </button>
          <h1 className={styles.navTitle}>About Trust Scores</h1>
          <div className={styles.navSpacer} aria-hidden="true" />
        </header>

        {/* Pure Text Content */}
        <article className={styles.article}>
          <p className={styles.lead}>
            How BinRo evaluates QR codes, detects threats, and calculates community-driven safety scores before you open any destination.
          </p>

          <hr className={styles.divider} />

          <section className={styles.section}>
            <h2 className={styles.heading}>Score Ranges</h2>
            <div className={styles.tierList}>
              <div className={styles.tierItem}>
                <div className={styles.tierHeader}>
                  <span className={styles.tierName}>Safe</span>
                  <span className={styles.tierScore}>80 – 100</span>
                </div>
                <p className={styles.tierDesc}>
                  Verified legitimate domain or harmless text. No scam reports or security flags found.
                </p>
              </div>

              <div className={styles.tierItem}>
                <div className={styles.tierHeader}>
                  <span className={styles.tierName}>Caution</span>
                  <span className={styles.tierScore}>50 – 79</span>
                </div>
                <p className={styles.tierDesc}>
                  New or unverified destination, mixed community feedback, or sensitive payment requests. Proceed carefully.
                </p>
              </div>

              <div className={styles.tierItem}>
                <div className={styles.tierHeader}>
                  <span className={styles.tierName}>High Risk</span>
                  <span className={styles.tierScore}>0 – 49</span>
                </div>
                <p className={styles.tierDesc}>
                  Reported as phishing, credential harvesting, malware, or fraudulent payment. Do not open or pay.
                </p>
              </div>
            </div>
          </section>

          <hr className={styles.divider} />

          <section className={styles.section}>
            <h2 className={styles.heading}>How We Calculate Scores</h2>
            <p className={styles.paragraph}>
              BinRo computes a weighted 0 to 100 score by synthesizing three core security pillars:
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <strong>Algorithmic Heuristics:</strong> Checks for suspicious URL structures, brand typosquatting (e.g. misspellings of popular banks or services), dangerous protocols, and hidden redirects.
              </li>
              <li className={styles.listItem}>
                <strong>Domain & Threat Feeds:</strong> Cross-references scanned domains against threat intelligence lists and known scam hosts in real-time.
              </li>
              <li className={styles.listItem}>
                <strong>Community Moderation:</strong> Account holders can report fraudulent QR codes, upvote trusted locations, and share warning comments for other users.
              </li>
            </ul>
          </section>

          <hr className={styles.divider} />

          <section className={styles.section}>
            <h2 className={styles.heading}>What You Should Do If a Score Is Low</h2>
            <p className={styles.paragraph}>
              If a QR code receives a Caution or High Risk rating:
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <strong>Inspect the Full Destination URL:</strong> Ensure the domain matches the official company or merchant website before proceeding.
              </li>
              <li className={styles.listItem}>
                <strong>Never Enter Passwords on Unverified Links:</strong> Attackers often paste physical QR stickers over real restaurant or parking meter codes.
              </li>
              <li className={styles.listItem}>
                <strong>Report Fraudulent Codes:</strong> Use the Report button on the scan result to help protect fellow community members.
              </li>
            </ul>
          </section>

          <hr className={styles.divider} />

          <section className={styles.section}>
            <h2 className={styles.heading}>Disclaimer</h2>
            <p className={styles.paragraph}>
              Trust scores reflect aggregated heuristics and community input. They are provided for informational guidance only. You remain solely responsible for any decisions made or links followed after scanning.
            </p>
          </section>
        </article>

        {/* Clean Neutral Actions */}
        <div className={styles.actionsRow}>
          <Link href="/scanner" className={styles.primaryBtn}>
            <Ionicons name="scan-outline" size={17} />
            <span>Open Scanner</span>
          </Link>
          <Link href="/feedback" className={styles.secondaryBtn}>
            <Ionicons name="chatbubble-outline" size={17} />
            <span>Send Feedback</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
