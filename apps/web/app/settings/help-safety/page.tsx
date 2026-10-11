"use client";

import React, { useCallback, Suspense } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import HelpSafetyLoading from "./loading";
import styles from "./help-safety.module.css";

function HelpSafetyContent() {
  const router = useRouter();

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
      return;
    }
    router.push("/settings");
  }, [router]);

  return (
    <main className={styles.container}>
      <div className={styles.inner}>
        {/* Top Navigation Bar */}
        <header className={styles.navBar}>
          <button
            type="button"
            onClick={handleBack}
            className={styles.navBackBtn}
            aria-label="Back to Settings"
            title="Back to Settings"
          >
            <Ionicons name="chevron-back" size={20} />
          </button>
          <h1 className={styles.navTitle}>Help &amp; Safety</h1>
          <div className={styles.navSpacer} aria-hidden="true" />
        </header>

        {/* Resources & Safety Principles Section */}
        <section className={styles.section} aria-label="Help and resources">
          <div className={styles.sectionHeader}>
            <span className={styles.sectionLabel}>Safety &amp; Support Resources</span>
          </div>

          <div className={styles.cardGroup}>
            {/* 1. Safety Guide */}
            <Link href="/guide" className={styles.menuItem}>
              <div className={styles.menuIconWrap}>
                <Ionicons name="book-outline" size={19} />
              </div>
              <div className={styles.menuTextCol}>
                <span className={styles.menuLabel}>Safety Guide</span>
                <span className={styles.menuSublabel}>
                  Inspect codes and detect scams
                </span>
              </div>
              <Ionicons
                name="chevron-forward"
                size={16}
                color="var(--text-muted)"
              />
            </Link>

            <div className={styles.divider} />

            {/* 2. Trust Scores */}
            <Link href="/trust-scores" className={styles.menuItem}>
              <div className={styles.menuIconWrap}>
                <Ionicons name="shield-checkmark-outline" size={19} />
              </div>
              <div className={styles.menuTextCol}>
                <span className={styles.menuLabel}>Trust Scores</span>
                <span className={styles.menuSublabel}>
                  How safety ratings are calculated
                </span>
              </div>
              <Ionicons
                name="chevron-forward"
                size={16}
                color="var(--text-muted)"
              />
            </Link>

            <div className={styles.divider} />

            {/* 3. Send Feedback */}
            <Link href="/feedback" className={styles.menuItem}>
              <div className={styles.menuIconWrap}>
                <Ionicons name="chatbubble-outline" size={19} />
              </div>
              <div className={styles.menuTextCol}>
                <span className={styles.menuLabel}>Send Feedback</span>
                <span className={styles.menuSublabel}>
                  Report issues or suggest features
                </span>
              </div>
              <Ionicons
                name="chevron-forward"
                size={16}
                color="var(--text-muted)"
              />
            </Link>

            <div className={styles.divider} />

            {/* 4. About BinRo */}
            <Link href="/founder" className={styles.menuItem}>
              <div className={styles.menuIconWrap}>
                <Ionicons name="information-circle-outline" size={20} />
              </div>
              <div className={styles.menuTextCol}>
                <span className={styles.menuLabel}>About BinRo</span>
                <span className={styles.menuSublabel}>
                  Founder story and mission
                </span>
              </div>
              <Ionicons
                name="chevron-forward"
                size={16}
                color="var(--text-muted)"
              />
            </Link>
          </div>
        </section>
      </div>

      <BottomTabBar activeTab="profile" />
    </main>
  );
}

export default function HelpSafetyPage() {
  return (
    <Suspense fallback={<HelpSafetyLoading />}>
      <HelpSafetyContent />
    </Suspense>
  );
}
