import React from "react";
import styles from "./scanner.module.css";

export default function ScannerLoading() {
  return (
    <main className={styles.page} aria-busy="true">
      <div className={styles.scannerLayout}>
        <div className={styles.scannerRootBlack}>
          {/* Top Bar Skeleton */}
          <div
            style={{
              position: "absolute",
              top: 0,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "20px 24px",
              zIndex: 10,
            }}
          >
            <div
              className="ytSkeleton"
              style={{ width: "42px", height: "42px", borderRadius: "21px", background: "rgba(255,255,255,0.15)" }}
            />
            <div
              className="ytSkeleton"
              style={{ width: "120px", height: "36px", borderRadius: "18px", background: "rgba(255,255,255,0.15)" }}
            />
            <div
              className="ytSkeleton"
              style={{ width: "42px", height: "42px", borderRadius: "21px", background: "rgba(255,255,255,0.15)" }}
            />
          </div>

          {/* Central Finder Frame Skeleton */}
          <div
            style={{
              position: "absolute",
              inset: 0,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              justifyContent: "center",
              padding: "24px",
            }}
          >
            <div
              style={{
                width: "min(280px, 75vw)",
                height: "min(280px, 75vw)",
                borderRadius: "32px",
                border: "2px dashed rgba(255, 255, 255, 0.3)",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
              }}
            >
              <div
                className="ytSkeleton"
                style={{
                  width: "60px",
                  height: "60px",
                  borderRadius: "16px",
                  background: "rgba(255, 255, 255, 0.12)",
                }}
              />
            </div>
            <div
              className="ytSkeleton"
              style={{
                width: "160px",
                height: "14px",
                borderRadius: "6px",
                marginTop: "24px",
                background: "rgba(255, 255, 255, 0.15)",
              }}
            />
          </div>

          {/* Bottom Controls Bar Skeleton */}
          <div
            style={{
              position: "absolute",
              bottom: 0,
              left: 0,
              right: 0,
              display: "flex",
              justifyContent: "space-around",
              alignItems: "center",
              padding: "24px 32px 48px",
              zIndex: 10,
            }}
          >
            <div
              className="ytSkeleton"
              style={{ width: "48px", height: "48px", borderRadius: "24px", background: "rgba(255,255,255,0.15)" }}
            />
            <div
              className="ytSkeleton"
              style={{ width: "80px", height: "38px", borderRadius: "19px", background: "rgba(255,255,255,0.15)" }}
            />
            <div
              className="ytSkeleton"
              style={{ width: "48px", height: "48px", borderRadius: "24px", background: "rgba(255,255,255,0.15)" }}
            />
          </div>
        </div>
      </div>
    </main>
  );
}
