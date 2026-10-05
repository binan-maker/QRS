"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import styles from "../legal.module.css";

export default function TermsOfServicePage() {
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
          <h1 className={styles.title}>Terms of Service</h1>
          <div className={styles.metaRow}>
            <span>Last Updated: October 2026</span>
            <span className={styles.separator}>•</span>
            <span>Version 1.2</span>
            <span className={styles.separator}>•</span>
            <span>Effective immediately</span>
          </div>
        </div>

        {/* Key Highlights Callout */}
        <div className={styles.highlightBox}>
          <span className={styles.highlightTitle}>Summary at a glance</span>
          <p className={styles.highlightText}>
            BinRo provides QR code scanning, risk assessment, and trust inspection. While our security heuristics and community reports help you identify suspicious links, you are solely responsible for inspecting and interacting with external destinations.
          </p>
        </div>

        {/* Legal Sections Card */}
        <article className={styles.articleCard}>
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>1. Acceptance of Terms</h2>
            <p className={styles.paragraph}>
              By accessing or using the BinRo web application, mobile applications, or any associated services (collectively, "BinRo" or the "Service"), you agree to be bound by these Terms of Service. If you do not agree to these terms, please do not use the Service.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>2. Description of Service</h2>
            <p className={styles.paragraph}>
              BinRo enables users to scan QR codes using their camera or uploaded image files, analyze destinations (including URLs, payment addresses, plain text, and contact cards), evaluate safety heuristics, and contribute community security feedback.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>3. Trust Scores & Safety Disclaimers</h2>
            <p className={styles.paragraph}>
              Safety warnings, trust scores, and risk classifications displayed by BinRo are generated through automated algorithmic checks, domain reputation databases, and aggregate community reports.
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <strong>Informational Only:</strong> Trust scores do not constitute an endorsement, guarantee of safety, or financial advice.
              </li>
              <li className={styles.listItem}>
                <strong>Independent Discretion:</strong> You are solely responsible for verifying the authenticity of any recipient or website before transferring funds, providing credentials, or downloading content.
              </li>
              <li className={styles.listItem}>
                <strong>No Liability for Destination Content:</strong> BinRo does not control, endorse, or assume responsibility for any third-party websites, payment gateways, or resources encoded in scanned QR codes.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>4. Acceptable Use Policy</h2>
            <p className={styles.paragraph}>
              You agree not to misuse the Service. Specifically, you may not:
            </p>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                Submit false, defamatory, or fraudulent community reports on legitimate destinations.
              </li>
              <li className={styles.listItem}>
                Use automated bots, scrapers, or excessive requests to probe or overwhelm BinRo APIs.
              </li>
              <li className={styles.listItem}>
                Attempt to bypass security controls, decrypt private scan data, or reverse engineer proprietary detection models.
              </li>
            </ul>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>5. User Accounts & Data Retention</h2>
            <p className={styles.paragraph}>
              When creating an account, you agree to provide accurate information and maintain the security of your login credentials. You are responsible for all activities occurring under your account. You may delete your account or clear local scan records from your device at any time from the Settings menu.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>6. Intellectual Property</h2>
            <p className={styles.paragraph}>
              All trademarks, logos, visual designs, interfaces, and software algorithms associated with BinRo are the exclusive property of BinRo and its licensors.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>7. Limitation of Liability</h2>
            <p className={styles.paragraph}>
              To the fullest extent permitted by applicable law, BinRo shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits, data, or reputation resulting from your access to or inability to use the Service, or any external destinations visited via QR codes.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>8. Modifications to Terms</h2>
            <p className={styles.paragraph}>
              We reserve the right to modify these Terms of Service at any time. When updates occur, the "Last Updated" date at the top of this document will be revised. Continued use of BinRo following posted modifications constitutes acceptance of the revised terms.
            </p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>9. Contact Us</h2>
            <p className={styles.paragraph}>
              If you have any questions or feedback regarding these Terms of Service, please contact our support team via the Feedback section in the BinRo app settings.
            </p>
          </section>
        </article>

        {/* Cross-Link Footer */}
        <div className={styles.footerCard}>
          <span className={styles.footerText}>Need details on how your data is handled?</span>
          <Link href="/privacy" className={styles.footerLink}>
            <span>View Privacy Policy</span>
            <Ionicons name="arrow-forward" size={15} />
          </Link>
        </div>
      </div>
    </main>
  );
}
