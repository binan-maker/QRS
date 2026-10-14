import React from "react";
import { HistorySkeleton } from "@/components/history";
import styles from "./history.module.css";

export default function HistoryLoading() {
  return (
    <main className={styles.container} aria-busy="true">
      <div className={styles.inner}>
        {/* Top Header Skeleton */}
        <header className={styles.headerWrap}>
          <div className={styles.headerRow}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                className={styles.skeletonBone}
                style={{ width: "36px", height: "36px", borderRadius: "12px" }}
              />
              <div
                className={styles.skeletonBone}
                style={{ width: "130px", height: "24px", borderRadius: "6px" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                className={styles.skeletonBone}
                style={{ width: "36px", height: "36px", borderRadius: "12px" }}
              />
              <div
                className={styles.skeletonBone}
                style={{ width: "36px", height: "36px", borderRadius: "12px" }}
              />
            </div>
          </div>
        </header>

        {/* Scan List Cards Skeleton */}
        <HistorySkeleton count={8} />
      </div>
    </main>
  );
}
