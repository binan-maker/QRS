import React from "react";
import styles from "./guide.module.css";

export default function GuideLoading() {
  return (
    <main className={styles.container} aria-busy="true">
      <div className={styles.inner}>
        {/* Navigation Bar Skeleton */}
        <header className={styles.navBar}>
          <div className="ytSkeleton" style={{ width: "38px", height: "38px", borderRadius: "10px" }} />
          <div className="ytSkeleton" style={{ width: "140px", height: "22px", borderRadius: "6px" }} />
          <div style={{ width: "38px" }} />
        </header>

        {/* Lead Text Skeleton */}
        <div style={{ margin: "16px 0 20px", display: "flex", flexDirection: "column", gap: "8px" }}>
          <div className="ytSkeleton" style={{ width: "100%", height: "16px", borderRadius: "4px" }} />
          <div className="ytSkeleton" style={{ width: "85%", height: "16px", borderRadius: "4px" }} />
        </div>

        <hr className={styles.divider} />

        {/* Section 1 Skeleton */}
        <div style={{ margin: "24px 0" }}>
          <div className="ytSkeleton" style={{ width: "180px", height: "22px", marginBottom: "16px" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div className="ytSkeleton" style={{ width: "100%", height: "14px" }} />
            <div className="ytSkeleton" style={{ width: "95%", height: "14px" }} />
            <div className="ytSkeleton" style={{ width: "90%", height: "14px" }} />
          </div>
        </div>

        <hr className={styles.divider} />

        {/* Section 2 Skeleton */}
        <div style={{ margin: "24px 0" }}>
          <div className="ytSkeleton" style={{ width: "160px", height: "22px", marginBottom: "16px" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            <div className="ytSkeleton" style={{ width: "100%", height: "14px" }} />
            <div className="ytSkeleton" style={{ width: "92%", height: "14px" }} />
            <div className="ytSkeleton" style={{ width: "88%", height: "14px" }} />
          </div>
        </div>
      </div>
    </main>
  );
}
