"use client";

// ─── Camera Unavailable Banner ────────────────────────────────────────────────
// Responsive presentation for Web: Desktop & Mobile

import React from "react";
import { Ionicons } from "../../icons";
import styles from "../../scanner.module.css";

export type CameraErrorType = "unavailable" | "inuse";

export function CameraUnavailableBanner({
  onPickImage,
  onRetry,
  errorType,
}: {
  onPickImage: () => void;
  onRetry:     () => void;
  errorType:   CameraErrorType;
}) {
  const isInUse = errorType === "inuse";
  return (
    <div className={styles.unavailableContainer}>
      <div className={`${styles.unavailableIconWrap} ${isInUse ? styles.unavailableIconWrapBlue : ""}`}>
        <Ionicons name="camera-outline" size={44} color={isInUse ? "#00d4ff" : "#f59e0b"} />
      </div>
      <h2 className={`${styles.unavailableTitle} ${isInUse ? styles.unavailableTitleBlue : ""}`}>
        {isInUse ? "Camera in Use" : "Camera Unavailable"}
      </h2>
      <p className={styles.unavailableSubtitle}>
        {isInUse
          ? "Your camera is currently accessed by another application. Close that app and click Try Again, or upload a QR image directly from your computer."
          : "The camera could not be started in your browser. You can click Try Again, or choose a QR code image directly from your computer."}
      </p>

      <div className={styles.unavailableActions}>
        <button
          type="button"
          onClick={onRetry}
          className={`${styles.unavailableBtn} ${styles.unavailableBtnPrimary}`}
        >
          <Ionicons name="refresh-outline" size={18} color="#000" />
          <span>Try Again</span>
        </button>

        <button
          type="button"
          onClick={onPickImage}
          className={`${styles.unavailableBtn} ${styles.unavailableBtnSecondary}`}
        >
          <Ionicons name="cloud-upload-outline" size={18} color="#00d4ff" />
          <span>Upload QR Image</span>
        </button>
      </div>
    </div>
  );
}
