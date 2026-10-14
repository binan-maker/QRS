import React from "react";
import styles from "./HistorySkeleton.module.css";

interface HistorySkeletonProps {
  count?: number;
}

export function HistorySkeleton({ count = 8 }: HistorySkeletonProps) {
  const items = Array.from({ length: count }, (_, i) => i);

  return (
    <div className={styles.listContainer} aria-busy="true" aria-label="Loading scan history">
      {items.map((i) => (
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
  );
}
