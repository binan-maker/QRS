import React from "react";
import styles from "./history.module.css";

export default function HistoryLoading() {
  return (
    <main className={styles.container} aria-busy="true">
      <div className={styles.inner}>
        {/* Top Header Skeleton */}
        <header className={styles.header}>
          <div className={styles.headerRow}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <div
                className={styles.skeletonBone}
                style={{ width: "36px", height: "36px", borderRadius: "50%" }}
              />
              <div
                className={styles.skeletonBone}
                style={{ width: "120px", height: "26px", borderRadius: "6px" }}
              />
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div
                className={styles.skeletonBone}
                style={{ width: "36px", height: "36px", borderRadius: "50%" }}
              />
              <div
                className={styles.skeletonBone}
                style={{ width: "36px", height: "36px", borderRadius: "50%" }}
              />
            </div>
          </div>

          {/* Filter Chips Skeleton */}
          <div style={{ display: "flex", gap: "8px", overflowX: "hidden", padding: "4px 0 10px" }}>
            {[80, 95, 75, 85, 70].map((w, idx) => (
              <div
                key={idx}
                className={styles.skeletonBone}
                style={{ width: `${w}px`, height: "32px", borderRadius: "100px", flexShrink: 0 }}
              />
            ))}
          </div>
        </header>

        {/* Scan List Cards Skeleton */}
        <div className={styles.listContainer}>
          {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div key={i} className={styles.skeletonCard}>
              <div className={styles.skeletonIconBox} />
              <div className={styles.skeletonBody}>
                <div
                  className={styles.skeletonBone}
                  style={{ height: "14px", width: "70%", marginBottom: "7px" }}
                />
                <div
                  className={styles.skeletonBone}
                  style={{ height: "11px", width: "45%", marginBottom: "8px" }}
                />
                <div
                  className={styles.skeletonBone}
                  style={{ height: "18px", width: "54px", borderRadius: "100px" }}
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
      </div>
    </main>
  );
}
