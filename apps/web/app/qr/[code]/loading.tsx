import styles from "./qr.module.css";

export default function Loading() {
  return (
    <main className={styles.page} data-testid="qr-loading-state" aria-busy="true">
      <div className={styles.inner}>
        {/* ── Nav Bar Skeleton (1:1 with mobile LoadingSkeleton.tsx) ── */}
        <header className={styles.navBar}>
          <div className={styles.navLeft}>
            <div className={`${styles.skeleton}`} style={{ width: 40, height: 40, borderRadius: 20 }} />
            <div className={`${styles.skeleton}`} style={{ width: 110, height: 20, borderRadius: 6 }} />
          </div>
          <div className={styles.navActions}>
            <div className={`${styles.skeleton}`} style={{ width: 40, height: 40, borderRadius: 20 }} />
            <div className={`${styles.skeleton}`} style={{ width: 40, height: 40, borderRadius: 20 }} />
          </div>
        </header>

        {/* ── Content Skeleton (1:1 with mobile LoadingSkeleton.tsx) ── */}
        <div className={styles.scrollContent}>
          <div className={styles.mainGrid}>
            <div className={styles.leftCol}>
              {/* Content Card Skeleton */}
              <div className={styles.skeletonCard} style={{ gap: 12, padding: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <div className={styles.skeleton} style={{ width: 140, height: 20, borderRadius: 6 }} />
                  <div className={styles.skeleton} style={{ width: 64, height: 28, borderRadius: 8 }} />
                </div>
                <div className={styles.skeleton} style={{ height: 38, borderRadius: 10 }} />
                <div className={styles.skeleton} style={{ height: 42, borderRadius: 12 }} />
              </div>

              {/* Trust Score Card Skeleton */}
              <div className={styles.skeletonCard} style={{ gap: 16, padding: 18 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
                  <div className={styles.skeleton} style={{ width: 82, height: 82, borderRadius: 41, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 8 }}>
                    <div className={styles.skeleton} style={{ width: 100, height: 18, borderRadius: 6 }} />
                    <div className={styles.skeleton} style={{ width: 70, height: 22, borderRadius: 100 }} />
                    <div className={styles.skeleton} style={{ width: "100%", height: 5, borderRadius: 3 }} />
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8 }}>
                  <div className={styles.skeleton} style={{ flex: 1, height: 58, borderRadius: 14 }} />
                  <div className={styles.skeleton} style={{ flex: 1, height: 58, borderRadius: 14 }} />
                </div>
              </div>

              {/* Rate Grid Skeleton */}
              <div style={{ marginBottom: 16 }}>
                <div className={styles.skeleton} style={{ width: 110, height: 18, borderRadius: 6, marginBottom: 10 }} />
                <div style={{ display: "flex", gap: 8 }}>
                  <div className={styles.skeleton} style={{ flex: 1, height: 64, borderRadius: 14 }} />
                  <div className={styles.skeleton} style={{ flex: 1, height: 64, borderRadius: 14 }} />
                  <div className={styles.skeleton} style={{ flex: 1, height: 64, borderRadius: 14 }} />
                </div>
              </div>
            </div>

            <div className={styles.rightCol}>
              {/* Comments Section Skeleton */}
              <div>
                <div className={styles.skeleton} style={{ width: 100, height: 18, borderRadius: 6, marginBottom: 12 }} />
                <div className={styles.skeleton} style={{ height: 54, borderRadius: 14, marginBottom: 14 }} />
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{ display: "flex", gap: 10, padding: "10px 0" }}>
                    <div className={styles.skeleton} style={{ width: 34, height: 34, borderRadius: 17, flexShrink: 0 }} />
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                      <div className={styles.skeleton} style={{ width: 100, height: 12, borderRadius: 4 }} />
                      <div className={styles.skeleton} style={{ width: "90%", height: 12, borderRadius: 4 }} />
                      <div className={styles.skeleton} style={{ width: "60%", height: 12, borderRadius: 4 }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
