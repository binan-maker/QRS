// ─── Camera Controls ──────────────────────────────────────────────────────────
// Single responsibility: camera hardware state, zoom, flash, the scan-line
// animation, and the focus-lifecycle lock that prevents double-scans.
// Contains zero business logic — no DB calls, no modal state.

import { useState, useRef, useEffect, useCallback } from "react";
import { Animated, Easing } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Haptics from "@/lib/haptics";

export const FINDER_SIZE = 270;
export const CORNER_SIZE = 32;
export const CORNER_WIDTH = 4;

export const ZOOM_LEVELS = [
  { zoom: 0,   label: "1×" },
  { zoom: 0.3, label: "2×" },
  { zoom: 0.6, label: "3×" },
];

// Auto-zoom stages: after N ms without a scan, try a different zoom level
const AUTO_ZOOM_STAGES = [
  { delay: 4000,  zoom: 0.18, label: "1.5×" },
  { delay: 8000,  zoom: 0.42, label: "2×"   },
  { delay: 12000, zoom: 0,    label: "1×"    }, // reset
];

export function useCameraControls() {
  const [scanned, setScanned]         = useState(false);
  const [processing, setProcessing]   = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [flashOn, setFlashOn]         = useState(false);
  const [zoom, setZoom]               = useState(0);
  const [zoomLabel, setZoomLabel]     = useState("1×");

  const scanLockRef  = useRef(false);
  const canScanRef   = useRef(false);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Auto-zoom state
  const autoZoomTimers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const manualZoomRef  = useRef(false); // user manually cycled zoom

  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const scanLineLoop = useRef<Animated.CompositeAnimation | null>(null);

  function startScanLine() {
    scanLineAnim.setValue(0);
    scanLineLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, {
          toValue: 1, duration: 2000,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
        Animated.timing(scanLineAnim, {
          toValue: 0, duration: 2000,
          easing: Easing.inOut(Easing.ease), useNativeDriver: true,
        }),
      ])
    );
    scanLineLoop.current.start();
  }

  function stopScanLine() {
    if (scanLineLoop.current) scanLineLoop.current.stop();
  }

  function clearAutoZoomTimers() {
    autoZoomTimers.current.forEach(clearTimeout);
    autoZoomTimers.current = [];
  }

  function startAutoZoom() {
    clearAutoZoomTimers();
    manualZoomRef.current = false;
    AUTO_ZOOM_STAGES.forEach(({ delay, zoom: z, label }) => {
      const t = setTimeout(() => {
        // Only auto-zoom if user hasn't manually overridden
        if (!manualZoomRef.current) {
          setZoom(z);
          setZoomLabel(label);
        }
      }, delay);
      autoZoomTimers.current.push(t);
    });
  }

  function resetAutoZoom() {
    clearAutoZoomTimers();
    setZoom(0);
    setZoomLabel("1×");
    manualZoomRef.current = false;
  }

  useEffect(() => {
    startScanLine();
    startAutoZoom();
    return () => {
      stopScanLine();
      clearAutoZoomTimers();
    };
  }, []);

  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setProcessing(false);
      setScanSuccess(false);
      scanLockRef.current = false;
      canScanRef.current = false;
      startScanLine();
      startAutoZoom();
      focusTimerRef.current = setTimeout(() => {
        canScanRef.current = true;
      }, 200);
      return () => {
        if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
        canScanRef.current = false;
        stopScanLine();
        clearAutoZoomTimers();
      };
    }, [])
  );

  function resetScan() {
    setScanned(false);
    setScanSuccess(false);
    setProcessing(false);
    scanLockRef.current = false;
    canScanRef.current = true;
    resetAutoZoom();
    startAutoZoom();
  }

  function cycleZoom() {
    manualZoomRef.current = true;
    clearAutoZoomTimers();
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
    flashOn, setFlashOn,
    zoom, zoomLabel,
    scanLineAnim,
    scanLockRef, canScanRef,
    resetScan,
    cycleZoom,
  };
}
