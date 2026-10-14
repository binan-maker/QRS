import React from "react";
import Link from "next/link";
import { Ionicons } from "@/lib/mobile-icons";
import styles from "./HistoryHeader.module.css";

interface HistoryHeaderProps {
  searchVisible: boolean;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  onOpenSearch: () => void;
  onCloseSearch: () => void;
  onBack: () => void;
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  showCloudError: boolean;
  onRetryCloud: () => void;
  resultsCount: number;
}

export function HistoryHeader({
  searchVisible,
  searchQuery,
  onSearchChange,
  onOpenSearch,
  onCloseSearch,
  onBack,
  searchInputRef,
  showCloudError,
  onRetryCloud,
  resultsCount,
}: HistoryHeaderProps) {
  return (
    <header className={styles.headerWrap}>
      {searchVisible ? (
        <div className={styles.searchBar}>
          <button
            type="button"
            onClick={onCloseSearch}
            className={styles.searchBackBtn}
            aria-label="Back to normal view"
            title="Back"
          >
            <Ionicons name="chevron-back" size={20} color="var(--text)" />
          </button>
          <Ionicons name="search-outline" size={17} color="var(--text-muted)" />
          <input
            ref={searchInputRef}
            type="text"
            value={searchQuery}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Search history…"
            className={styles.searchInput}
            autoComplete="off"
            autoCorrect="off"
            autoCapitalize="off"
            spellCheck={false}
          />
          <button
            type="button"
            onClick={onCloseSearch}
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
              onClick={onBack}
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
              onClick={onOpenSearch}
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
      {showCloudError && !searchVisible && (
        <div
          onClick={onRetryCloud}
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
      {searchVisible && searchQuery.trim() && resultsCount > 0 && (
        <div className={styles.searchResultsRow}>
          <p className={styles.searchResultsText}>
            {resultsCount} result{resultsCount !== 1 ? "s" : ""} for "{searchQuery.trim()}"
          </p>
        </div>
      )}
    </header>
  );
}
