"use client";

import { useState, useRef, useCallback } from "react";

export const ZOOM_LEVELS = [
  { zoom: 0, scale: 1, label: "1×" },
  { zoom: 0.25, scale: 1.5, label: "1.5×" },
  { zoom: 0.45, scale: 2, label: "2×" },
  { zoom: 0.65, scale: 3, label: "3×" },
] as const;

const SMART_ZOOM_SMALL = 0.18;
const SMART_ZOOM_VERY_SMALL = 0.08;
const SMART_ZOOM_RESET_MS = 4000;

export function useWebCameraZoom(scanLockRef: React.MutableRefObject<boolean>) {
  const manualZoomRef = useRef<number>(ZOOM_LEVELS[0].zoom);
  const zoomRef = useRef<number>(ZOOM_LEVELS[0].zoom);
  const [zoom, setZoomState] = useState<number>(ZOOM_LEVELS[0].zoom);
  const [zoomLabel, setZoomLabel] = useState<string>(ZOOM_LEVELS[0].label);
  const isSmartZoomedRef = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setZoom = useCallback((val: number) => {
    zoomRef.current = val;
    setZoomState(val);
  }, []);

  const clearTimer = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null; }
  }, []);

  const resetZoom = useCallback(() => {
    clearTimer();
    isSmartZoomedRef.current = false;
    if (zoomRef.current !== manualZoomRef.current) setZoom(manualZoomRef.current);
  }, [clearTimer, setZoom]);

  const cycleZoom = useCallback(() => {
    const curIdx = ZOOM_LEVELS.findIndex((z) => z.zoom === manualZoomRef.current);
    const next = ZOOM_LEVELS[(curIdx + 1) % ZOOM_LEVELS.length];
    clearTimer();
    isSmartZoomedRef.current = false;
    manualZoomRef.current = next.zoom;
    setZoom(next.zoom);
    setZoomLabel(next.label);
  }, [clearTimer, setZoom]);

  const onQRBoundsDetected = useCallback((bounds?: { size?: { width?: number } } | null) => {
    if (scanLockRef.current || !bounds?.size?.width || typeof window === "undefined") return;
    const frac = bounds.size.width / window.innerWidth;
    const base = manualZoomRef.current;
    let target = base;

    if (frac < SMART_ZOOM_VERY_SMALL) {
      target = Math.max(base, ZOOM_LEVELS.find((l) => l.label === "2×")?.zoom ?? base);
    } else if (frac < SMART_ZOOM_SMALL) {
      target = Math.max(base, ZOOM_LEVELS.find((l) => l.label === "1.5×")?.zoom ?? base);
    } else {
      if (isSmartZoomedRef.current) resetZoom();
      return;
    }

    if (target !== zoomRef.current) {
      isSmartZoomedRef.current = true;
      setZoom(target);
    }
    clearTimer();
    timerRef.current = setTimeout(() => {
      if (isSmartZoomedRef.current) resetZoom();
    }, SMART_ZOOM_RESET_MS);
  }, [scanLockRef, clearTimer, resetZoom, setZoom]);

  return { zoom, zoomLabel, cycleZoom, onQRBoundsDetected, resetZoom, clearSmartZoom: clearTimer };
}
