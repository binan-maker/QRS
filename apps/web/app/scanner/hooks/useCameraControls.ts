"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useWebCameraZoom, ZOOM_LEVELS } from "./useWebCameraZoom";

export { ZOOM_LEVELS };
export const FINDER_SIZE  = 270;
export const CORNER_SIZE  = 32;
export const CORNER_WIDTH = 4;

export function useCameraControls() {
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [flashOn, setFlashOnRaw] = useState(false);

  const scanLockRef = useRef(false);
  const canScanRef = useRef(true);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const zoomControls = useWebCameraZoom(scanLockRef);
  const scanLineAnim = useRef(0);

  const toggleFlash = useCallback(() => {
    setFlashOnRaw((prev) => !prev);
  }, []);

  useEffect(() => {
    setScanned(false);
    setProcessing(false);
    setScanSuccess(false);
    scanLockRef.current = false;
    canScanRef.current = true;
    setFlashOnRaw(false);
    zoomControls.resetZoom();

    focusTimerRef.current = setTimeout(() => {
      if (!scanLockRef.current) canScanRef.current = true;
    }, 200);

    return () => {
      if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
      setFlashOnRaw(false);
      zoomControls.clearSmartZoom();
    };
  }, [zoomControls]);

  const resetScan = useCallback(() => {
    setScanned(false);
    setScanSuccess(false);
    setProcessing(false);
    scanLockRef.current = false;
    canScanRef.current = true;
    zoomControls.resetZoom();
  }, [zoomControls]);

  return {
    scanned, setScanned,
    processing, setProcessing,
    scanSuccess, setScanSuccess,
    flashOn, toggleFlash,
    zoom: zoomControls.zoom,
    zoomLabel: zoomControls.zoomLabel,
    scanLineAnim,
    scanLockRef, canScanRef,
    resetScan,
    cycleZoom: zoomControls.cycleZoom,
    onScanSuccess: zoomControls.clearSmartZoom,
    onQRBoundsDetected: zoomControls.onQRBoundsDetected,
    setFlashOn: setFlashOnRaw,
  };
}
