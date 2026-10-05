import React from "react";
import styles from "./home.module.css";

export default function HomeLoading() {
  return (
    <main className={styles.appFrame}>
      <div className={styles.page}>
        {/* Top Header Skeleton */}
        <header className={styles.header}>
          <div className={styles.headerLeft}>
            <div
              className={styles.skeletonBone}
              style={{ width: "160px", height: "26px", borderRadius: "8px" }}
            />
          </div>
          <div className={styles.headerRight}>
            <div
              className={styles.skeletonBone}
              style={{ width: "44px", height: "44px", borderRadius: "22px" }}
            />
          </div>
        </header>

        {/* Home Grid */}
        <div className={styles.homeGrid}>
          {/* Hero Scan Card Skeleton */}
          <div className={styles.heroCardCol}>
            <div className={styles.heroSkeleton}>
              <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
                <div
                  className={styles.skeletonBone}
                  style={{ width: "64px", height: "64px", borderRadius: "20px" }}
                />
                <div style={{ display: "flex", flexDirection: "column", gap: "8px", flex: 1 }}>
                  <div
                    className={styles.skeletonBone}
                    style={{ width: "60px", height: "14px", borderRadius: "6px" }}
                  />
                  <div
                    className={styles.skeletonBone}
                    style={{ width: "130px", height: "22px", borderRadius: "6px" }}
                  />
                </div>
              </div>
              <div
                className={styles.skeletonBone}
                style={{ width: "80%", height: "13px", borderRadius: "6px", marginTop: "24px" }}
              />
            </div>
          </div>

          {/* Recent Scans (5 Skeletons) */}
          <div className={styles.recentScansCol}>
            <div className={styles.sectionHeader} style={{ marginBottom: "14px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <span className={styles.sectionDot} />
                <div
                  className={styles.skeletonBone}
                  style={{ width: "120px", height: "18px", borderRadius: "6px" }}
                />
              </div>
            </div>

            <div className={styles.skeletonList}>
              {[0, 1, 2, 3, 4].map((i) => (
                <div key={i} className={styles.skeletonCard}>
                  <div className={styles.skeletonIconBox} />
                  <div className={styles.skeletonBody}>
                    <div
                      className={styles.skeletonBone}
                      style={{ height: "14px", width: "68%", marginBottom: "7px" }}
                    />
                    <div
                      className={styles.skeletonBone}
                      style={{ height: "11px", width: "42%", marginBottom: "8px" }}
                    />
                    <div
                      className={styles.skeletonBone}
                      style={{ height: "18px", width: "54px", borderRadius: "100px" }}
                    />
                  </div>
                  <div className={styles.skeletonRight}>
                    <div
                      className={styles.skeletonBone}
                      style={{ height: "10px", width: "38px" }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
