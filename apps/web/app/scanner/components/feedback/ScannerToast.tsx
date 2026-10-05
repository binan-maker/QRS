"use client";

// ─── Scanner Toast ────────────────────────────────────────────────────────────
// 1:1 with features/scanner/components/feedback/ScannerToast.tsx

import React, { useEffect, useState } from "react";

const TOAST_DURATION = 3200;

export const TOAST_COLORS = {
  error: {
    bg: "#1a0a0a", border: "rgba(239,68,68,0.4)", icon: "#ef4444",
    text: "#fca5a5", track: "rgba(239,68,68,0.2)", fill: "#ef4444", iconChar: "✕",
  },
  warning: {
    bg: "#1a1200", border: "rgba(245,158,11,0.4)", icon: "#f59e0b",
    text: "#fde68a", track: "rgba(245,158,11,0.2)", fill: "#f59e0b", iconChar: "⚠",
  },
  info: {
    bg: "#0a1020", border: "rgba(0,212,255,0.35)", icon: "#00d4ff",
    text: "#a5f3ff", track: "rgba(0,212,255,0.2)", fill: "#00d4ff", iconChar: "ℹ",
  },
} as const;

export type ToastType = keyof typeof TOAST_COLORS;

export const toastContainerStyle: React.CSSProperties = {
  position: "absolute",
  left: 16,
  right: 16,
  zIndex: 30,
};

export function ScannerToast({
  message,
  type = "error",
  onDone,
}: {
  message: string;
  type?:   ToastType;
  onDone:  () => void;
}) {
  const [opacity, setOpacity]   = useState(0);
  const [progress, setProgress] = useState(0);
  const c = TOAST_COLORS[type];

  useEffect(() => {
    setOpacity(0);
    setProgress(0);

    // 1. Fade in (220ms)
    const fadeInReq = requestAnimationFrame(() => {
      setOpacity(1);
      setProgress(1);
    });

    // 2. After 220 + (TOAST_DURATION - 400) = 3020ms, start 280ms fade out
    const fadeOutTimer = setTimeout(() => {
      setOpacity(0);
    }, 220 + (TOAST_DURATION - 400));

    // 3. Complete at 220 + 2800 + 280 = 3300ms
    const doneTimer = setTimeout(() => {
      onDone();
    }, 220 + (TOAST_DURATION - 400) + 280);

    return () => {
      cancelAnimationFrame(fadeInReq);
      clearTimeout(fadeOutTimer);
      clearTimeout(doneTimer);
    };
  }, [message, onDone]);

  return (
    <div
      role="alert"
      style={{
        borderRadius: 16,
        overflow: "hidden",
        borderWidth: 1,
        borderStyle: "solid",
        backgroundColor: c.bg,
        borderColor: c.border,
        opacity,
        transition: opacity === 1 ? "opacity 220ms ease-out" : "opacity 280ms ease-in",
      }}
    >
      <div
        style={{
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          paddingLeft: 14,
          paddingRight: 14,
          paddingTop: 13,
          paddingBottom: 13,
          gap: 12,
        }}
      >
        <div
          style={{
            width: 32,
            height: 32,
            borderRadius: 16,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            backgroundColor: `${c.icon}22`,
          }}
        >
          <span
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: c.icon,
              lineHeight: 1,
            }}
          >
            {c.iconChar}
          </span>
        </div>
        <p
          style={{
            margin: 0,
            flex: 1,
            fontSize: 13,
            fontFamily: "var(--font-inter), Inter, sans-serif",
            fontWeight: 500,
            lineHeight: "18px",
            color: c.text,
            display: "-webkit-box",
            WebkitLineClamp: 2,
            WebkitBoxOrient: "vertical",
            overflow: "hidden",
          }}
        >
          {message}
        </p>
      </div>
      <div style={{ height: 3, width: "100%", backgroundColor: c.track }}>
        <div
          style={{
            height: 3,
            borderRadius: 2,
            backgroundColor: c.fill,
            width: progress === 1 ? "100%" : "0%",
            transition: `width ${TOAST_DURATION - 400}ms linear 220ms`,
          }}
        />
      </div>
    </div>
  );
}
