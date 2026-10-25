"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import { isWebSupabaseConfigured } from "@/lib/supabase";
import {
  fetchUserScans,
  deleteUserScan,
  type ScanItem,
} from "@/lib/scan-history";
import {
  HistoryItemCard,
  HistoryHeader,
  HistoryEmptyState,
  HistorySkeleton,
} from "@/components/history";
import { BottomTabBar } from "@/components/navigation/BottomTabBar";
import { groupByDate } from "@features/history/utils/date-utils";
import { buildSearchIndex, matchesSearchIndexed } from "@features/history/utils/search-utils";
import type { ListRow } from "@features/history/types";
import styles from "./history.module.css";

export default function HistoryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const [scans, setScans] = useState<ScanItem[]>([]);
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [cloudError, setCloudError] = useState(false);

  // Search state
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement | null>(null);

  // Debounce search query input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Focus input when search bar opens
  useEffect(() => {
    if (searchVisible) {
      setTimeout(() => searchInputRef.current?.focus(), 30);
    }
  }, [searchVisible]);

  // Read URL search parameter if redirected from desktop top search bar
  useEffect(() => {
    if (typeof window !== "undefined") {
      const q = new URLSearchParams(window.location.search).get("q");
      if (q) {
        setSearchQuery(q);
        setSearchVisible(true);
      }
    }
  }, []);

  const handleBack = useCallback(() => {
    if (typeof window !== "undefined" && window.history.length > 1) {
      router.back();
    } else {
      router.push("/");
    }
  }, [router]);

  // Load scans from local cache and sync with cloud
  const loadData = useCallback(
    async (force = false) => {
      try {
        setCloudError(false);
        const items = await fetchUserScans(user?.id, force);
        setScans(items);
      } catch {
        if (isWebSupabaseConfigured()) {
          setCloudError(true);
        }
      } finally {
        setLoading(false);
      }
    },
    [user?.id]
  );

  // Hydration-safe client initialization
  useEffect(() => {
    setMounted(true);
    try {
      const storageKey = user?.id ? `local_scan_history_${user.id}` : "binro_recent_scans";
      const raw = localStorage.getItem(storageKey) || localStorage.getItem("local_scan_history");
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setScans(parsed);
          setLoading(false);
        }
      }
    } catch {}

    loadData(false);
  }, [user?.id, loadData]);

  // Throttled window focus & cross-tab storage listener
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

  // Search indexing and filtering
  const searchIndex = useMemo(() => buildSearchIndex(scans as any), [scans]);

  const searchedItems = useMemo(() => {
    const q = debouncedQuery.trim();
    if (!q) return scans;
    return scans.filter((item) =>
      matchesSearchIndexed(item as any, searchIndex, q)
    );
  }, [scans, searchIndex, debouncedQuery]);

  // Group by date matching mobile history
  const listRows: ListRow[] = useMemo(
    () => groupByDate(searchedItems as any),
    [searchedItems]
  );

  // Optimistic deletion with rollback
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

  let itemCardIndex = 0;

  return (
    <main className={styles.container}>
      <div className={styles.inner}>
        <HistoryHeader
          searchVisible={searchVisible}
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          onOpenSearch={() => setSearchVisible(true)}
          onCloseSearch={() => {
            setSearchVisible(false);
            setSearchQuery("");
          }}
          onBack={handleBack}
          searchInputRef={searchInputRef}
          showCloudError={Boolean(user && cloudError)}
          onRetryCloud={() => loadData(true)}
          resultsCount={searchedItems.length}
        />

        {/* Content Area */}
        {!mounted || loading ? (
          <HistorySkeleton count={8} />
        ) : !user ? (
          <HistoryEmptyState isGuest />
        ) : searchedItems.length === 0 ? (
          <HistoryEmptyState searchQuery={searchQuery} />
        ) : (
          <div className={styles.listContainer}>
            {listRows.map((row) => {
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

              const idx = itemCardIndex++;
              return (
                <HistoryItemCard
                  key={row.item.id}
                  item={row.item as any}
                  index={idx}
                  animate={false}
                  onDelete={handleDelete}
                  showTime
                />
              );
            })}
          </div>
        )}
      </div>

      <BottomTabBar />
    </main>
  );
}
