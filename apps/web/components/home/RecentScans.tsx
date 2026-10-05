"use client";

import React, { useState, useEffect, useCallback, useRef } from "react";
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

  // Instant zero-delay cached scans initialization
  const [scans, setScans] = useState<ScanItem[]>(() => {
    if (typeof window === "undefined") return [];
    try {
      const keys = [
        "binro_recent_scans",
        "local_scan_history",
        "binro_scan_history",
        "binro_scans",
      ];
      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            return parsed;
          }
        }
      }
    } catch {}
    return [];
  });

  const [loading, setLoading] = useState(() => scans.length === 0);
  const hasLoadedRef = useRef(scans.length > 0);

  const loadScans = useCallback(async () => {
    try {
      if (!hasLoadedRef.current) {
        setLoading(true);
      }
      const items = await fetchUserScans(user?.id);
      setScans(items);
      hasLoadedRef.current = true;
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

  const recentItems = scans.slice(0, 5);

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
          <div className={styles.skeletonList}>
            {[0, 1, 2, 3, 4].map((i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonIconBox} />
                <div className={styles.skeletonBody}>
                  <div
                    className={styles.skeletonBone}
                    style={{ height: "14px", width: "68%", marginBottom: "7px" }}
                  />
                  <div
                    className={styles.skeletonBone}
                    style={{ height: "11px", width: "42%", marginBottom: "8px" }}
                  />
                  <div
                    className={styles.skeletonBone}
                    style={{ height: "18px", width: "54px", borderRadius: "100px" }}
                  />
                </div>
                <div className={styles.skeletonRight}>
                  <div className={styles.skeletonBone} style={{ height: "10px", width: "38px" }} />
                </div>
              </div>
            ))}
          </div>
        ) : recentItems.length > 0 ? (
          <div className={styles.recentListFadeIn}>
            {recentItems.map((item, index) => (
              <HistoryItemCard
                key={item.id}
                item={item}
                index={index}
                animate={false}
                showTime={true}
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
