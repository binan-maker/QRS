import React from "react";
import styles from "./settings.module.css";

export default function SettingsLoading() {
  return (
    <main className={styles.container} aria-busy="true">
      <div className={styles.inner}>
        {/* Top Nav Bar Skeleton */}
        <header className={styles.navBar}>
          <div className="ytSkeleton" style={{ width: "36px", height: "36px", borderRadius: "10px" }} />
          <div className="ytSkeleton" style={{ width: "90px", height: "22px", borderRadius: "6px" }} />
          <div style={{ width: "36px" }} />
        </header>

        {/* Account Profile Card Skeleton */}
        <div
          className={styles.accountCard}
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            padding: "16px 18px",
            marginBottom: "20px",
          }}
        >
          <div
            className="ytSkeleton"
            style={{ width: "48px", height: "48px", borderRadius: "24px", flexShrink: 0 }}
          />
          <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: "8px" }}>
            <div className="ytSkeleton" style={{ width: "130px", height: "16px", borderRadius: "6px" }} />
            <div className="ytSkeleton" style={{ width: "180px", height: "12px", borderRadius: "6px" }} />
          </div>
          <div className="ytSkeleton" style={{ width: "18px", height: "18px", borderRadius: "6px" }} />
        </div>

        {/* Settings Group 1 Skeleton */}
        <div style={{ marginBottom: "22px" }}>
          <div className="ytSkeleton" style={{ width: "90px", height: "12px", marginBottom: "10px", marginLeft: "4px" }} />
          <div className={styles.menuCard} style={{ display: "flex", flexDirection: "column" }}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "15px 16px",
                  borderBottom: i < 4 ? "1px solid var(--surface-border)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div className="ytSkeleton" style={{ width: "32px", height: "32px", borderRadius: "8px" }} />
                  <div className="ytSkeleton" style={{ width: "110px", height: "15px", borderRadius: "6px" }} />
                </div>
                <div className="ytSkeleton" style={{ width: "36px", height: "20px", borderRadius: "10px" }} />
              </div>
            ))}
          </div>
        </div>

        {/* Settings Group 2 Skeleton */}
        <div style={{ marginBottom: "22px" }}>
          <div className="ytSkeleton" style={{ width: "110px", height: "12px", marginBottom: "10px", marginLeft: "4px" }} />
          <div className={styles.menuCard} style={{ display: "flex", flexDirection: "column" }}>
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "15px 16px",
                  borderBottom: i < 3 ? "1px solid var(--surface-border)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                  <div className="ytSkeleton" style={{ width: "32px", height: "32px", borderRadius: "8px" }} />
                  <div className="ytSkeleton" style={{ width: "130px", height: "15px", borderRadius: "6px" }} />
                </div>
                <div className="ytSkeleton" style={{ width: "16px", height: "16px", borderRadius: "4px" }} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
