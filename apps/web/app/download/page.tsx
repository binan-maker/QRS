"use client";

import React, { useState, useCallback, useRef, useEffect, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useTheme } from "@/lib/theme-context";
import { Ionicons, MaterialCommunityIcons } from "@/lib/mobile-icons";
import { GooglePlayOfficialIcon, AppleOfficialIcon } from "@/components/icons/StoreIcons";
import styles from "./download.module.css";

function DownloadContent() {
  const { colors } = useTheme();
  const router = useRouter();
  const searchParams = useSearchParams();
  const returnUrl = searchParams.get("returnUrl");
  const [toastKey, setToastKey] = useState(0);
  const [toastVisible, setToastVisible] = useState(false);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleBack = useCallback(() => {
    if (returnUrl) {
      router.replace(returnUrl);
      return;
    }
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/");
  }, [returnUrl, router]);

  const showComingSoonToast = useCallback(() => {
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);

    setToastKey((prev) => prev + 1);
    setToastVisible(true);

    // Matches features/qr-detail/components/QrToast.tsx timing
    hideTimerRef.current = setTimeout(() => {
      setToastVisible(false);
    }, 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, []);

  return (
    <main className={styles.page}>
      {/* ── Mobile Toast Pill (1:1 with features/qr-detail/components/QrToast.tsx) ── */}
      <div
        key={toastKey}
        role="status"
        aria-live="polite"
        className={`${styles.toastPill} ${toastVisible ? styles.toastPillVisible : styles.toastPillHidden}`}
      >
        <Ionicons name="time-outline" size={15} color="#FFFFFF" />
        <span className={styles.toastPillText}>Coming Soon!</span>
      </div>

      <div className={styles.inner}>
        {/* ── Top Bar (1:1 with shared/components/ui/ScreenHeader.tsx) ── */}
        <header className={styles.navBar}>
          <button
            type="button"
            onClick={handleBack}
            className={styles.backBtn}
            aria-label="Go back"
            style={{
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
            }}
          >
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </button>
          <span className={styles.navTitle} style={{ color: colors.text }}>
            Download App
          </span>
          <div className={styles.navSpacer} aria-hidden="true" />
        </header>

        {/* ── Brand Block (1:1 with features/auth/components/AuthBrandBlock.tsx) ── */}
        <div className={styles.brandBlock}>
          <div className={styles.brandName} style={{ color: colors.text }}>
            Bin<span style={{ color: colors.primary }}>Ro</span>
          </div>
          <div
            className={styles.brandDivider}
            style={{ backgroundColor: colors.primary }}
          />
          <h1 id="download-title" className={styles.pageTitle} style={{ color: colors.text }}>
            Get more with BinRo
          </h1>
          <p className={styles.pageSubtitle} style={{ color: colors.textSecondary }}>
            Sign in to view your profile and activity
          </p>
        </div>

        {/* ── Card (1:1 with features/auth/styles.ts & features/profile/components/GuestView.tsx) ── */}
        <section
          className={styles.card}
          aria-labelledby="download-title"
          style={{
            backgroundColor: colors.surface,
            borderColor: colors.surfaceBorder,
          }}
        >
          <div
            className={styles.guestIconRing}
            style={{
              backgroundColor: colors.primaryDim,
              borderColor: `${colors.primary}30`,
            }}
          >
            <MaterialCommunityIcons
              name="qrcode-scan"
              size={38}
              color={colors.primary}
            />
          </div>

          <h2 className={styles.guestTitle} style={{ color: colors.text }}>
            Know Before You Scan
          </h2>

          {/* ── Official Store Banners (Google Play & iOS App Store) ── */}
          <div className={styles.storeBadgesGroup}>
            <a
              href="https://play.google.com/store/apps/details?id=com.qrguard.app"
              target="_blank"
              rel="noreferrer"
              className={styles.officialStoreBanner}
              aria-label="Get it on Google Play"
            >
              <GooglePlayOfficialIcon />
              <div className={styles.storeBannerTextCol}>
                <span className={styles.storeBannerKicker}>GET IT ON</span>
                <span className={styles.storeBannerTitle}>Google Play</span>
              </div>
            </a>

            <button
              type="button"
              onClick={showComingSoonToast}
              className={styles.officialStoreBanner}
              aria-label="Download on the App Store"
            >
              <AppleOfficialIcon />
              <div className={styles.storeBannerTextCol}>
                <span className={styles.storeBannerKickerIos}>Download on the</span>
                <span className={styles.storeBannerTitle}>App Store</span>
              </div>
            </button>
          </div>
        </section>

        {/* ── Footer (1:1 with features/auth/styles.ts footer) ── */}
        <div className={styles.footer}>
          <span className={styles.footerText} style={{ color: colors.textSecondary }}>
            Want to scan right now?
          </span>
          <Link
            href="/scanner"
            className={styles.footerLink}
            style={{ color: colors.primary }}
          >
            Open Web Scanner
          </Link>
        </div>
      </div>
    </main>
  );
}

export default function DownloadPage() {
  return (
    <Suspense fallback={null}>
      <DownloadContent />
    </Suspense>
  );
}
