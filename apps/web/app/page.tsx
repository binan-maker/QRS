"use client";

import React from "react";
import Link from "next/link";
import { HomeHeader, HeroScanCard, RecentScans } from "@/components/home";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { Ionicons } from "@/lib/mobile-icons";
import styles from "./home.module.css";

export default function HomePage() {
  return (
    <main className={styles.appFrame}>
      <div className={styles.page}>
        <HomeHeader />

        <div className={styles.homeGrid}>
          <HeroScanCard />
          <RecentScans />
        </div>

        {/* ── Visual Trust Pillars & Safety Principles ── */}
        <section className={styles.trustPillarsSection} aria-labelledby="why-binro-title">
          <div className={styles.trustPillarsHeader}>
            <h2 id="why-binro-title" className={styles.trustPillarsTitle}>
              Know Before You Scan
            </h2>
            <p className={styles.trustPillarsSubtitle}>
              Your phone camera opens QR links blindly. BinRo adds a zero-trust safety layer between your camera lens and the destination link.
            </p>
          </div>

          <div className={styles.pillarsGrid}>
            <div className={styles.pillarCard}>
              <div className={styles.pillarIconBox}>
                <Ionicons name="shield-checkmark" size={20} color="currentColor" />
              </div>
              <h3 className={styles.pillarCardTitle}>Link Preview &amp; Tracker Strip</h3>
              <p className={styles.pillarCardDesc}>
                Inspect shortened URLs (bit.ly, tinyurl), unmask nested redirects, and strip intrusive tracking parameters before visiting.
              </p>
            </div>

            <div className={styles.pillarCard}>
              <div className={styles.pillarIconBox}>
                <Ionicons name="card" size={20} color="currentColor" />
              </div>
              <h3 className={styles.pillarCardTitle}>UPI Payment Verification</h3>
              <p className={styles.pillarCardDesc}>
                Validate merchant recipient IDs, flags fake shop stickers, and cross-checks known fraudulent payment VPAs.
              </p>
            </div>

            <div className={styles.pillarCard}>
              <div className={styles.pillarIconBox}>
                <Ionicons name="people" size={20} color="currentColor" />
              </div>
              <h3 className={styles.pillarCardTitle}>Community Trust Scores</h3>
              <p className={styles.pillarCardDesc}>
                Powered by real user reports and safety ratings across India and globally, keeping the community safe from scam stickers.
              </p>
            </div>
          </div>
        </section>

        {/* Semantic SEO & Sitelinks Structure for Search Engines and Screen Readers */}
        <section
          className={styles.seoSemanticSection}
          aria-label="About BinRo and Site Navigation"
        >
          <h2>What is BinRo?</h2>
          <p>
            BinRo is a public QR code safety scanner, link checker, and community
            trust verification platform available on Web, Android, and iOS. BinRo
            lets you preview the hidden destination link inside any QR code,
            inspect UPI and payment recipient details, and check real-time
            community trust scores before you open or pay.
          </p>

          <h2>Why Use BinRo Before Opening a QR Code?</h2>
          <p>
            Standard phone cameras open QR code links blindly, exposing users to
            fake QR stickers, phishing websites (quishing), malware downloads,
            and payment scams. BinRo acts as a zero-trust safety shield between
            your camera and the destination URL.
          </p>

          <h2>Who Founded BinRo?</h2>
          <p>
            BinRo was founded by Ahmed Sameer Binan (Binan), a 20-year-old tech
            entrepreneur and software builder from Kasaragod, Kerala, India,
            with the mission &ldquo;Know Before You Scan&rdquo; (&ldquo;Pehle
            BinRo. Phir Scan.&rdquo;).
          </p>

          <nav aria-label="BinRo Main Sitelinks">
            <ul>
              <li>
                <Link href="/scanner">
                  QR Code Scanner — Scan with Camera or Upload QR Image
                </Link>
              </li>
              <li>
                <Link href="/download">
                  Download BinRo App for Android and iOS
                </Link>
              </li>
              <li>
                <Link href="/rewards">
                  Scratch Cards — Daily Scan Milestones &amp; Merchant Vouchers
                </Link>
              </li>
              <li>
                <Link href="/referrals">
                  Refer &amp; Earn — Give Silver, Earn Gold VIP Scratch Cards
                </Link>
              </li>
              <li>
                <Link href="/trust-scores">
                  About BinRo Community Trust Scores &amp; Safety Ratings
                </Link>
              </li>
              <li>
                <Link href="/guide">
                  What is BinRo? Safety Guide &amp; User Manual
                </Link>
              </li>
              <li>
                <Link href="/founder">
                  Ahmed Sameer Binan — Founder of BinRo (Kasaragod, Kerala, India)
                </Link>
              </li>
              <li>
                <Link href="/login">Sign In to Your BinRo Account</Link>
              </li>
              <li>
                <Link href="/register">Create a Free BinRo Account</Link>
              </li>
              <li>
                <Link href="/feedback">Send Feedback &amp; Report QR Issues</Link>
              </li>
              <li>
                <Link href="/privacy">BinRo Privacy Policy</Link>
              </li>
              <li>
                <Link href="/terms">BinRo Terms of Service</Link>
              </li>
            </ul>
          </nav>
        </section>
      </div>

      <BottomTabBar activeTab="home" />
    </main>
  );
}
