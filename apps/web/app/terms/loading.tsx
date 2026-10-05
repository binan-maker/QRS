import React from "react";
import styles from "../legal.module.css";

export default function TermsLoading() {
  return (
    <main className={styles.container} aria-busy="true">
      <div className={styles.inner}>
        {/* Navigation Bar Skeleton */}
        <header className={styles.navBar}>
          <div className="ytSkeleton" style={{ width: "38px", height: "38px", borderRadius: "12px" }} />
          <div className="ytSkeleton" style={{ width: "100px", height: "18px", borderRadius: "6px" }} />
          <div style={{ width: "38px" }} />
        </header>

        {/* Header Block Skeleton */}
        <div style={{ marginBottom: "24px" }}>
          <div className="ytSkeleton" style={{ width: "240px", height: "32px", borderRadius: "8px", marginBottom: "12px" }} />
          <div className="ytSkeleton" style={{ width: "55%", height: "14px", borderRadius: "4px" }} />
        </div>

        {/* Highlight Box Skeleton */}
        <div
          className={styles.highlightBox}
          style={{ display: "flex", flexDirection: "column", gap: "10px", marginBottom: "28px" }}
        >
          <div className="ytSkeleton" style={{ width: "160px", height: "16px", borderRadius: "4px" }} />
          <div className="ytSkeleton" style={{ width: "100%", height: "14px", borderRadius: "4px" }} />
          <div className="ytSkeleton" style={{ width: "80%", height: "14px", borderRadius: "4px" }} />
        </div>

        {/* Article Card Skeleton */}
        <div className={styles.articleCard} style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          {[1, 2, 3].map((i) => (
            <div key={i} style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div className="ytSkeleton" style={{ width: "180px", height: "20px", borderRadius: "6px" }} />
              <div className="ytSkeleton" style={{ width: "100%", height: "14px", borderRadius: "4px" }} />
              <div className="ytSkeleton" style={{ width: "95%", height: "14px", borderRadius: "4px" }} />
              <div className="ytSkeleton" style={{ width: "92%", height: "14px", borderRadius: "4px" }} />
            </div>
          ))}
        </div>
      </div>
    </main>
  );
}
