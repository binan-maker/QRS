import React from "react";
import Link from "next/link";
import { Ionicons } from "@/lib/mobile-icons";
import styles from "./HistoryEmptyState.module.css";

interface HistoryEmptyStateProps {
  isGuest?: boolean;
  searchQuery?: string;
}

export function HistoryEmptyState({ isGuest = false, searchQuery = "" }: HistoryEmptyStateProps) {
  if (isGuest) {
    return (
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
    );
  }

  const query = searchQuery.trim();

  return (
    <div className={styles.emptyWrap}>
      <div className={styles.emptyIconWrapMuted}>
        <Ionicons
          name={query ? "search-outline" : "time-outline"}
          size={32}
          color="var(--text-muted)"
        />
      </div>
      <h2 className={styles.emptyTitle}>
        {query ? `No results for "${query}"` : "No scans yet"}
      </h2>
      <p className={styles.emptySub}>
        {query
          ? "Try searching by domain, name, or QR content"
          : "Scanned QR codes will appear here"}
      </p>
    </div>
  );
}
