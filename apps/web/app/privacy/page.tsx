"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import styles from "../legal.module.css";

export default function PrivacyPolicyPage() {
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
          <span className={styles.navTitle}>BinRo Legal</span>
          <div className={styles.navSpacer} />
        </header>

        {/* Header Block */}
        <div className={styles.headerBlock}>
          <h1 className={styles.title}>Privacy Policy</h1>
          <div className={styles.metaRow}>
            <span>Last Updated: October 2026</span>
            <span className={styles.separator}>•</span>
            <span>Version 1.2</span>
            <span className={styles.separator}>•</span>
            <span>Compliant with standard privacy disclosures</span>
          </div>
        </div>

        {/* Key Highlights Callout */}
        <div className={styles.highlightBox}>
          <span className={styles.highlightTitle}>Our Privacy Pledge</span>
          <p className={styles.highlightText}>
            BinRo respects your digital privacy. We never sell your personal data or scan history. Camera feeds are processed locally on your device in real-time, and you have complete control to wipe local data or enable Private Mode at any time.
          </p>
        </div>

        {/* Legal Sections Card */}
        <article className={styles.articleCard}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>1. Introduction</h2>
            <p className={styles.paragraph}>
              This Privacy Policy describes how BinRo ("we", "us", or "our") collects, uses, protects, and discloses information when you use our website, mobile application, and related services.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>2. Information We Collect</h2>
            <p className={styles.paragraph}>
              We only collect data necessary to provide and secure our QR inspection services:
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <strong>Camera Access:</strong> To scan QR codes, BinRo requests permission to access your device's camera. Video frames are analyzed locally in device memory in real-time. Video streams are never recorded, saved, or transmitted to any remote servers.
              </li>
              <li className={styles.listItem}>
                <strong>Scanned QR Content:</strong> Decoded text or URL strings are parsed to evaluate safety indicators and display destinations to you.
              </li>
              <li className={styles.listItem}>
                <strong>Account Information:</strong> If you choose to register an account, we store your email address, display name, and avatar picture to sync your scan history across devices.
              </li>
              <li className={styles.listItem}>
                <strong>Local Storage:</strong> Scans, user preferences (theme, camera sound), and authentication sessions are cached locally on your device for fast performance.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>3. How We Use Information</h2>
            <p className={styles.paragraph}>
              We use collected information solely for the following purposes:
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>To decode and present QR content securely.</li>
              <li className={styles.listItem}>To analyze domain safety and compute risk indicators.</li>
              <li className={styles.listItem}>To synchronize history across devices for logged-in accounts.</li>
              <li className={styles.listItem}>To prevent fraudulent activity and protect community members.</li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>4. Private Mode & Local Data Control</h2>
            <p className={styles.paragraph}>
              BinRo gives you granular privacy controls over your scans:
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <strong>Private (Incognito) Mode:</strong> In the scanner, you can toggle Private Mode (eye icon). When active, scans are inspected without being added to your synchronized account history.
              </li>
              <li className={styles.listItem}>
                <strong>Clear Local Data:</strong> In Settings, you can click "Clear Local Data" to immediately wipe cached scan records from your browser or device without affecting your account.
              </li>
              <li className={styles.listItem}>
                <strong>Individual Scan Deletion:</strong> You can delete specific scans from your History list at any time.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>5. Data Sharing & Third Parties</h2>
            <p className={styles.paragraph}>
              We do not sell, rent, or trade your personal information or scan activity to third parties. We utilize industry-standard, privacy-compliant infrastructure providers:
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <strong>Cloud Database & Authentication:</strong> We utilize Supabase for encrypted user authentication and synchronized history storage.
              </li>
              <li className={styles.listItem}>
                <strong>Reputation Feeds:</strong> High-level domain checks may consult security blacklists to detect phishing, without sharing user identifying information.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>6. Security Standards</h2>
            <p className={styles.paragraph}>
              We implement comprehensive technical safeguards, including HTTPS TLS encryption for all data in transit, strict database row-level security (RLS) policies, and hashed credential management.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>7. Account Deletion & Data Rights</h2>
            <p className={styles.paragraph}>
              You retain full ownership of your data. You may request complete account deletion directly from the Settings page ("Delete Account"). Deleting your account permanently purges your user profile, scan history, and preferences from our cloud servers.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>8. Children's Privacy</h2>
            <p className={styles.paragraph}>
              BinRo is not directed to children under 13 years of age. We do not knowingly collect personal information from children.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>9. Contact & Inquiries</h2>
            <p className={styles.paragraph}>
              If you have any questions or privacy concerns regarding this policy, please reach out through the in-app Feedback form located in Settings.
            </p>
          </section>
        </article>

        {/* Cross-Link Footer */}
        <div className={styles.footerCard}>
          <span className={styles.footerText}>Review our terms and service guidelines?</span>
          <Link href="/terms" className={styles.footerLink}>
            <span>View Terms of Service</span>
            <Ionicons name="arrow-forward" size={15} />
          </Link>
        </div>
      </div>
    </main>
  );
}
