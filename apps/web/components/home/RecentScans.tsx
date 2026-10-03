"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import Colors from "@shared/constants/colors";
import { Ionicons } from "@/lib/mobile-icons";
import { useAuth } from "@/lib/auth-context";
import { useTheme } from "@/lib/theme-context";
import { fetchUserScans, type ScanItem } from "@/lib/scan-history";
import { HistoryItemCard } from "@/components/history";
import styles from "@/app/home.module.css";

export function RecentScans() {
  const { colors } = useTheme();
  const { user, loading: authLoading } = useAuth();
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [loading, setLoading] = useState(true);

  const loadScans = useCallback(async () => {
    try {
      const items = await fetchUserScans(user?.id);
      setScans(items);
    } catch {
      // Keep existing scans on error
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadScans();

    const handleRefresh = () => {
      loadScans();
    };

    window.addEventListener("focus", handleRefresh);
    window.addEventListener("storage", handleRefresh);
    window.addEventListener("binro:scan_added", handleRefresh);

    return () => {
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener("storage", handleRefresh);
      window.removeEventListener("binro:scan_added", handleRefresh);
    };
  }, [loadScans, authLoading]);

  const recentItems = scans.slice(0, 3);

  return (
    <div className={styles.recentScansCol}>
      <section className={styles.recentSection} aria-labelledby="recent-title">
        {/* Section Header (1:1 with mobile RecentScansList sectionHeader) */}
        <div className={styles.sectionHeader}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <span className={styles.sectionDot} />
            <h2 id="recent-title" className={styles.sectionTitle}>
              Recent Scans
            </h2>
          </div>

          {!loading && recentItems.length > 0 && (
            <Link href="/history" className={styles.seeAllBtn}>
              <span>See All</span>
              <Ionicons name="arrow-forward" size={12} color="var(--primary)" />
            </Link>
          )}
        </div>

        {/* Content (1:1 with mobile RecentScansList) */}
        {loading ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {[0, 1, 2].map((i) => (
              <div
                key={i}
                style={{
                  height: "72px",
                  borderRadius: "20px",
                  backgroundColor: "var(--surface)",
                  border: "1px solid var(--surface-border)",
                  opacity: 0.8 - i * 0.2,
                  animation: "pulse 1.8s ease-in-out infinite",
                }}
              />
            ))}
          </div>
        ) : recentItems.length > 0 ? (
          <div style={{ display: "flex", flexDirection: "column", gap: "2px", width: "100%" }}>
            {recentItems.map((item, index) => (
              <HistoryItemCard
                key={item.id}
                item={item}
                index={index}
                animate={true}
                showTime={false}
              />
            ))}

            {/* See Full History Button (1:1 with mobile fullHistoryBtn) */}
            <Link href="/history" className={styles.fullHistoryBtn}>
              <Ionicons name="time-outline" size={16} color="var(--primary)" />
              <span>See Full History</span>
              <Ionicons name="arrow-forward" size={14} color="var(--primary)" />
            </Link>
          </div>
        ) : (
          /* Empty State (1:1 with mobile EmptyScans) */
          <div className={styles.emptyCard}>
            <div className={styles.emptyIconArea}>
              <span
                className={styles.emptyIconRing}
                style={{ borderColor: `${colors.primary}30` }}
                aria-hidden="true"
              />
              <div
                className={styles.emptyIcon}
                style={{ backgroundColor: `${colors.primary}14` }}
              >
                <Ionicons
                  name="qr-code-outline"
                  size={34}
                  color={colors.primary}
                />
              </div>
            </div>

            <h3 className={styles.emptyTitle}>No scans yet</h3>
            <p className={styles.emptySubtitle}>
              Scan smarter. Stay safe.
            </p>

            <Link href="/scanner" className={styles.scanButton}>
              <Ionicons name="scan-outline" size={15} color="currentColor" />
              <span>Start First Scan</span>
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}
