import React from "react";
import styles from "./feedback.module.css";

export default function FeedbackLoading() {
  return (
    <main className={styles.container} aria-busy="true">
      <div className={styles.inner}>
        {/* Navigation Bar Skeleton */}
        <header className={styles.navBar}>
          <div className="ytSkeleton" style={{ width: "40px", height: "40px", borderRadius: "12px" }} />
          <div className="ytSkeleton" style={{ width: "130px", height: "24px", borderRadius: "6px" }} />
          <div style={{ width: "40px" }} />
        </header>

        {/* Form Card Skeleton */}
        <div className={styles.formCard} style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <div>
            <div className="ytSkeleton" style={{ width: "120px", height: "14px", marginBottom: "12px" }} />
            <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: "10px" }}>
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="ytSkeleton" style={{ height: "42px", borderRadius: "12px" }} />
              ))}
            </div>
          </div>

          <div>
            <div className="ytSkeleton" style={{ width: "90px", height: "14px", marginBottom: "8px" }} />
            <div className="ytSkeleton" style={{ width: "100%", height: "46px", borderRadius: "12px" }} />
          </div>

          <div>
            <div className="ytSkeleton" style={{ width: "110px", height: "14px", marginBottom: "8px" }} />
            <div className="ytSkeleton" style={{ width: "100%", height: "130px", borderRadius: "12px" }} />
          </div>

          <div className="ytSkeleton" style={{ width: "100%", height: "50px", borderRadius: "14px", marginTop: "10px" }} />
        </div>
      </div>
    </main>
  );
}
