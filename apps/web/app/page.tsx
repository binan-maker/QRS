"use client";

import React from "react";
import Link from "next/link";
import { HomeHeader, HeroScanCard, RecentScans } from "@/components/home";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
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
