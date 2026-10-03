"use client";

// ─── Overlay Top Bar ──────────────────────────────────────────────────────────
// Same design as mobile: Back button | BinRo | Private mode toggle

import React from "react";
import { useRouter } from "next/navigation";
import { Ionicons } from "../../icons";
import { stopSharedCameraStream } from "../system/CameraView";
import styles from "../../scanner.module.css";

interface Props {
  topInset:          number;
  anonymousMode:     boolean;
  onToggleAnonymous: () => void;
  user:              any;
}

export default function OverlayTopBar({
  topInset,
  anonymousMode,
  onToggleAnonymous,
  user,
}: Props) {
  const router = useRouter();

  return (
    <header
      className={styles.overlayTopBar}
      style={{ paddingTop: topInset + 12 }}
    >
      {/* Back button */}
      <button
        type="button"
        onClick={() => {
          stopSharedCameraStream();
          router.replace("/");
        }}
        className={styles.topGlassBtn}
        aria-label="Go back"
      >
        <Ionicons name="chevron-back" size={22} color="rgba(255,255,255,0.92)" />
      </button>

      {/* Centered brand */}
      <div className={styles.topBrand}>
        <span className={styles.topBrandText}>BinRo</span>
      </div>

      {/* Private mode toggle */}
      {user ? (
        <button
          type="button"
          onClick={onToggleAnonymous}
          aria-label={anonymousMode ? "Disable private mode" : "Enable private mode"}
          aria-pressed={anonymousMode}
          className={`${styles.topGlassBtn} ${anonymousMode ? styles.topGlassBtnActive : ""}`}
        >
          <Ionicons
            name={anonymousMode ? "eye-off" : "eye-off-outline"}
            size={20}
            color={anonymousMode ? "#F5A623" : "rgba(255,255,255,0.8)"}
          />
        </button>
      ) : (
        <div className={styles.topSpacer} />
      )}
    </header>
  );
}
