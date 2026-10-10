import React from "react";
import styles from "./profile.module.css";

export default function ProfileLoading() {
  return (
    <main className={styles.container} aria-busy="true">
      <div className={styles.inner}>
        {/* Top Bar Skeleton */}
        <header className={styles.topBar}>
          <div
            style={{
              width: "90px",
              height: "24px",
              borderRadius: "6px",
              backgroundColor: "var(--surface-light)",
            }}
          />
          <div
            style={{
              width: "38px",
              height: "38px",
              borderRadius: "10px",
              backgroundColor: "var(--surface-light)",
            }}
          />
        </header>

        <div className={styles.desktopLayout}>
          {/* Sidebar Column Skeleton */}
          <aside className={styles.sidebarCol}>
            <div className={styles.heroCard}>
              <div
                style={{
                  width: "88px",
                  height: "88px",
                  borderRadius: "50%",
                  backgroundColor: "var(--surface-light)",
                }}
              />
              <div
                style={{
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  gap: "6px",
                  width: "100%",
                }}
              >
                <div
                  style={{
                    width: "140px",
                    height: "22px",
                    borderRadius: "6px",
                    backgroundColor: "var(--surface-light)",
                  }}
                />
                <div
                  style={{
                    width: "180px",
                    height: "14px",
                    borderRadius: "4px",
                    backgroundColor: "var(--surface-light)",
                  }}
                />
              </div>

              {/* Action Button Skeleton */}
              <div
                style={{
                  width: "100%",
                  maxWidth: "200px",
                  height: "36px",
                  borderRadius: "9px",
                  backgroundColor: "var(--surface-light)",
                  marginTop: "6px",
                }}
              />
            </div>
          </aside>

          {/* Main Column Skeleton */}
          <section className={styles.mainCol}>
            {/* Account & Activity Section Skeleton */}
            <div className={styles.section}>
              <div
                style={{
                  width: "120px",
                  height: "12px",
                  borderRadius: "4px",
                  backgroundColor: "var(--surface-light)",
                  marginBottom: "4px",
                }}
              />
              <div className={styles.cardGroup}>
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "13px 18px",
                      borderBottom: i < 2 ? "1px solid var(--surface-border)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          backgroundColor: "var(--surface-light)",
                        }}
                      />
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <div
                          style={{
                            width: "110px",
                            height: "14px",
                            borderRadius: "5px",
                            backgroundColor: "var(--surface-light)",
                          }}
                        />
                        <div
                          style={{
                            width: "180px",
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

            {/* Community & Rewards Section Skeleton */}
            <div className={styles.section}>
              <div
                style={{
                  width: "150px",
                  height: "12px",
                  borderRadius: "4px",
                  backgroundColor: "var(--surface-light)",
                  marginBottom: "4px",
                }}
              />
              <div className={styles.cardGroup}>
                {[1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "13px 18px",
                      borderBottom: i < 2 ? "1px solid var(--surface-border)" : "none",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
                      <div
                        style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "10px",
                          backgroundColor: "var(--surface-light)",
                        }}
                      />
                      <div style={{ display: "flex", flexDirection: "column", gap: "5px" }}>
                        <div
                          style={{
                            width: "130px",
                            height: "14px",
                            borderRadius: "5px",
                            backgroundColor: "var(--surface-light)",
                          }}
                        />
                        <div
                          style={{
                            width: "180px",
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

            {/* Sign Out Button Skeleton */}
            <div
              style={{
                width: "100%",
                height: "46px",
                borderRadius: "12px",
                backgroundColor: "var(--surface-light)",
              }}
            />
          </section>
        </div>
      </div>
    </main>
  );
}
