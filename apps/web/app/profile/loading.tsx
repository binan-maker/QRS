import React from "react";
import styles from "./profile.module.css";

export default function ProfileLoading() {
  return (
    <main className={styles.container} aria-busy="true">
      <div className={styles.inner}>
        {/* Top Bar Skeleton */}
        <header className={styles.topBar}>
          <div className="ytSkeleton" style={{ width: "110px", height: "26px", borderRadius: "8px" }} />
          <div className="ytSkeleton" style={{ width: "36px", height: "36px", borderRadius: "10px" }} />
        </header>

        {/* Avatar & User Info Skeleton */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", marginBottom: "28px" }}>
          <div
            className="ytSkeleton"
            style={{ width: "84px", height: "84px", borderRadius: "50%", marginBottom: "14px" }}
          />
          <div
            className="ytSkeleton"
            style={{ width: "150px", height: "22px", borderRadius: "6px", marginBottom: "8px" }}
          />
          <div
            className="ytSkeleton"
            style={{ width: "95px", height: "14px", borderRadius: "6px" }}
          />
        </div>

        {/* Profile Card 1: Account Details */}
        <div className={styles.card} style={{ marginBottom: "16px" }}>
          <div className="ytSkeleton" style={{ width: "120px", height: "14px", marginBottom: "16px" }} />
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            {[1, 2, 3].map((i) => (
              <div key={i} style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                <div className="ytSkeleton" style={{ width: "65px", height: "11px" }} />
                <div className="ytSkeleton" style={{ width: "80%", height: "18px" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Profile Card 2: Preferences */}
        <div className={styles.card} style={{ marginBottom: "16px" }}>
          <div className="ytSkeleton" style={{ width: "100px", height: "14px", marginBottom: "16px" }} />
          <div style={{ display: "flex", gap: "10px" }}>
            <div className="ytSkeleton" style={{ flex: 1, height: "40px", borderRadius: "10px" }} />
            <div className="ytSkeleton" style={{ flex: 1, height: "40px", borderRadius: "10px" }} />
            <div className="ytSkeleton" style={{ flex: 1, height: "40px", borderRadius: "10px" }} />
          </div>
        </div>

        {/* Sign Out Button Skeleton */}
        <div
          className="ytSkeleton"
          style={{ width: "100%", height: "46px", borderRadius: "14px", marginTop: "8px" }}
        />
      </div>
    </main>
  );
}
