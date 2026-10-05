"use client";

// ─── Scanner Overlay ──────────────────────────────────────────────────────────
// Same design as mobile in all views, stretched across the entire screen

import React from "react";
import { useOverlayAnimations } from "../../hooks/useOverlayAnimations";
import FinderFrame from "./FinderFrame";
import OverlayTopBar from "./OverlayTopBar";
import OverlayBottomBar from "./OverlayBottomBar";
import styles from "../../scanner.module.css";

interface Props {
  topInset:           number;
  bottomInset:        number;
  zoom:               number;
  zoomLabel:          string;
  onCycleZoom:        () => void;
  scanned:            boolean;
  scanSuccess:        boolean;
  anonymousMode:      boolean;
  onToggleAnonymous:  () => void;
  onPickImage:        () => void;
  user:               any;
}

export default function ScannerOverlay({
  topInset,
  bottomInset,
  zoom,
  zoomLabel,
  onCycleZoom,
  scanned,
  scanSuccess,
  anonymousMode,
  onToggleAnonymous,
  onPickImage,
  user,
}: Props) {
  const anims = useOverlayAnimations();

  return (
    <div className={styles.scannerOverlay}>
      {/* Top bar — back btn | BinRo | private mode */}
      <OverlayTopBar
        topInset={topInset}
        anonymousMode={anonymousMode}
        onToggleAnonymous={onToggleAnonymous}
        user={user}
      />

      {/* Non-interactive center stack: title + finder + status */}
      <div className={styles.overlayNonInteractive}>
        <div className={styles.centerScannerStack}>
          {/* Primary title — above the finder, large and immediately readable */}
          <div className={styles.titleArea}>
            <h1 id="scanner-title" className={styles.titleText}>
              Scan a QR code
            </h1>
          </div>

          {/* Finder frame */}
          <div className={styles.finderFramePosition}>
            <FinderFrame cornerBreath={anims.cornerBreath} />
          </div>

          {/* Status feedback / hint — below finder */}
          {scanned && (
            <div className={styles.hintArea}>
              <p className={styles.hintText}>
                {scanSuccess ? "Code captured" : "Analyzing…"}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Bottom controls — Gallery + Status pills */}
      <OverlayBottomBar
        bottomInset={bottomInset}
        zoom={zoom}
        zoomLabel={zoomLabel}
        onCycleZoom={onCycleZoom}
        anonymousMode={anonymousMode}
        onPickImage={onPickImage}
      />
    </div>
  );
}
