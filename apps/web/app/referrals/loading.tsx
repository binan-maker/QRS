import React from "react";
import styles from "./referrals.module.css";

const boneStyle: React.CSSProperties = {
  backgroundColor: "var(--skeleton-base)",
  backgroundImage: "linear-gradient(90deg, var(--skeleton-base) 0%, var(--skeleton-highlight) 50%, var(--skeleton-base) 100%)",
  backgroundSize: "200% 100%",
  animation: "referralsShimmer 1.4s ease-in-out infinite",
};

export default function ReferralsLoading() {
  return (
    <div className={styles.pageFrame}>
      <main className={styles.container}>
        {/* Top Bar Skeleton */}
        <header className={styles.topBar}>
          <div className={styles.topBarLeft}>
            <div
              style={{
                width: "40px",
                height: "40px",
                borderRadius: "12px",
                ...boneStyle,
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              <div
                style={{
                  width: "160px",
                  height: "24px",
                  borderRadius: "6px",
                  ...boneStyle,
                }}
              />
              <div
                style={{
                  width: "240px",
                  height: "14px",
                  borderRadius: "4px",
                  ...boneStyle,
                }}
              />
            </div>
          </div>
          <div className={styles.topBarRight}>
            <div
              style={{
                width: "120px",
                height: "36px",
                borderRadius: "10px",
                ...boneStyle,
              }}
            />
          </div>
        </header>

        {/* 2-Column Responsive Layout */}
        <div className={styles.referralLayoutGrid}>
          {/* Left Column Skeleton */}
          <div className={styles.columnLeft}>
            <div
              style={{
                height: "260px",
                borderRadius: "20px",
                marginBottom: "20px",
                ...boneStyle,
              }}
            />
            <div
              style={{
                height: "160px",
                borderRadius: "20px",
                ...boneStyle,
              }}
            />
          </div>

          {/* Right Column Skeleton */}
          <div className={styles.columnRight}>
            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "12px",
                marginBottom: "20px",
              }}
            >
              {[0, 1, 2, 3].map((i) => (
                <div
                  key={i}
                  style={{
                    height: "90px",
                    borderRadius: "16px",
                    ...boneStyle,
                  }}
                />
              ))}
            </div>
            <div
              style={{
                height: "320px",
                borderRadius: "20px",
                ...boneStyle,
              }}
            />
          </div>
        </div>
      </main>
      <style>{`
        @keyframes referralsShimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }
      `}</style>
    </div>
  );
}
