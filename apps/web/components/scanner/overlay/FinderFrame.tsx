"use client";

import React from "react";
import styles from "@/app/scanner/scanner.module.css";

const CORNER_LEN = 28;
const CORNER_W = 3;
const CORNER_RADIUS = 12;

interface Props {
  cornerBreath?: number;
}

export default function FinderFrame({ cornerBreath }: Props) {
  const cornerStyle: React.CSSProperties = {
    position: "absolute",
    width: CORNER_LEN,
    height: CORNER_LEN,
    borderColor: "rgba(255,255,255,0.88)",
    borderStyle: "solid",
    ...(typeof cornerBreath === "number" ? { opacity: cornerBreath } : {}),
  };

  return (
    <div aria-hidden="true" className={styles.finderFrame}>
      {/* Top-left */}
      <span style={{ ...cornerStyle, top: 0, left: 0, borderTopWidth: CORNER_W, borderLeftWidth: CORNER_W, borderTopLeftRadius: CORNER_RADIUS }} />
      {/* Top-right */}
      <span style={{ ...cornerStyle, top: 0, right: 0, borderTopWidth: CORNER_W, borderRightWidth: CORNER_W, borderTopRightRadius: CORNER_RADIUS }} />
      {/* Bottom-left */}
      <span style={{ ...cornerStyle, bottom: 0, left: 0, borderBottomWidth: CORNER_W, borderLeftWidth: CORNER_W, borderBottomLeftRadius: CORNER_RADIUS }} />
      {/* Bottom-right */}
      <span style={{ ...cornerStyle, bottom: 0, right: 0, borderBottomWidth: CORNER_W, borderRightWidth: CORNER_W, borderBottomRightRadius: CORNER_RADIUS }} />
    </div>
  );
}
