"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import styles from "./guide.module.css";

export default function ManualGuidePage() {
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
            aria-label="Back"
          >
            <Ionicons name="chevron-back" size={20} />
          </button>
          <h1 className={styles.navTitle}>Manual Guide</h1>
          <div className={styles.navSpacer} aria-hidden="true" />
        </header>

        {/* Pure Text Article */}
        <article className={styles.article}>
          <p className={styles.lead}>
            A comprehensive guide to understanding BinRo, why pre-scan safety inspection matters, and how to use every core feature to protect yourself against deceptive QR codes.
          </p>

          <hr className={styles.divider} />

          {/* Section: What Problem We Solve */}
          <section className={styles.section}>
            <h2 className={styles.heading}>The Problem We Solve</h2>
            <p className={styles.paragraph}>
              Quick Response (QR) barcodes are now everywhere — printed on restaurant menus, parking meters, payment checkouts, transit passes, and marketing posters. Because standard camera applications automatically open whatever link is encoded, users are often redirected before they can verify where they are going.
            </p>
            <p className={styles.paragraph}>
              Attackers exploit this blind trust through an attack vector known as <strong>quishing</strong> (QR phishing). Criminals print deceptive stickers and paste them over legitimate QR codes in public places, diverting victims to credential-harvesting login pages, malware downloads, or altered payment recipients.
            </p>
            <p className={styles.paragraph}>
              BinRo solves this problem by placing a calm, zero-trust safety layer between your camera and the destination. Instead of blindly launching a browser, BinRo holds the code for inspection, analyzes the destination for known threats, and displays the true details so you remain in control.
            </p>
          </section>

          <hr className={styles.divider} />

          {/* Section: Core Features & Functionality */}
          <section className={styles.section}>
            <h2 className={styles.heading}>Core Features & Functionality</h2>

            <div className={styles.featureItem}>
              <h3 className={styles.subheading}>Pre-Open Inspection</h3>
              <p className={styles.paragraph}>
                When you scan any code, BinRo decodes the payload into clear, readable text. You can inspect the complete destination URL, domain name, query parameters, or plain text without triggering any network requests or executing untrusted scripts.
              </p>
            </div>

            <div className={styles.featureItem}>
              <h3 className={styles.subheading}>Trust Scores & Community Ratings</h3>
              <p className={styles.paragraph}>
                Every destination is evaluated using multi-layered heuristic checks, known threat blacklists, and community feedback to generate a transparent 0 to 100 Trust Score:
              </p>
              <ul className={styles.list}>
                <li className={styles.listItem}>
                  <strong>Safe (80 – 100):</strong> Verified legitimate domain or harmless text with no security flags.
                </li>
                <li className={styles.listItem}>
                  <strong>Caution (50 – 79):</strong> Newly registered domain, mixed community reports, or sensitive financial requests. Proceed with care.
                </li>
                <li className={styles.listItem}>
                  <strong>High Risk (0 – 49):</strong> Flagged as phishing, malware, deceptive redirect, or reported fraudulent payment.
                </li>
              </ul>
            </div>

            <div className={styles.featureItem}>
              <h3 className={styles.subheading}>Payment & UPI Defense</h3>
              <p className={styles.paragraph}>
                Financial QR codes (such as UPI, PayPal, SEPA, and crypto wallets) are parsed with specialized checks. BinRo displays the merchant or payee name, highlights whether a payment amount is pre-filled, and identifies potential tampering before you proceed to your banking app.
              </p>
            </div>

            <div className={styles.featureItem}>
              <h3 className={styles.subheading}>Community Threat Reporting</h3>
              <p className={styles.paragraph}>
                If you encounter a fraudulent QR code or a malicious sticker, you can submit a community report with one tap. Reports are aggregated to update trust ratings and protect other users across the network in real time.
              </p>
            </div>

            <div className={styles.featureItem}>
              <h3 className={styles.subheading}>Private Mode (Incognito)</h3>
              <p className={styles.paragraph}>
                Toggle Private Mode in the scanner whenever you want to inspect a destination without recording the scan to your synchronized account history.
              </p>
            </div>

            <div className={styles.featureItem}>
              <h3 className={styles.subheading}>Organized Scan History</h3>
              <p className={styles.paragraph}>
                All standard scans are automatically saved for your reference. You can search, filter by content type (payments, URLs, contacts, WiFi), review past trust ratings, or delete records at any time.
              </p>
            </div>
          </section>

          <hr className={styles.divider} />

          {/* Section: How to Use BinRo */}
          <section className={styles.section}>
            <h2 className={styles.heading}>How to Use BinRo</h2>
            <ol className={styles.orderedList}>
              <li className={styles.orderedItem}>
                <strong>Point & Scan:</strong> Open the Scanner tab and align the QR matrix within the viewfinder frame. You can also tap the gallery button to select an image or screenshot from your device.
              </li>
              <li className={styles.orderedItem}>
                <strong>Inspect the Results:</strong> Review the decoded destination card. Check the Trust Score, verify the displayed domain, and read any community comments.
              </li>
              <li className={styles.orderedItem}>
                <strong>Open with Confidence:</strong> If the destination is verified safe, tap "Open Destination" to continue in your browser or payment app.
              </li>
              <li className={styles.orderedItem}>
                <strong>Report Suspicious Codes:</strong> If something looks suspicious or a physical sticker appears to cover an existing code, tap "Report" to warn the community.
              </li>
            </ol>
          </section>

          <hr className={styles.divider} />

          {/* Section: Practical Safety Checklist */}
          <section className={styles.section}>
            <h2 className={styles.heading}>Field Safety Checklist</h2>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <strong>Check for Physical Stickers:</strong> Run your finger lightly over QR codes in public places like parking meters, restaurant tables, and street kiosks. If there is a raised sticker overlay, verify the destination carefully before entering any data.
              </li>
              <li className={styles.listItem}>
                <strong>Inspect the Full Domain:</strong> Scammers often use typosquatted domains (e.g. misspelled brand names) or excessive subdomains to disguise fraudulent websites.
              </li>
              <li className={styles.listItem}>
                <strong>Never Enter Credentials Blindly:</strong> Legitimate payment codes do not require you to enter email passwords, bank PINs, or recovery phrases to proceed.
              </li>
              <li className={styles.listItem}>
                <strong>Verify Pre-filled Amounts:</strong> When scanning a payment QR, always confirm that the requested amount matches your actual bill before authorizing the transfer.
              </li>
            </ul>
          </section>
        </article>

        {/* Action Buttons */}
        <div className={styles.actionsRow}>
          <Link href="/scanner" className={styles.primaryBtn}>
            <Ionicons name="scan-outline" size={17} />
            <span>Open Scanner</span>
          </Link>
          <Link href="/settings" className={styles.secondaryBtn}>
            <span>Return to Settings</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
