"use client";

// ─── Overlay Bottom Bar ───────────────────────────────────────────────────────
// Same design as mobile: Status pills + Gallery control

import React from "react";
import { Ionicons } from "../../icons";
import { SCANNER_GLOW } from "./constants";
import styles from "../../scanner.module.css";

interface Props {
  bottomInset:        number;
  zoom?:              number;
  zoomLabel?:         string;
  onCycleZoom?:       () => void;
  anonymousMode?:     boolean;
  onPickImage:        () => void;
  flashOn?:           boolean;
  onToggleFlash?:     () => void;
  facing?:            "back" | "front";
  lowLightSuggested?: boolean;
}

export default function OverlayBottomBar({
  bottomInset,
  zoom = 0,
  zoomLabel = "",
  onCycleZoom,
  anonymousMode = false,
  onPickImage,
}: Props) {
  return (
    <div
      className={styles.overlayBottomBar}
      style={{ paddingBottom: Math.max(bottomInset, 16) + 24 }}
    >
      {/* ── Status pills: zoom + anonymous ── */}
      {((zoom && zoom > 0) || anonymousMode) && (
        <div className={styles.pillRow}>
          {zoom > 0 && onCycleZoom && (
            <button
              type="button"
              onClick={onCycleZoom}
              className={styles.zoomPill}
              aria-label={`Zoom level ${zoomLabel}, tap to cycle`}
            >
              <Ionicons name="search-outline" size={13} color={SCANNER_GLOW} />
              <span className={styles.zoomText}>{zoomLabel}</span>
            </button>
          )}
          {anonymousMode && (
            <div className={styles.anonPill}>
              <Ionicons name="eye-off" size={13} color="#F5A623" />
              <span className={styles.anonPillText}>Private Active</span>
            </div>
          )}
        </div>
      )}

      {/* ── Main control row: Gallery ── */}
      <div className={styles.controlRow}>
        <div className={styles.btnGroup}>
          <button
            type="button"
            onClick={onPickImage}
            aria-label="Scan QR from gallery"
            className={styles.bottomGlassBtn}
          >
            <Ionicons name="images-outline" size={26} color="rgba(255,255,255,0.92)" />
          </button>
          <span className={styles.btnLabel}>Gallery</span>
        </div>
      </div>
    </div>
  );
}
