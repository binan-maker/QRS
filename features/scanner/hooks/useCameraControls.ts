// ─── Camera Controls ──────────────────────────────────────────────────────────
// Single responsibility: camera hardware state, zoom, flash, the scan-line
// animation, and the focus-lifecycle lock that prevents double-scans.
//
// Flash and zoom are manual-only. Auto-triggering them without a confirmed
// "QR in frame but unreadable" signal from the camera hardware causes false
// activations when there is nothing to scan. expo-camera does not expose a
// partial-detection event, so manual control is the correct UX.

import { useState, useRef, useEffect, useCallback } from "react";
import { Animated, Easing } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Haptics from "@/shared/utils/haptics";

export const FINDER_SIZE  = 270;
export const CORNER_SIZE  = 32;
export const CORNER_WIDTH = 4;

export const ZOOM_LEVELS = [
  { zoom: 0,    label: "1×"   },
  { zoom: 0.25, label: "1.5×" },
  { zoom: 0.45, label: "2×"   },
  { zoom: 0.65, label: "3×"   },
];

export function useCameraControls() {
  const [scanned,     setScanned]     = useState(false);
  const [processing,  setProcessing]  = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [flashOn,     setFlashOnRaw]  = useState(false);
  const [zoom,        setZoom]        = useState(0);
  const [zoomLabel,   setZoomLabel]   = useState("1×");

  const scanLockRef   = useRef(false);
  const canScanRef    = useRef(false);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── Scan-line animation ───────────────────────────────────────────────────
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const scanLineLoop = useRef<Animated.CompositeAnimation | null>(null);

  function _setFlash(on: boolean) {
    setFlashOnRaw(on);
  }

  // ── Manual flash toggle (user-initiated) ──────────────────────────────────
  function toggleFlash() {
    setFlashOnRaw((prev) => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // ── Scan-line helpers ─────────────────────────────────────────────────────
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

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    startScanLine();
    return () => { stopScanLine(); };
  }, []);

  // ── Focus lifecycle ───────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setProcessing(false);
      setScanSuccess(false);
      scanLockRef.current = false;
      canScanRef.current  = false;
      _setFlash(false);
      setZoom(0);
      setZoomLabel("1×");

      startScanLine();

      focusTimerRef.current = setTimeout(() => {
        canScanRef.current = true;
      }, 200);

      return () => {
        if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
        canScanRef.current = false;
        stopScanLine();
        _setFlash(false);
      };
    }, [])
  );

  // ── Called immediately when a QR is successfully decoded ──────────────────
  function onScanSuccess() {
    // Nothing auto to clean up — flash and zoom are manual-only.
    // This hook point is kept so callers don't need to change.
  }

  // ── Reset (Scan Again) ────────────────────────────────────────────────────
  function resetScan() {
    setScanned(false);
    setScanSuccess(false);
    setProcessing(false);
    scanLockRef.current = false;
    canScanRef.current  = true;
    // Keep user's manual flash/zoom preference across resets
  }

  // ── Manual zoom cycle ─────────────────────────────────────────────────────
  function cycleZoom() {
    const currentIdx = ZOOM_LEVELS.findIndex((z) => z.zoom === zoom);
    const next = ZOOM_LEVELS[(currentIdx + 1) % ZOOM_LEVELS.length];
    setZoom(next.zoom);
    setZoomLabel(next.label);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  return {
    scanned, setScanned,
    processing, setProcessing,
    scanSuccess, setScanSuccess,
    flashOn,
    toggleFlash,
    zoom, zoomLabel,
    scanLineAnim,
    scanLockRef, canScanRef,
    resetScan,
    cycleZoom,
    onScanSuccess,
    setFlashOn: _setFlash,
  };
}
