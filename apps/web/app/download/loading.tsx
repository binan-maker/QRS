import React from "react";
import styles from "./download.module.css";

export default function DownloadLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <div className={styles.inner}>
        {/* Navigation Bar Skeleton */}
        <header className={styles.navBar}>
          <div className="ytSkeleton" style={{ width: "36px", height: "36px", borderRadius: "10px" }} />
          <div className="ytSkeleton" style={{ width: "120px", height: "20px", borderRadius: "6px" }} />
          <div style={{ width: "36px" }} />
        </header>

        {/* Hero Card Skeleton */}
        <div
          className={styles.heroCard}
          style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "28px 20px" }}
        >
          <div
            className="ytSkeleton"
            style={{ width: "76px", height: "76px", borderRadius: "20px", marginBottom: "18px" }}
          />
          <div
            className="ytSkeleton"
            style={{ width: "180px", height: "26px", borderRadius: "8px", marginBottom: "10px" }}
          />
          <div
            className="ytSkeleton"
            style={{ width: "240px", height: "14px", borderRadius: "6px", marginBottom: "24px" }}
          />

          {/* Feature list skeletons */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px", marginBottom: "28px" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                <div className="ytSkeleton" style={{ width: "28px", height: "28px", borderRadius: "14px" }} />
                <div className="ytSkeleton" style={{ flex: 1, height: "14px", borderRadius: "4px" }} />
              </div>
            ))}
          </div>

          {/* Store button skeletons */}
          <div style={{ width: "100%", display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="ytSkeleton" style={{ width: "100%", height: "54px", borderRadius: "14px" }} />
            <div className="ytSkeleton" style={{ width: "100%", height: "54px", borderRadius: "14px" }} />
          </div>
        </div>
      </div>
    </main>
  );
}
