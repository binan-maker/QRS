import React from "react";
import styles from "./trust-scores.module.css";

export default function TrustScoresLoading() {
  return (
    <main className={styles.container} aria-busy="true">
      <div className={styles.inner}>
        {/* Navigation Bar Skeleton */}
        <header className={styles.navBar}>
          <div className="ytSkeleton" style={{ width: "38px", height: "38px", borderRadius: "10px" }} />
          <div className="ytSkeleton" style={{ width: "160px", height: "22px", borderRadius: "6px" }} />
          <div style={{ width: "38px" }} />
        </header>

        {/* Lead Text Skeleton */}
        <div style={{ margin: "16px 0 20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div className="ytSkeleton" style={{ width: "95%", height: "16px", borderRadius: "4px" }} />
          <div className="ytSkeleton" style={{ width: "80%", height: "16px", borderRadius: "4px" }} />
        </div>

        <hr className={styles.divider} />

        {/* Section 1 Skeleton */}
        <div style={{ margin: "24px 0" }}>
          <div className="ytSkeleton" style={{ width: "140px", height: "20px", marginBottom: "16px" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <div className="ytSkeleton" style={{ width: "80px", height: "16px" }} />
                  <div className="ytSkeleton" style={{ width: "60px", height: "16px" }} />
                </div>
                <div className="ytSkeleton" style={{ width: "90%", height: "14px" }} />
              </div>
            ))}
          </div>
        </div>

        <hr className={styles.divider} />

        {/* Section 2 Skeleton */}
        <div style={{ margin: "24px 0" }}>
          <div className="ytSkeleton" style={{ width: "200px", height: "20px", marginBottom: "16px" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <div className="ytSkeleton" style={{ width: "100%", height: "14px" }} />
            <div className="ytSkeleton" style={{ width: "94%", height: "14px" }} />
            <div className="ytSkeleton" style={{ width: "88%", height: "14px" }} />
          </div>
        </div>
      </div>
    </main>
  );
}
