import React from "react";
import styles from "./download.module.css";

export default function DownloadLoading() {
  return (
    <main className={styles.page} aria-busy="true" aria-label="Loading download page">
      <div className={styles.inner}>
        {/* ── Top Navigation Bar Skeleton ── */}
        <header className={styles.navBar}>
          <div
            className={styles.skeletonBone}
            style={{ width: "38px", height: "38px", borderRadius: "19px" }}
          />
          <div
            className={styles.skeletonBone}
            style={{ width: "120px", height: "20px", margin: "0 auto", borderRadius: "6px" }}
          />
          <div className={styles.navSpacer} aria-hidden="true" />
        </header>

        {/* ── Brand Block Skeleton ── */}
        <div className={styles.brandBlock}>
          <div
            className={styles.skeletonBone}
            style={{ width: "100px", height: "32px", borderRadius: "8px" }}
          />
          <div
            className={styles.skeletonBone}
            style={{ width: "32px", height: "3px", borderRadius: "2px", margin: "4px 0" }}
          />
          <div
            className={styles.skeletonBone}
            style={{ width: "200px", height: "24px", borderRadius: "6px" }}
          />
          <div
            className={styles.skeletonBone}
            style={{ width: "240px", height: "14px", borderRadius: "4px", marginTop: "4px" }}
          />
        </div>

        {/* ── Main Card Skeleton ── */}
        <section className={styles.card}>
          <div
            className={styles.skeletonBone}
            style={{ width: "80px", height: "80px", borderRadius: "40px", marginBottom: "4px" }}
          />

          <div
            className={styles.skeletonBone}
            style={{ width: "190px", height: "22px", borderRadius: "6px", marginBottom: "8px" }}
          />

          {/* Official Store Buttons Skeleton */}
          <div className={styles.storeBadgesGroup}>
            <div
              className={styles.skeletonBone}
              style={{ height: "54px", width: "100%", borderRadius: "12px" }}
            />
            <div
              className={styles.skeletonBone}
              style={{ height: "54px", width: "100%", borderRadius: "12px" }}
            />
          </div>
        </section>

        {/* ── Footer Skeleton ── */}
        <div className={styles.footer}>
          <div
            className={styles.skeletonBone}
            style={{ width: "200px", height: "14px", borderRadius: "4px" }}
          />
        </div>
      </div>
    </main>
  );
}
