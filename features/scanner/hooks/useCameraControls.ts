// ─── Camera Controls ──────────────────────────────────────────────────────────
// Single responsibility: camera hardware state, zoom, flash, the scan-line
// animation, and the focus-lifecycle lock that prevents double-scans.
//
// Smart auto-zoom: when a QR code is detected with a small apparent size
// (bounds.size.width / screenWidth), the camera smoothly zooms in up to 1.5×
// or 2× so the decode is reliable. The boost is automatic and resets after the
// scan succeeds or after a 4 s timeout. Manual zoom (cycleZoom) always takes
// precedence and cancels any active smart-zoom boost.

import { useState, useRef, useEffect, useCallback } from "react";
import { Animated, Dimensions, Easing, Platform } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Haptics from "@/shared/utils/haptics";

export const FINDER_SIZE  = 270;
export const CORNER_SIZE  = 32;
export const CORNER_WIDTH = 4;

// Zoom levels the user can cycle through manually.
// iOS: start at 0.02 so we land on the main 1× optical lens, not ultra-wide.
export const ZOOM_LEVELS = Platform.select({
  ios: [
    { zoom: 0.02, label: "1×"   },
    { zoom: 0.25, label: "1.5×" },
    { zoom: 0.45, label: "2×"   },
    { zoom: 0.65, label: "3×"   },
  ],
  default: [
    { zoom: 0,    label: "1×"   },
    { zoom: 0.25, label: "1.5×" },
    { zoom: 0.45, label: "2×"   },
    { zoom: 0.65, label: "3×"   },
  ],
}) as { zoom: number; label: string }[];

// ── Smart zoom thresholds ─────────────────────────────────────────────────────
// bounds.size.width is in screen-coordinate pixels (expo-camera preview space).
// We compare against screenWidth so the logic is resolution-independent.
const SMART_ZOOM_SMALL      = 0.18; // QR < 18 % of screen width  → boost to 1.5×
const SMART_ZOOM_VERY_SMALL = 0.08; // QR < 8 % of screen width   → boost to 2×
const SMART_ZOOM_RESET_MS   = 4000; // auto-reset after 4 s without another detection

export function useCameraControls() {
  const [scanned,     setScanned]     = useState(false);
  const [processing,  setProcessing]  = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [flashOn,     setFlashOnRaw]  = useState(false);

  // ── Zoom — keep manual & smart zoom separate ──────────────────────────────
  // manualZoomRef: the level the user explicitly selected (survives smart boosts).
  // zoomRef:       current effective zoom value (manual + any smart boost).
  const manualZoomRef = useRef(ZOOM_LEVELS[0].zoom);
  const zoomRef       = useRef(ZOOM_LEVELS[0].zoom);
  const [zoom,      setZoomState] = useState(ZOOM_LEVELS[0].zoom);
  const [zoomLabel, setZoomLabel] = useState(ZOOM_LEVELS[0].label);

  function setZoom(value: number) {
    zoomRef.current = value;
    setZoomState(value);
  }

  // Smart zoom internal state
  const isSmartZoomedRef    = useRef(false);
  const smartZoomTimerRef   = useRef<ReturnType<typeof setTimeout> | null>(null);

  const scanLockRef   = useRef(false);
  const canScanRef    = useRef(false);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Scan-line animation ───────────────────────────────────────────────────
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const scanLineLoop = useRef<Animated.CompositeAnimation | null>(null);

  function _setFlash(on: boolean) {
    setFlashOnRaw(on);
  }

  function toggleFlash() {
    setFlashOnRaw((prev) => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  function startScanLine() {
    scanLineAnim.setValue(0);
    scanLineLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1, duration: 1800,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0, duration: 1800,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
      ])
    );
    scanLineLoop.current.start();
  }

  function stopScanLine() {
    scanLineLoop.current?.stop();
  }

  function _clearSmartZoomTimer() {
    if (smartZoomTimerRef.current) {
      clearTimeout(smartZoomTimerRef.current);
      smartZoomTimerRef.current = null;
    }
  }

  function _resetSmartZoomState() {
    _clearSmartZoomTimer();
    isSmartZoomedRef.current = false;
    // Return to whatever the user manually selected
    const base = manualZoomRef.current;
    if (zoomRef.current !== base) setZoom(base);
  }

  // ── Focus lifecycle ───────────────────────────────────────────────────────
  // NOTE: No separate boot useEffect for startScanLine — useFocusEffect below
  // handles the first focus and every subsequent return. A separate boot effect
  // would orphan the first animation loop (its reference is overwritten by the
  // useFocusEffect call 200 ms later) and cause a memory leak.
  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setProcessing(false);
      setScanSuccess(false);
      scanLockRef.current = false;
      canScanRef.current  = false;
      _setFlash(false);

      // Reset zoom fully — manual preference and any smart boost
      const baseZoom  = ZOOM_LEVELS[0].zoom;
      const baseLabel = ZOOM_LEVELS[0].label;
      manualZoomRef.current = baseZoom;
      isSmartZoomedRef.current = false;
      _clearSmartZoomTimer();
      setZoom(baseZoom);
      setZoomLabel(baseLabel);

      startScanLine();

      focusTimerRef.current = setTimeout(() => {
        canScanRef.current = true;
      }, 200);

      return () => {
        if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
        canScanRef.current = false;
        stopScanLine();
        _setFlash(false);
        _clearSmartZoomTimer();
      };
    }, [])
  );

  function onScanSuccess() {
    // Cancel any pending smart-zoom reset — the scan is done
    _clearSmartZoomTimer();
  }

  // ── Reset (Scan Again) ────────────────────────────────────────────────────
  function resetScan() {
    setScanned(false);
    setScanSuccess(false);
    setProcessing(false);
    scanLockRef.current = false;
    canScanRef.current  = true;
    // Return to manual zoom preference; keep flash setting
    _resetSmartZoomState();
  }

  // ── Manual zoom cycle ─────────────────────────────────────────────────────
  function cycleZoom() {
    // Find current index against the manual zoom (ignore smart boost)
    const currentIdx = ZOOM_LEVELS.findIndex((z) => z.zoom === manualZoomRef.current);
    const next = ZOOM_LEVELS[(currentIdx + 1) % ZOOM_LEVELS.length];

    // User explicitly controls zoom — cancel any smart boost
    _clearSmartZoomTimer();
    isSmartZoomedRef.current = false;
    manualZoomRef.current = next.zoom;

    setZoom(next.zoom);
    setZoomLabel(next.label);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // ── Smart auto-zoom ───────────────────────────────────────────────────────
  // Called from ScannerScreen every time a QR is decoded successfully.
  // Uses bounds.size.width (screen pixels) to determine apparent QR size and
  // decides whether to boost zoom. The boost is capped at 2× and never
  // reduces the user's manually selected zoom level.
  function onQRBoundsDetected(
    bounds: { size?: { width?: number; height?: number } } | undefined | null
  ) {
    // Don't auto-zoom after a scan has locked in — it would be distracting
    if (scanLockRef.current) return;
    if (!bounds?.size?.width) return;

    const screenWidth = Dimensions.get("window").width;
    const fraction    = bounds.size.width / screenWidth;
    const base        = manualZoomRef.current;

    let targetZoom = base;

    if (fraction < SMART_ZOOM_VERY_SMALL) {
      // Very small QR → boost up to 2×
      const level = ZOOM_LEVELS.find((l) => l.label === "2×");
      if (level) targetZoom = Math.max(base, level.zoom);
    } else if (fraction < SMART_ZOOM_SMALL) {
      // Small QR → boost up to 1.5×
      const level = ZOOM_LEVELS.find((l) => l.label === "1.5×");
      if (level) targetZoom = Math.max(base, level.zoom);
    } else {
      // QR is large enough — release smart zoom if active
      if (isSmartZoomedRef.current) {
        isSmartZoomedRef.current = false;
        _clearSmartZoomTimer();
        setZoom(base);
      }
      return;
    }

    // Apply boost only if it actually changes the zoom level
    if (targetZoom !== zoomRef.current) {
      isSmartZoomedRef.current = true;
      setZoom(targetZoom);
    }

    // Restart auto-reset timer: if no more QRs detected, return to manual zoom
    _clearSmartZoomTimer();
    smartZoomTimerRef.current = setTimeout(() => {
      if (isSmartZoomedRef.current) {
        isSmartZoomedRef.current = false;
        setZoom(manualZoomRef.current);
      }
    }, SMART_ZOOM_RESET_MS);
  }

  return {
    scanned, setScanned,
    processing, setProcessing,
    scanSuccess, setScanSuccess,
    flashOn,
    toggleFlash,
    zoom,
    zoomLabel,
    scanLineAnim,
    scanLockRef, canScanRef,
    resetScan,
    cycleZoom,
    onScanSuccess,
    onQRBoundsDetected,
    setFlashOn: _setFlash,
  };
}
