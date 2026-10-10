import React from "react";
import styles from "./rewards.module.css";

export default function RewardsLoading() {
  return (
    <div className={styles.pageFrame}>
      <main className={styles.container}>
        {/* Top Header Skeleton */}
        <header className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                backgroundColor: "var(--surface-muted)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div
                style={{
                  width: "160px",
                  height: "24px",
                  borderRadius: "6px",
                  backgroundColor: "var(--surface-muted)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
              <div
                style={{
                  width: "220px",
                  height: "14px",
                  borderRadius: "4px",
                  backgroundColor: "var(--surface-muted)",
                  animation: "pulse 1.5s ease-in-out infinite",
                }}
              />
            </div>
          </div>
          <div className={styles.topBarRight}>
            <div
              style={{
                width: "110px",
                height: "36px",
                borderRadius: "10px",
                backgroundColor: "var(--surface-muted)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          </div>
        </header>

        {/* Milestone Banner Skeleton */}
        <div
          style={{
            height: "120px",
            borderRadius: "20px",
            backgroundColor: "var(--surface-muted)",
            animation: "pulse 1.5s ease-in-out infinite",
            marginBottom: "16px",
          }}
        />

        {/* Cards Grid Skeleton */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))",
            gap: "16px",
          }}
        >
          {[0, 1, 2, 3].map((i) => (
            <div
              key={i}
              style={{
                height: "340px",
                borderRadius: "20px",
                backgroundColor: "var(--surface-muted)",
                animation: "pulse 1.5s ease-in-out infinite",
              }}
            />
          ))}
        </div>
      </main>
    </div>
  );
}
