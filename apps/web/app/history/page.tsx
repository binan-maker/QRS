"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Ionicons } from "@/lib/mobile-icons";
import { useAuth } from "@/lib/auth-context";
import {
  fetchUserScans,
  deleteUserScan,
  type ScanItem,
} from "@/lib/scan-history";
import { HistoryItemCard } from "@/components/history";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { groupByDate } from "@features/history/utils/date-utils";
import { buildSearchIndex, matchesSearchIndexed } from "@features/history/utils/search-utils";
import type { ListRow } from "@features/history/types";
import styles from "./history.module.css";

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const handleBack = () => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  };

  // Safe SSR hydration state
  const [scans, setScans] = useState<ScanItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cloudError, setCloudError] = useState(false);

  // Search state
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Focus search input when searchVisible turns true
  useEffect(() => {
    if (searchVisible) {
      setTimeout(() => searchInputRef.current?.focus(), 30);
    }
  }, [searchVisible]);

  // Load scans from local cache then fetch fresh data
  const loadData = useCallback(
    async (force = false) => {
      try {
        setCloudError(false);
        const items = await fetchUserScans(user?.id, force);
        setScans(items);
      } catch {
        setCloudError(true);
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Hydration-safe client initialization
  useEffect(() => {
    setMounted(true);
    // Instant populate from localStorage on client mount
    try {
      const keys = [
        user?.id ? `local_scan_history_${user.id}` : null,
        "binro_recent_scans",
        "local_scan_history",
        "binro_scan_history",
      ].filter(Boolean) as string[];

      for (const k of keys) {
        const raw = localStorage.getItem(k);
        if (raw) {
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setScans(parsed);
            setLoading(false);
            break;
          }
        }
      }
    } catch {}

    loadData(false);
  }, [user?.id, loadData]);

  // Throttled window focus & storage listener
  useEffect(() => {
    let lastFocus = Date.now();

    const handleFocus = () => {
      const now = Date.now();
      if (now - lastFocus > 8000) {
        lastFocus = now;
        loadData(false);
      }
    };

    const handleStorageChange = () => {
      loadData(true);
    };

    window.addEventListener("focus", handleFocus);
    window.addEventListener("storage", handleStorageChange);
    window.addEventListener("binro:scan_added", handleStorageChange);

    return () => {
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("storage", handleStorageChange);
      window.removeEventListener("binro:scan_added", handleStorageChange);
    };
  }, [loadData, authLoading]);

  // Search indexing
  const searchIndex = useMemo(() => buildSearchIndex(scans as any), [scans]);

  const searchedItems = useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q) return scans;
    return scans.filter((item) =>
      matchesSearchIndexed(item as any, searchIndex, q)
    );
  }, [scans, searchIndex, debouncedQuery]);

  // Group by date matching mobile date-utils
  const listRows: ListRow[] = useMemo(
    () => groupByDate(searchedItems as any),
    [searchedItems]
  );

  // Optimistic deletion with state rollback on error
  const handleDelete = useCallback(
    async (item: ScanItem) => {
      const previousScans = scans;
      setScans((prev) => prev.filter((i) => i.id !== item.id));

      try {
        await deleteUserScan(user?.id, item.id, item.qrCodeId, item.content);
      } catch (err) {
        console.error("[history] Deletion failed, rolling back:", err);
        setScans(previousScans);
        setCloudError(true);
      }
    },
    [user?.id, scans]
  );

  return (
    <main className={styles.container}>
      <div className={styles.inner}>
        {/* ── Top Bar / HistoryHeader ── */}
        <header className={styles.headerWrap}>
          {searchVisible ? (
            <div className={styles.searchBar}>
              <button
                type="button"
                onClick={() => {
                  setSearchVisible(false);
                  setSearchQuery("");
                }}
                className={styles.searchBackBtn}
                aria-label="Back"
                title="Back"
              >
                <Ionicons name="chevron-back" size={20} color="var(--text)" />
              </button>
              <Ionicons name="search-outline" size={17} color="var(--text-muted)" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search history…"
                className={styles.searchInput}
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
              />
              <button
                type="button"
                onClick={() => {
                  setSearchVisible(false);
                  setSearchQuery("");
                }}
                className={styles.searchCancel}
              >
                Cancel
              </button>
            </div>
          ) : (
            <div className={styles.headerRow}>
              <div className={styles.headerLeft}>
                <button
                  type="button"
                  onClick={handleBack}
                  className={styles.backBtn}
                  aria-label="Back"
                  title="Back"
                >
                  <Ionicons name="chevron-back" size={20} color="var(--text)" />
                </button>
                <h1 className={styles.title}>Scan History</h1>
              </div>
              <div className={styles.headerActions}>
                <button
                  type="button"
                  onClick={() => setSearchVisible(true)}
                  className={styles.actionBtn}
                  aria-label="Open search"
                  title="Search"
                >
                  <Ionicons name="search-outline" size={18} color="var(--text-secondary)" />
                </button>
                <Link
                  href="/settings?from=history"
                  className={styles.actionBtn}
                  aria-label="Settings"
                  title="Settings"
                >
                  <Ionicons name="settings-outline" size={18} color="var(--text-secondary)" />
                </Link>
              </div>
            </div>
          )}

          {/* Cloud Error Banner */}
          {user && cloudError && !searchVisible && (
            <div
              onClick={() => loadData(true)}
              className={styles.cloudErrorBanner}
              role="alert"
              title="Tap to retry"
            >
              <Ionicons name="cloud-offline-outline" size={15} color="var(--warning)" />
              <p className={styles.cloudErrorText}>
                Couldn't sync cloud history — tap to retry
              </p>
            </div>
          )}

          {/* Search Results Count Row */}
          {searchVisible && searchQuery.trim() && searchedItems.length > 0 && (
            <div className={styles.searchResultsRow}>
              <p className={styles.searchResultsText}>
                {searchedItems.length} result{searchedItems.length !== 1 ? "s" : ""} for "{searchQuery}"
              </p>
            </div>
          )}
        </header>

        {/* ── Main Content Area ── */}
        {!mounted || loading ? (
          <div className={styles.listContainer}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonIconBox} />
                <div className={styles.skeletonBody}>
                  <div
                    className={styles.skeletonBone}
                    style={{ height: "14px", width: "68%", marginBottom: "8px" }}
                  />
                  <div
                    className={styles.skeletonBone}
                    style={{ height: "11px", width: "42%", marginBottom: "8px" }}
                  />
                  <div
                    className={styles.skeletonBone}
                    style={{ height: "18px", width: "56px", borderRadius: "100px" }}
                  />
                </div>
                <div className={styles.skeletonRight}>
                  <div
                    className={styles.skeletonBone}
                    style={{ height: "10px", width: "38px" }}
                  />
                </div>
              </div>
            ))}
          </div>
        ) : !user ? (
          /* Empty state when not signed in */
          <div className={styles.emptyWrap}>
            <div className={styles.emptyIconWrap}>
              <Ionicons name="person-outline" size={32} color="var(--primary)" />
            </div>
            <h2 className={styles.emptyTitle}>Sign in to view history</h2>
            <p className={styles.emptySub}>
              Your scan history is saved to your account and synced across all your devices.
            </p>
            <Link href="/login?returnUrl=/history" className={styles.signInBtn}>
              <Ionicons name="log-in-outline" size={17} color="#ffffff" />
              <span>Sign In</span>
            </Link>
          </div>
        ) : searchedItems.length === 0 ? (
          /* Empty state for search or zero items */
          <div className={styles.emptyWrap}>
            <div className={styles.emptyIconWrapMuted}>
              <Ionicons
                name={searchQuery.trim() ? "search-outline" : "time-outline"}
                size={32}
                color="var(--text-muted)"
              />
            </div>
            <h2 className={styles.emptyTitle}>
              {searchQuery.trim()
                ? `No results for "${searchQuery}"`
                : "No scans yet"}
            </h2>
            <p className={styles.emptySub}>
              {searchQuery.trim()
                ? "Try searching by domain, name, or QR content"
                : "Scanned QR codes will appear here"}
            </p>
          </div>
        ) : (
          /* Grouped Date List */
          <div className={styles.listContainer}>
            {(() => {
              let itemIndex = 0;
              return listRows.map((row) => {
                if (row.kind === "header") {
                  return (
                    <div key={row.id} className={styles.sectionHeader}>
                      <span className={styles.sectionLabel}>{row.label}</span>
                      <span className={styles.sectionLine} />
                      <div className={styles.sectionBadge}>
                        <span className={styles.sectionBadgeText}>{row.count}</span>
                      </div>
                    </div>
                  );
                }

                const currentIndex = itemIndex++;
                return (
                  <HistoryItemCard
                    key={row.item.id}
                    item={row.item as any}
                    index={currentIndex}
                    animate={false}
                    onDelete={handleDelete}
                    showTime
                  />
                );
              });
            })()}
          </div>
        )}
      </div>

      <BottomTabBar />
    </main>
  );
}
