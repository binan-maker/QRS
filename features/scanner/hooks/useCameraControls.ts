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

  useEffect(() => {
    startScanLine();
    return () => stopScanLine();
  }, []);

  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setProcessing(false);
      setScanSuccess(false);
      scanLockRef.current = false;
      canScanRef.current = false;
      startScanLine();
      focusTimerRef.current = setTimeout(() => {
        canScanRef.current = true;
      }, 500);
      return () => {
        if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
        canScanRef.current = false;
        stopScanLine();
      };
    }, [])
  );

  function resetScan() {
    setScanned(false);
    setScanSuccess(false);
    setProcessing(false);
    scanLockRef.current = false;
    canScanRef.current = true;
  }

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
    flashOn, setFlashOn,
    zoom, zoomLabel,
    scanLineAnim,
    scanLockRef, canScanRef,
    resetScan,
    cycleZoom,
  };
}
