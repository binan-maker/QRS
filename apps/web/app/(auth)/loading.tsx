import React from "react";
import styles from "./auth.module.css";

export default function AuthLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <div className={styles.inner}>
        {/* Navigation Back Button Skeleton */}
        <header className={styles.navBar}>
          <div className="ytSkeleton" style={{ width: "38px", height: "38px", borderRadius: "19px" }} />
        </header>

        {/* Brand & Title Skeleton */}
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", margin: "16px 0 24px" }}>
          <div
            className="ytSkeleton"
            style={{ width: "52px", height: "52px", borderRadius: "14px", marginBottom: "16px" }}
          />
          <div
            className="ytSkeleton"
            style={{ width: "160px", height: "26px", borderRadius: "8px", marginBottom: "8px" }}
          />
          <div
            className="ytSkeleton"
            style={{ width: "210px", height: "14px", borderRadius: "4px" }}
          />
        </div>

        {/* Auth Form Card Skeleton */}
        <div
          className={styles.card}
          style={{
            display: "flex",
            flexDirection: "column",
            gap: "18px",
            padding: "24px 20px",
          }}
        >
          <div>
            <div className="ytSkeleton" style={{ width: "70px", height: "13px", marginBottom: "8px" }} />
            <div className="ytSkeleton" style={{ width: "100%", height: "48px", borderRadius: "12px" }} />
          </div>

          <div>
            <div className="ytSkeleton" style={{ width: "80px", height: "13px", marginBottom: "8px" }} />
            <div className="ytSkeleton" style={{ width: "100%", height: "48px", borderRadius: "12px" }} />
          </div>

          <div
            className="ytSkeleton"
            style={{ width: "100%", height: "48px", borderRadius: "12px", marginTop: "8px" }}
          />

          <div
            className="ytSkeleton"
            style={{ width: "100%", height: "1px", margin: "8px 0" }}
          />

          <div
            className="ytSkeleton"
            style={{ width: "100%", height: "48px", borderRadius: "12px" }}
          />
        </div>

        {/* Footer Link Skeleton */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: "24px" }}>
          <div className="ytSkeleton" style={{ width: "180px", height: "14px", borderRadius: "4px" }} />
        </div>
      </div>
    </main>
  );
}
