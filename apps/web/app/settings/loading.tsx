import React from "react";
import styles from "./settings.module.css";

export default function SettingsLoading() {
  return (
    <main className={styles.container} aria-busy="true">
      <div className={styles.inner}>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: "50vh",
            width: "100%",
          }}
        >
          <div
            style={{
              width: "36px",
              height: "36px",
              borderRadius: "50%",
              border: "3px solid var(--surface-border)",
              borderTopColor: "var(--primary)",
              animation: "spin 0.8s linear infinite",
            }}
          />
        </div>
      </div>
    </main>
  );
}
