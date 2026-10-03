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
        {/* Navigation Bar */}
        <header className={styles.navBar}>
          <button
            type="button"
            onClick={handleBack}
            className={styles.backBtn}
            aria-label="Go back"
          >
            <Ionicons name="chevron-back" size={20} />
          </button>
          <span className={styles.navTitle}>Security & Safety</span>
          <div className={styles.navSpacer} />
        </header>

        {/* Header Block */}
        <div className={styles.headerBlock}>
          <h1 className={styles.title}>About Trust Scores</h1>
          <p className={styles.subtitle}>
            How BinRo evaluates QR codes, detects threats, and calculates community-driven safety scores.
          </p>
        </div>

        {/* Hero Banner */}
        <div className={styles.heroBanner}>
          <div className={styles.heroIconWrap}>
            <Ionicons name="shield-checkmark" size={28} />
          </div>
          <div className={styles.heroContent}>
            <h2 className={styles.heroTitle}>Multi-Layered Protection</h2>
            <p className={styles.heroDesc}>
              Every scan is screened through algorithmic protocol inspection, known threat databases, and crowd-verified user ratings to protect you before you open any destination.
            </p>
          </div>
        </div>

        {/* Score Ranges Grid */}
        <div className={styles.tierGrid}>
          {/* Safe Tier */}
          <div className={`${styles.tierCard} ${styles.tierSafe}`}>
            <div className={styles.tierHeader}>
              <span className={styles.tierBadge}>
                <Ionicons name="checkmark-circle" size={16} />
                <span>Safe</span>
              </span>
              <span className={styles.tierScoreRange}>80 – 100</span>
            </div>
            <p className={styles.tierDesc}>
              Verified legitimate domain or harmless text. No scam reports or security flags found.
            </p>
          </div>

          {/* Caution Tier */}
          <div className={`${styles.tierCard} ${styles.tierCaution}`}>
            <div className={styles.tierHeader}>
              <span className={styles.tierBadge}>
                <Ionicons name="alert-circle" size={16} />
                <span>Caution</span>
              </span>
              <span className={styles.tierScoreRange}>50 – 79</span>
            </div>
            <p className={styles.tierDesc}>
              New or unverified destination, mixed community feedback, or sensitive payment requests. Proceed carefully.
            </p>
          </div>

          {/* High Risk Tier */}
          <div className={`${styles.tierCard} ${styles.tierDanger}`}>
            <div className={styles.tierHeader}>
              <span className={styles.tierBadge}>
                <Ionicons name="warning" size={16} />
                <span>High Risk</span>
              </span>
              <span className={styles.tierScoreRange}>0 – 49</span>
            </div>
            <p className={styles.tierDesc}>
              Reported as phishing, credential harvesting, malware, or fraudulent payment. Do not open or pay.
            </p>
          </div>
        </div>

        {/* Detailed Explanation Card */}
        <article className={styles.articleCard}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>How We Calculate Scores</h2>
            <p className={styles.paragraph}>
              BinRo computes a weighted 0 to 100 score by synthesizing three core security pillars:
            </p>

            <div className={styles.featureList}>
              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>
                  <Ionicons name="hardware-chip-outline" size={20} color="var(--primary)" />
                </span>
                <div className={styles.featureTextCol}>
                  <strong className={styles.featureHeading}>Algorithmic Heuristics</strong>
                  <span className={styles.featureDetail}>
                    Checks for suspicious URL structures, brand typosquatting (e.g., misspellings of popular banks or services), dangerous protocols, and hidden redirects.
                  </span>
                </div>
              </div>

              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>
                  <Ionicons name="globe-outline" size={20} color="var(--primary)" />
                </span>
                <div className={styles.featureTextCol}>
                  <strong className={styles.featureHeading}>Domain & Threat Feeds</strong>
                  <span className={styles.featureDetail}>
                    Cross-references scanned domains against threat intelligence lists and known scam hosts in real-time.
                  </span>
                </div>
              </div>

              <div className={styles.featureItem}>
                <span className={styles.featureIcon}>
                  <Ionicons name="people-outline" size={20} color="var(--primary)" />
                </span>
                <div className={styles.featureTextCol}>
                  <strong className={styles.featureHeading}>Community Moderation</strong>
                  <span className={styles.featureDetail}>
                    Account holders can report fraudulent QR codes, upvote trusted locations, and share warning comments for other users.
                  </span>
                </div>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>What You Should Do If a Score Is Low</h2>
            <p className={styles.paragraph}>
              If a QR code receives a "Caution" or "High Risk" rating:
            </p>
            <ul style={{ margin: "4px 0 0", paddingLeft: "20px", display: "flex", flexDirection: "column", gap: "6px" }}>
              <li style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
                <strong>Inspect the Full Destination URL:</strong> Ensure the domain matches the official company or merchant website.
              </li>
              <li style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
                <strong>Never Enter Passwords on Unverified Links:</strong> Scammers often paste physical QR stickers over real restaurant or parking meter codes.
              </li>
              <li style={{ fontSize: "14px", lineHeight: "1.6", color: "var(--text-secondary)" }}>
                <strong>Report Fraudulent Codes:</strong> Use the Report button on the scan result to help protect your fellow community members.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Disclaimer</h2>
            <p className={styles.paragraph}>
              Trust scores reflect aggregated heuristics and community input. They are provided for informational guidance only. You remain solely responsible for any decisions made or links followed after scanning.
            </p>
          </section>
        </article>

        {/* Quick Actions Row */}
        <div className={styles.actionsRow}>
          <Link href="/scanner" className={styles.primaryBtn}>
            <Ionicons name="scan-outline" size={18} />
            <span>Open Scanner</span>
          </Link>
          <Link href="/feedback" className={styles.secondaryBtn}>
            <Ionicons name="chatbubble-outline" size={18} />
            <span>Send Feedback</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
