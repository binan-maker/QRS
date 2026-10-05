"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import styles from "../guide/guide.module.css";

export default function FounderPage() {
  const router = useRouter();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
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
          <h1 className={styles.navTitle}>Founder — Ahmed Sameer Binan</h1>
          <div className={styles.navSpacer} aria-hidden="true" />
        </header>

        {/* Pure Text Article */}
        <article className={styles.article}>
          <p className={styles.lead}>
            <strong>Ahmed Sameer Binan</strong> (also known as <strong>Binan</strong> / <strong>@iam_binan</strong>) is a 20-year-old Indian tech entrepreneur, mobile engineer, and cybersecurity builder from <strong>Kasaragod, Kerala, India</strong>. He is the Founder and Creator of <strong>BinRo</strong> — the trust layer for QR codes.
          </p>

          <hr className={styles.divider} />

          {/* Section: Quick Facts / Knowledge Overview */}
          <section className={styles.section}>
            <h2 className={styles.heading}>Profile Overview</h2>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <strong>Full Name:</strong> Ahmed Sameer Binan (Binan)
              </li>
              <li className={styles.listItem}>
                <strong>Age:</strong> 20 years old (Born 2005)
              </li>
              <li className={styles.listItem}>
                <strong>Hometown:</strong> Kasaragod, Kerala, India
              </li>
              <li className={styles.listItem}>
                <strong>Role:</strong> Founder &amp; Creator of BinRo (<a href="https://binro.in" style={{ color: "var(--primary)", textDecoration: "none" }}>binro.in</a>)
              </li>
              <li className={styles.listItem}>
                <strong>Mission &amp; Tagline:</strong> &ldquo;Know Before You Scan&rdquo; (&ldquo;Pehle BinRo. Phir Scan.&rdquo;)
              </li>
              <li className={styles.listItem}>
                <strong>Focus Areas:</strong> QR Code Security, Cybersecurity, Mobile Engineering, Cryptography (ECDSA), Offline-First Architecture, AI &amp; Robotics
              </li>
            </ul>
          </section>

          <hr className={styles.divider} />

          {/* Section: About Ahmed Sameer Binan */}
          <section className={styles.section}>
            <h2 className={styles.heading}>About Ahmed Sameer Binan</h2>
            <p className={styles.paragraph}>
              Every day, millions of people scan QR codes to make payments, access services, and share information — yet most never stop to ask whether the code they are about to scan can be trusted. Seeing how people verify unknown phone numbers with Truecaller before answering, Ahmed Sameer Binan set out to build the <strong>&ldquo;Truecaller for QR codes&rdquo;</strong>: <strong>BinRo</strong>.
            </p>
            <p className={styles.paragraph}>
              As an AI &amp; Robotics student and self-driven software builder from Kasaragod, Kerala, Binan combines mobile engineering, cybersecurity concepts, ECDSA cryptographic signing, heuristic fraud detection, and offline-first architecture to build practical security tools for real-world use across Web, Android, and iOS.
            </p>
            <p className={styles.paragraph}>
              Alongside BinRo, he also created <strong>Status Saver</strong>, a lightweight, clutter-free WhatsApp utility built from zero to solve everyday mobile needs.
            </p>
          </section>

          <hr className={styles.divider} />

          {/* Section: Startup Journey & Milestones */}
          <section className={styles.section}>
            <h2 className={styles.heading}>Startup Journey &amp; Milestones</h2>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <strong>Founded BinRo (2025 – Present):</strong> Designed and engineered a cross-platform QR safety and community trust verification ecosystem across Web, Android, and iOS.
              </li>
              <li className={styles.listItem}>
                <strong>Featured by Startup Veda:</strong> Recognized for pioneering the &ldquo;Truecaller for QR codes&rdquo; concept and promoting pre-scan digital safety in India with the mission <em>&ldquo;Know Before You Scan&rdquo;</em> and <em>&ldquo;Pehle BinRo. Phir Scan.&rdquo;</em>
              </li>
              <li className={styles.listItem}>
                <strong>Vande Bharatam Initiative (Adani Group):</strong> Officially submitted BinRo to the national entrepreneurship program identifying top innovators across India.
              </li>
              <li className={styles.listItem}>
                <strong>Google AI Day for Startups India 2026:</strong> Participant exploring secure AI and startup product architecture.
              </li>
              <li className={styles.listItem}>
                <strong>Freedom 250 Advancing Business Communication &amp; Pitch Readiness Workshop:</strong> Participant in the program organized by the American Center, U.S. Consulate General Chennai and Kerala Startup Mission (KSUM).
              </li>
              <li className={styles.listItem}>
                <strong>Kerala Startup Mission (KSUM) &amp; Beyond Tomorrow 2026:</strong> Active builder in the Kerala startup ecosystem and certified in Python Programming at ASAP Community Skill Park (CSP), Kasaragod.
              </li>
            </ul>
          </section>

          <hr className={styles.divider} />

          {/* Section: Official Verified Profiles */}
          <section className={styles.section}>
            <h2 className={styles.heading}>Official Links &amp; Profiles</h2>
            <ul className={styles.list}>
              <li className={styles.listItem}>
                <strong>LinkedIn:</strong>{" "}
                <a
                  href="https://www.linkedin.com/in/ahmed-sameer-binan/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--primary)", textDecoration: "none" }}
                >
                  linkedin.com/in/ahmed-sameer-binan
                </a>
              </li>
              <li className={styles.listItem}>
                <strong>Instagram:</strong>{" "}
                <a
                  href="https://www.instagram.com/iam_binan/"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--primary)", textDecoration: "none" }}
                >
                  instagram.com/iam_binan (@iam_binan)
                </a>
              </li>
              <li className={styles.listItem}>
                <strong>About.me:</strong>{" "}
                <a
                  href="https://about.me/ahmedsameerbinan"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--primary)", textDecoration: "none" }}
                >
                  about.me/ahmedsameerbinan
                </a>
              </li>
              <li className={styles.listItem}>
                <strong>GitHub:</strong>{" "}
                <a
                  href="https://github.com/binan-maker"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: "var(--primary)", textDecoration: "none" }}
                >
                  github.com/binan-maker
                </a>
              </li>
            </ul>
          </section>
        </article>

        {/* Action Buttons */}
        <div className={styles.actionsRow}>
          <Link href="/scanner" className={styles.primaryBtn}>
            <Ionicons name="scan-outline" size={17} />
            <span>Open BinRo Scanner</span>
          </Link>
          <Link href="/guide" className={styles.secondaryBtn}>
            <span>Read Safety Guide</span>
          </Link>
        </div>
      </div>
    </main>
  );
}
