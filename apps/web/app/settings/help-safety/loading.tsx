import React from "react";
import styles from "./help-safety.module.css";

export default function HelpSafetyLoading() {
  return (
    <main className={styles.container} aria-busy="true">
      <div className={styles.inner}>
        {/* Top Nav Bar Skeleton */}
        <header className={styles.navBar}>
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              backgroundColor: "var(--surface-light)",
            }}
          />
          <div
            style={{
              width: "120px",
              height: "22px",
              borderRadius: "6px",
              backgroundColor: "var(--surface-light)",
            }}
          />
          <div style={{ width: "38px" }} />
        </header>

        {/* Hero Card Skeleton */}
        <div className={styles.heroCard}>
          <div className={styles.heroHeaderRow}>
            <div
              style={{
                width: "42px",
                height: "42px",
                borderRadius: "12px",
                backgroundColor: "var(--surface-light)",
              }}
            />
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              <div
                style={{
                  width: "180px",
                  height: "18px",
                  borderRadius: "6px",
                  backgroundColor: "var(--surface-light)",
                }}
              />
              <div
                style={{
                  width: "110px",
                  height: "12px",
                  borderRadius: "4px",
                  backgroundColor: "var(--surface-light)",
                }}
              />
            </div>
          </div>
          <div
            style={{
              width: "100%",
              height: "36px",
              borderRadius: "6px",
              backgroundColor: "var(--surface-light)",
              marginTop: "4px",
            }}
          />
        </div>

        {/* Resources Section Skeleton */}
        <div className={styles.section}>
          <div
            style={{
              width: "160px",
              height: "12px",
              borderRadius: "4px",
              backgroundColor: "var(--surface-light)",
              marginBottom: "4px",
            }}
          />
          <div className={styles.cardGroup}>
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "15px 18px",
                  borderBottom: i < 4 ? "1px solid var(--surface-border)" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                  <div
                    style={{
                      width: "38px",
                      height: "38px",
                      borderRadius: "10px",
                      backgroundColor: "var(--surface-light)",
                    }}
                  />
                  <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                    <div
                      style={{
                        width: "120px",
                        height: "15px",
                        borderRadius: "5px",
                        backgroundColor: "var(--surface-light)",
                      }}
                    />
                    <div
                      style={{
                        width: "190px",
                        height: "11px",
                        borderRadius: "5px",
                        backgroundColor: "var(--surface-light)",
                      }}
                    />
                  </div>
                </div>
                <div
                  style={{
                    width: "16px",
                    height: "16px",
                    borderRadius: "4px",
                    backgroundColor: "var(--surface-light)",
                  }}
                />
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
