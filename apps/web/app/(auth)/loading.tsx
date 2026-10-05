import React from "react";
import styles from "./auth.module.css";

export default function AuthLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <div className={styles.inner}>
        {/* Brand & Title Skeleton */}
        <div className={styles.brandBlock}>
          <div
            className="ytSkeleton"
            style={{ width: "110px", height: "28px", borderRadius: "8px", marginBottom: "4px" }}
          />
          <div
            className="ytSkeleton"
            style={{ width: "32px", height: "3px", borderRadius: "2px", marginBottom: "6px" }}
          />
          <div
            className="ytSkeleton"
            style={{ width: "160px", height: "22px", borderRadius: "6px" }}
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
