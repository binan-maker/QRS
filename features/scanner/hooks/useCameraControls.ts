// ─── Camera Controls ──────────────────────────────────────────────────────────
// Single responsibility: camera hardware state, zoom, flash, the scan-line
// animation, and the focus-lifecycle lock that prevents double-scans.
//
// Auto-zoom: progressively zooms in (Google Pay/PhonePe style) to find QR
//   codes at varying distances. Resets after full cycle.
//
// Auto-flash: if no QR is found after AUTO_FLASH_DELAY ms, the torch is
//   auto-enabled to illuminate dark environments. Turned off immediately on
//   a successful scan (via onScanSuccess()) or on screen blur.
//   User manual toggle always overrides and suppresses auto for that session.

import { useState, useRef, useEffect, useCallback } from "react";
import { Animated, Easing, Platform } from "react-native";
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

// ── Auto-zoom stages (Google Pay style: aggressive, escalating) ───────────────
// Each stage kicks in after `delay` ms without a successful scan.
const AUTO_ZOOM_STAGES = [
  { delay: 2500,  zoom: 0.12, label: "1.2×" }, // gentle bump — common near-distance codes
  { delay: 5500,  zoom: 0.30, label: "1.6×" }, // mid-range — slightly smaller codes
  { delay: 9000,  zoom: 0.50, label: "2×"   }, // further away / dense codes
  { delay: 13000, zoom: 0.70, label: "2.5×" }, // max — very small or distant
  { delay: 17000, zoom: 0,    label: "1×"   }, // full reset and cycle again
];

// ── Auto-flash timing ─────────────────────────────────────────────────────────
// After this many ms without a scan, torch is auto-enabled to help in dark rooms.
// Only applies to Android (rear camera) — iOS/front camera are left alone.
const AUTO_FLASH_DELAY = 5000; // 5 s

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

  // ── Auto-zoom refs ────────────────────────────────────────────────────────────
  const autoZoomTimers  = useRef<ReturnType<typeof setTimeout>[]>([]);
  const manualZoomRef   = useRef(false);

  // ── Auto-flash refs ───────────────────────────────────────────────────────────
  const autoFlashTimerRef  = useRef<ReturnType<typeof setTimeout> | null>(null);
  const autoFlashActiveRef = useRef(false); // true = torch was enabled by auto logic
  const manualFlashRef     = useRef(false); // true = user manually toggled flash

  // ── Scan-line animation ───────────────────────────────────────────────────────
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const scanLineLoop = useRef<Animated.CompositeAnimation | null>(null);

  // ─── Internal setters ─────────────────────────────────────────────────────────
  function _setFlash(on: boolean) {
    setFlashOnRaw(on);
  }

  // ─── Auto-flash ───────────────────────────────────────────────────────────────
  function _clearAutoFlashTimer() {
    if (autoFlashTimerRef.current) {
      clearTimeout(autoFlashTimerRef.current);
      autoFlashTimerRef.current = null;
    }
  }

  function startAutoFlash() {
    _clearAutoFlashTimer();
    // Auto-flash only makes sense on Android rear camera; iOS handles torch
    // availability differently and front-camera torch is not supported.
    if (Platform.OS !== "android") return;

    autoFlashTimerRef.current = setTimeout(() => {
      // Don't auto-enable if user has already manually controlled flash
      if (manualFlashRef.current) return;
      autoFlashActiveRef.current = true;
      _setFlash(true);
    }, AUTO_FLASH_DELAY);
  }

  function stopAutoFlash() {
    _clearAutoFlashTimer();
    if (autoFlashActiveRef.current) {
      autoFlashActiveRef.current = false;
      _setFlash(false);
    }
  }

  // ─── Manual flash toggle (user-initiated) ─────────────────────────────────────
  // Marks the session as "user has control" so auto doesn't override.
  function toggleFlash() {
    manualFlashRef.current     = true;
    autoFlashActiveRef.current = false;
    _clearAutoFlashTimer();
    setFlashOnRaw((prev) => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // ─── Scan-line helpers ────────────────────────────────────────────────────────
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

  // ─── Auto-zoom helpers ────────────────────────────────────────────────────────
  function clearAutoZoomTimers() {
    autoZoomTimers.current.forEach(clearTimeout);
    autoZoomTimers.current = [];
  }

  function startAutoZoom() {
    clearAutoZoomTimers();
    manualZoomRef.current = false;
    AUTO_ZOOM_STAGES.forEach(({ delay, zoom: z, label }) => {
      const t = setTimeout(() => {
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

  // ─── Boot ─────────────────────────────────────────────────────────────────────
  useEffect(() => {
    startScanLine();
    startAutoZoom();
    startAutoFlash();
    return () => {
      stopScanLine();
      clearAutoZoomTimers();
      stopAutoFlash();
    };
  }, []);

  // ─── Focus lifecycle ──────────────────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setProcessing(false);
      setScanSuccess(false);
      scanLockRef.current = false;
      canScanRef.current  = false;
      manualFlashRef.current     = false;
      autoFlashActiveRef.current = false;
      _setFlash(false);

      startScanLine();
      startAutoZoom();
      startAutoFlash();

      focusTimerRef.current = setTimeout(() => {
        canScanRef.current = true;
      }, 200);

      return () => {
        if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
        canScanRef.current = false;
        stopScanLine();
        clearAutoZoomTimers();
        stopAutoFlash();
      };
    }, [])
  );

  // ─── Called immediately when a QR code is detected ────────────────────────────
  // Turns off auto-torch, stops auto-zoom progression.
  function onScanSuccess() {
    stopAutoFlash();
    clearAutoZoomTimers();
  }

  // ─── Reset (Scan Again button) ────────────────────────────────────────────────
  function resetScan() {
    setScanned(false);
    setScanSuccess(false);
    setProcessing(false);
    scanLockRef.current    = false;
    canScanRef.current     = true;
    manualFlashRef.current = false;

    stopAutoFlash();

    resetAutoZoom();
    startAutoZoom();
    startAutoFlash();
  }

  // ─── Manual zoom cycle ────────────────────────────────────────────────────────
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
    flashOn,
    toggleFlash,
    zoom, zoomLabel,
    scanLineAnim,
    scanLockRef, canScanRef,
    resetScan,
    cycleZoom,
    onScanSuccess,
    // Keep setFlashOn for internal compatibility (e.g., flipCamera disables flash)
    setFlashOn: _setFlash,
  };
}
