"use client";

// ─── Overlay Animations ───────────────────────────────────────────────────────
// 1:1 with features/scanner/hooks/useOverlayAnimations.ts
// Note: On web, CSS @keyframes (corner-breath in scanner.module.css) animates
// corner opacity on the compositor thread without triggering 60fps React re-renders
// that would compete with live camera QR frame decoding.

export function useOverlayAnimations() {
  return {
    cornerBreath: undefined as number | undefined,
    dotBlink:     1,
    scanReady:    1,
  };
}
