"use client";

// ─── Camera Controls ──────────────────────────────────────────────────────────
// 1:1 with features/scanner/hooks/useCameraControls.ts
// Single responsibility: camera hardware state, zoom, flash, the scan-line
// animation, and the focus-lifecycle lock that prevents double-scans.

import { useState, useRef, useEffect, useCallback } from "react";

export const FINDER_SIZE  = 270;
export const CORNER_SIZE  = 32;
export const CORNER_WIDTH = 4;

export const ZOOM_LEVELS = [
  { zoom: 0,    scale: 1,   label: "1×"   },
  { zoom: 0.25, scale: 1.5, label: "1.5×" },
  { zoom: 0.45, scale: 2,   label: "2×"   },
  { zoom: 0.65, scale: 3,   label: "3×"   },
] as const;

// ── Smart zoom thresholds ─────────────────────────────────────────────────────
const SMART_ZOOM_SMALL      = 0.18; // QR < 18 % of screen width  → boost to 1.5×
const SMART_ZOOM_VERY_SMALL = 0.08; // QR < 8 % of screen width   → boost to 2×
const SMART_ZOOM_RESET_MS   = 4000; // auto-reset after 4 s without another detection

export function useCameraControls() {
  const [scanned,     setScanned]     = useState(false);
  const [processing,  setProcessing]  = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [flashOn,     setFlashOnRaw]  = useState(false);

  const manualZoomRef = useRef<number>(ZOOM_LEVELS[0].zoom);
  const zoomRef       = useRef<number>(ZOOM_LEVELS[0].zoom);
  const [zoom,      setZoomState] = useState<number>(ZOOM_LEVELS[0].zoom);
  const [zoomLabel, setZoomLabel] = useState<string>(ZOOM_LEVELS[0].label);

  const setZoom = useCallback((value: number) => {
    zoomRef.current = value;
    setZoomState(value);
  }, []);

  const isSmartZoomedRef  = useRef(false);
  const smartZoomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scanLockRef   = useRef(false);
  const canScanRef    = useRef(true);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scanLineAnim = useRef(0);

  const _setFlash = useCallback((on: boolean) => {
    setFlashOnRaw(on);
  }, []);

  const toggleFlash = useCallback(() => {
    setFlashOnRaw((prev) => !prev);
  }, []);

  const _clearSmartZoomTimer = useCallback(() => {
    if (smartZoomTimerRef.current) {
      clearTimeout(smartZoomTimerRef.current);
      smartZoomTimerRef.current = null;
    }
  }, []);

  const _resetSmartZoomState = useCallback(() => {
    _clearSmartZoomTimer();
    isSmartZoomedRef.current = false;
    const base = manualZoomRef.current;
    if (zoomRef.current !== base) setZoom(base);
  }, [_clearSmartZoomTimer, setZoom]);

  // ── Focus lifecycle (mirrors useFocusEffect in useCameraControls.ts) ──────
  useEffect(() => {
    setScanned(false);
    setProcessing(false);
    setScanSuccess(false);
    scanLockRef.current = false;
    canScanRef.current  = true;
    _setFlash(false);

    const baseZoom  = ZOOM_LEVELS[0].zoom;
    const baseLabel = ZOOM_LEVELS[0].label;
    manualZoomRef.current = baseZoom;
    isSmartZoomedRef.current = false;
    _clearSmartZoomTimer();
    setZoom(baseZoom);
    setZoomLabel(baseLabel);

    focusTimerRef.current = setTimeout(() => {
      if (!scanLockRef.current) {
        canScanRef.current = true;
      }
    }, 200);

    return () => {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      _setFlash(false);
      _clearSmartZoomTimer();
    };
  }, [_clearSmartZoomTimer, _setFlash, setZoom]);

  const onScanSuccess = useCallback(() => {
    _clearSmartZoomTimer();
  }, [_clearSmartZoomTimer]);

  const resetScan = useCallback(() => {
    setScanned(false);
    setScanSuccess(false);
    setProcessing(false);
    scanLockRef.current = false;
    canScanRef.current  = true;
    _resetSmartZoomState();
  }, [_resetSmartZoomState]);

  const cycleZoom = useCallback(() => {
    const currentIdx = ZOOM_LEVELS.findIndex((z) => z.zoom === manualZoomRef.current);
    const next = ZOOM_LEVELS[(currentIdx + 1) % ZOOM_LEVELS.length];

    _clearSmartZoomTimer();
    isSmartZoomedRef.current = false;
    manualZoomRef.current = next.zoom;

    setZoom(next.zoom);
    setZoomLabel(next.label);
  }, [_clearSmartZoomTimer, setZoom]);

  const onQRBoundsDetected = useCallback(
    (bounds: { size?: { width?: number; height?: number } } | undefined | null) => {
      if (scanLockRef.current) return;
      if (!bounds?.size?.width) return;

      const screenWidth = typeof window !== "undefined" ? window.innerWidth || 390 : 390;
      const fraction    = bounds.size.width / screenWidth;
      const base        = manualZoomRef.current;

      let targetZoom = base;

      if (fraction < SMART_ZOOM_VERY_SMALL) {
        const level = ZOOM_LEVELS.find((l) => l.label === "2×");
        if (level) targetZoom = Math.max(base, level.zoom);
      } else if (fraction < SMART_ZOOM_SMALL) {
        const level = ZOOM_LEVELS.find((l) => l.label === "1.5×");
        if (level) targetZoom = Math.max(base, level.zoom);
      } else {
        if (isSmartZoomedRef.current) {
          isSmartZoomedRef.current = false;
          _clearSmartZoomTimer();
          setZoom(base);
        }
        return;
      }

      if (targetZoom !== zoomRef.current) {
        isSmartZoomedRef.current = true;
        setZoom(targetZoom);
      }

      _clearSmartZoomTimer();
      smartZoomTimerRef.current = setTimeout(() => {
        if (isSmartZoomedRef.current) {
          isSmartZoomedRef.current = false;
          setZoom(manualZoomRef.current);
        }
      }, SMART_ZOOM_RESET_MS);
    },
    [_clearSmartZoomTimer, setZoom]
  );

  return {
    scanned, setScanned,
    processing, setProcessing,
    scanSuccess, setScanSuccess,
    flashOn,
    toggleFlash,
    zoom,
    zoomLabel,
    scanLineAnim: scanLineAnim.current,
    scanLockRef, canScanRef,
    resetScan,
    cycleZoom,
    onScanSuccess,
    onQRBoundsDetected,
    setFlashOn: _setFlash,
  };
}
