"use client";

// ─── Finder Frame ─────────────────────────────────────────────────────────────
// 1:1 with features/scanner/components/overlay/FinderFrame.tsx

import React from "react";
import { FINDER_SIZE } from "../../hooks/useCameraControls";
import styles from "../../scanner.module.css";

// Corner geometry
const CORNER_LEN    = 28;
const CORNER_W      = 3;
const CORNER_RADIUS = 12;   // visibly rounded tips

const CORNER_DEFAULT = "rgba(255,255,255,0.88)";

interface Props {
  cornerBreath?: number;
}

export default function FinderFrame({ cornerBreath }: Props) {
  const baseCornerStyle: React.CSSProperties = {
    position:        "absolute",
    backgroundColor: CORNER_DEFAULT,
    ...(typeof cornerBreath === "number" ? { opacity: cornerBreath } : {}),
  };

  return (
    <div
      aria-hidden="true"
      className={styles.finderFrame}
    >
      {/* ── Top-left corner ── */}
      <span
        className={styles.cornerBar}
        style={{
          ...baseCornerStyle,
          top:                     0,
          left:                    0,
          width:                   CORNER_LEN,
          height:                  CORNER_W,
          borderTopLeftRadius:     CORNER_RADIUS,
          borderTopRightRadius:    CORNER_RADIUS / 3,
          borderBottomRightRadius: CORNER_RADIUS / 3,
        }}
      />
      <span
        className={styles.cornerBar}
        style={{
          ...baseCornerStyle,
          top:                     0,
          left:                    0,
          width:                   CORNER_W,
          height:                  CORNER_LEN,
          borderTopLeftRadius:     CORNER_RADIUS,
          borderBottomLeftRadius:  CORNER_RADIUS / 3,
          borderBottomRightRadius: CORNER_RADIUS / 3,
        }}
      />

      {/* ── Top-right corner ── */}
      <span
        className={styles.cornerBar}
        style={{
          ...baseCornerStyle,
          top:                    0,
          right:                  0,
          width:                  CORNER_LEN,
          height:                 CORNER_W,
          borderTopRightRadius:   CORNER_RADIUS,
          borderTopLeftRadius:    CORNER_RADIUS / 3,
          borderBottomLeftRadius: CORNER_RADIUS / 3,
        }}
      />
      <span
        className={styles.cornerBar}
        style={{
          ...baseCornerStyle,
          top:                     0,
          right:                   0,
          width:                   CORNER_W,
          height:                  CORNER_LEN,
          borderTopRightRadius:    CORNER_RADIUS,
          borderBottomRightRadius: CORNER_RADIUS / 3,
          borderBottomLeftRadius:  CORNER_RADIUS / 3,
        }}
      />

      {/* ── Bottom-left corner ── */}
      <span
        className={styles.cornerBar}
        style={{
          ...baseCornerStyle,
          bottom:                  0,
          left:                    0,
          width:                   CORNER_LEN,
          height:                  CORNER_W,
          borderBottomLeftRadius:  CORNER_RADIUS,
          borderBottomRightRadius: CORNER_RADIUS / 3,
          borderTopRightRadius:    CORNER_RADIUS / 3,
        }}
      />
      <span
        className={styles.cornerBar}
        style={{
          ...baseCornerStyle,
          bottom:                 0,
          left:                   0,
          width:                  CORNER_W,
          height:                 CORNER_LEN,
          borderBottomLeftRadius: CORNER_RADIUS,
          borderTopLeftRadius:    CORNER_RADIUS / 3,
          borderTopRightRadius:   CORNER_RADIUS / 3,
        }}
      />

      {/* ── Bottom-right corner ── */}
      <span
        className={styles.cornerBar}
        style={{
          ...baseCornerStyle,
          bottom:                  0,
          right:                   0,
          width:                   CORNER_LEN,
          height:                  CORNER_W,
          borderBottomRightRadius: CORNER_RADIUS,
          borderBottomLeftRadius:  CORNER_RADIUS / 3,
          borderTopLeftRadius:     CORNER_RADIUS / 3,
        }}
      />
      <span
        className={styles.cornerBar}
        style={{
          ...baseCornerStyle,
          bottom:                  0,
          right:                   0,
          width:                   CORNER_W,
          height:                  CORNER_LEN,
          borderBottomRightRadius: CORNER_RADIUS,
          borderTopRightRadius:    CORNER_RADIUS / 3,
          borderTopLeftRadius:     CORNER_RADIUS / 3,
        }}
      />
    </div>
  );
}
