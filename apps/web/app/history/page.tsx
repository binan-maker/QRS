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
import {
  FILTERS,
  PAYMENT_TYPES,
  CONTACT_TYPES,
  ALL_KNOWN_TYPES,
} from "@features/history/utils/constants";
import { toggleFilter, itemMatchesFilters } from "@features/history/utils/filter-utils";
import { buildSearchIndex, matchesSearchIndexed } from "@features/history/utils/search-utils";
import type { FilterKey, ActiveFilters, ListRow } from "@features/history/types";
import styles from "./history.module.css";

const FILTER_ICONS: Record<string, string> = {
  all: "apps-outline",
  payment: "card-outline",
  url: "globe-outline",
  contact: "person-outline",
  wifi: "wifi-outline",
  others: "ellipsis-horizontal-circle-outline",
};

const FILTER_ICONS_ACTIVE: Record<string, string> = {
  all: "apps",
  payment: "card",
  url: "globe",
  contact: "person",
  wifi: "wifi",
  others: "ellipsis-horizontal-circle",
};

const PAYMENT_SET = new Set<string>(PAYMENT_TYPES);
const CONTACT_SET = new Set<string>(CONTACT_TYPES);

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [scans, setScans] = useState<ScanItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [cloudError, setCloudError] = useState(false);

  // Search state (1:1 with mobile useSearch)
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Filter state (1:1 with mobile useHistory)
  const [activeFilters, setActiveFilters] = useState<ActiveFilters>(["all"]);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 200);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Focus search input when searchVisible turns true
  useEffect(() => {
    if (searchVisible) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  }, [searchVisible]);

  // Load scans
  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setCloudError(false);
      const items = await fetchUserScans(user?.id);
      setScans(items);
    } catch {
      setCloudError(true);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    loadData();

    const handleRefresh = () => {
      loadData();
    };

    window.addEventListener("focus", handleRefresh);
    window.addEventListener("storage", handleRefresh);
    window.addEventListener("binro:scan_added", handleRefresh);

    return () => {
      window.removeEventListener("focus", handleRefresh);
      window.removeEventListener("storage", handleRefresh);
      window.removeEventListener("binro:scan_added", handleRefresh);
    };
  }, [loadData, authLoading]);

  // Compute filter options & counts matching mobile getActiveFilters
  const filterOptions = useMemo(() => {
    let paymentCount = 0;
    let urlCount = 0;
    let contactCount = 0;
    let wifiCount = 0;
    let othersCount = 0;

    for (let i = 0; i < scans.length; i++) {
      const ct = (scans[i].contentType || "").toLowerCase();
      if (ct === "url") {
        urlCount++;
        continue;
      }
      if (ct === "wifi") {
        wifiCount++;
        continue;
      }
      if (PAYMENT_SET.has(ct) || scans[i].content?.toLowerCase().startsWith("upi://")) {
        paymentCount++;
        continue;
      }
      if (CONTACT_SET.has(ct)) {
        contactCount++;
        continue;
      }
      if (!ALL_KNOWN_TYPES.has(ct)) {
        othersCount++;
      }
    }

    const counts: Record<string, number> = {
      all: scans.length,
      payment: paymentCount,
      url: urlCount,
      contact: contactCount,
      wifi: wifiCount,
      others: othersCount,
    };

    return FILTERS.map((f) => ({
      ...f,
      count: counts[f.key] ?? 0,
    }));
  }, [scans]);

  const handleFilterChange = (key: FilterKey) => {
    setActiveFilters((prev) => toggleFilter(prev, key));
  };

  // Filter scans by active filters
  const displayItems = useMemo(() => {
    const contentFilters = activeFilters.filter((k) => k !== "all");
    if (contentFilters.length === 0) return scans;
    return scans.filter((item) => itemMatchesFilters(item.contentType, contentFilters));
  }, [activeFilters, scans]);

  // Search indexing
  const searchIndex = useMemo(() => buildSearchIndex(displayItems as any), [displayItems]);

  const searchedItems = useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q) return displayItems;
    return displayItems.filter((item) =>
      matchesSearchIndexed(item as any, searchIndex, q)
    );
  }, [displayItems, searchIndex, debouncedQuery]);

  // Group by date matching mobile date-utils
  const listRows: ListRow[] = useMemo(
    () => groupByDate(searchedItems as any),
    [searchedItems]
  );

  const handleDelete = useCallback(
    async (item: ScanItem) => {
      setScans((prev) => prev.filter((i) => i.id !== item.id));
      try {
        await deleteUserScan(user?.id, item.id, item.qrCodeId);
      } catch {
        loadData();
      }
    },
    [user?.id, loadData]
  );

  const isFiltered = !activeFilters.includes("all") && activeFilters.length > 0;

  return (
    <main className={styles.container}>
      <div className={styles.inner}>
        {/* ── Top Bar / HistoryHeader (1:1 with mobile HistoryHeader.tsx) ── */}
        <header className={styles.headerWrap}>
          {searchVisible ? (
            <div className={styles.searchBar}>
              <Ionicons name="search-outline" size={17} color="var(--text-muted)" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search URLs, payments, text…"
                className={styles.searchInput}
                autoComplete="off"
                autoCorrect="off"
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
              <h1 className={styles.title}>Scan History</h1>
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

          {/* Cloud Error Banner (1:1 with mobile CloudErrorBanner.tsx) */}
          {user && cloudError && !searchVisible && (
            <div
              onClick={loadData}
              className={styles.cloudErrorBanner}
              role="alert"
              title="Tap to retry"
            >
              <Ionicons name="cloud-offline-outline" size={15} color="var(--warning)" />
              <p className={styles.cloudErrorText}>
                Couldn't load cloud history — tap to retry
              </p>
            </div>
          )}

          {/* Filter Bar (1:1 with mobile FilterBar.tsx) */}
          {!searchVisible && (
            <div className={styles.filterScroll} role="tablist" aria-label="History categories">
              {filterOptions.map((f) => {
                const isActive = activeFilters.includes(f.key);
                const iconName = (isActive
                  ? FILTER_ICONS_ACTIVE[f.key]
                  : FILTER_ICONS[f.key]) as any;
                const showCount = f.key === "all" && typeof f.count === "number" && f.count > 0;

                return (
                  <button
                    key={f.key}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => handleFilterChange(f.key)}
                    className={`${styles.chip} ${isActive ? styles.chipActive : ""}`}
                  >
                    <Ionicons
                      name={iconName || "apps-outline"}
                      size={13}
                      color={isActive ? "#ffffff" : "var(--text-secondary)"}
                    />
                    <span>{f.label}</span>
                    {showCount && (
                      <span className={styles.chipBadge}>
                        {f.count! > 99 ? "99+" : f.count}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}

          {/* Search Results Row (1:1 with mobile SearchResultsRow.tsx) */}
          {searchVisible && searchQuery.trim() && searchedItems.length > 0 && (
            <div className={styles.searchResultsRow}>
              <p className={styles.searchResultsText}>
                {searchedItems.length} result{searchedItems.length !== 1 ? "s" : ""} for "{searchQuery}"
              </p>
            </div>
          )}
        </header>

        {/* ── Main Content Area ── */}
        {loading ? (
          <div className={styles.listContainer}>
            {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
              <div key={i} className={styles.skeletonCard}>
                <div className={styles.skeletonBody}>
                  <div className={styles.skeletonBone} style={{ height: "14px", width: "68%", marginBottom: "7px" }} />
                  <div className={styles.skeletonBone} style={{ height: "11px", width: "45%", marginBottom: "9px" }} />
                  <div className={styles.skeletonBone} style={{ height: "20px", width: "52px", borderRadius: "100px" }} />
                </div>
                <div className={styles.skeletonRight}>
                  <div className={styles.skeletonBone} style={{ height: "10px", width: "42px" }} />
                  <div className={styles.skeletonBone} style={{ width: "28px", height: "28px", borderRadius: "9px" }} />
                </div>
              </div>
            ))}
          </div>
        ) : !user ? (
          /* Empty state when not signed in (1:1 with mobile EmptyState.tsx !user) */
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
          /* Empty state for search, filter, or zero items (1:1 with mobile EmptyState.tsx) */
          <div className={styles.emptyWrap}>
            <div className={styles.emptyIconWrapMuted}>
              <Ionicons
                name={
                  searchQuery.trim()
                    ? "search-outline"
                    : isFiltered
                    ? "filter-outline"
                    : "time-outline"
                }
                size={32}
                color="var(--text-muted)"
              />
            </div>
            <h2 className={styles.emptyTitle}>
              {searchQuery.trim()
                ? `No results for "${searchQuery}"`
                : isFiltered
                ? "No scans match these filters"
                : "No scans yet"}
            </h2>
            <p className={styles.emptySub}>
              {searchQuery.trim()
                ? "Try searching by URL, payment name, or QR content"
                : isFiltered
                ? "Try removing some filters to see more results"
                : "Scanned QR codes will appear here"}
            </p>
          </div>
        ) : (
          /* Grouped Date List (1:1 with mobile groupByDate + SectionHeader + HistoryItem) */
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
                    animate={true}
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
