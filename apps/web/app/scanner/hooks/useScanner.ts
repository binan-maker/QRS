"use client";

// ─── Scanner Hook Facade ──────────────────────────────────────────────────────
// 1:1 with features/scanner/hooks/useScanner.ts

import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth-context";
import { useCameraControls } from "./useCameraControls";
import { useScanProcessor } from "./useScanProcessor";
import { useScanMessages } from "./useScanMessages";

export { FINDER_SIZE, CORNER_SIZE, CORNER_WIDTH, ZOOM_LEVELS } from "./useCameraControls";

export function useScanner({ isCameraAvailable = true }: { isCameraAvailable?: boolean } = {}) {
  const { user, session } = useAuth();
  const token = session?.access_token ?? null;

  // ── Camera hardware, zoom, flash, scan lifecycle ───────────────────────────
  const camera = useCameraControls();
  const { setFlashOn, onScanSuccess } = camera;

  // ── Camera facing (UI preference, not hardware state) ─────────────────────
  const [facing, setFacing] = useState<"back" | "front">("back");
  const flipCamera = useCallback(() => {
    setFacing((prev) => {
      const next = prev === "back" ? "front" : "back";
      if (next === "front") setFlashOn(false);
      return next;
    });
  }, [setFlashOn]);

  // ── Anonymous mode ────────────────────────────────────────────────────────
  const [anonymousMode, setAnonymousMode] = useState(false);

  // ── Toast / banner messages ───────────────────────────────────────────────
  const messages = useScanMessages();

  // ── Scan processing (all business logic) ──────────────────────────────────
  const { handleBarCodeScanned: _rawHandleBarCodeScanned, handlePickImage } = useScanProcessor({
    user,
    token,
    anonymousMode,
    scanned:                camera.scanned,
    setScanned:             camera.setScanned,
    setProcessing:          camera.setProcessing,
    setScanSuccess:         camera.setScanSuccess,
    scanLockRef:            camera.scanLockRef,
    canScanRef:             camera.canScanRef,
    showScannerMsg:         messages.showScannerMsg,
    showGalleryError:       messages.showGalleryError,
    setConversionBannerMsg: messages.setConversionBannerMsg,
    isCameraAvailable,
  });

  // ── Wrap handleBarCodeScanned to fire onScanSuccess immediately ──────────
  const handleBarCodeScanned = useCallback(
    async (data: any) => {
      onScanSuccess();
      await _rawHandleBarCodeScanned(data);
    },
    [_rawHandleBarCodeScanned, onScanSuccess]
  );

  return {
    user,
    // Camera state
    scanned:      camera.scanned,
    processing:   camera.processing,
    scanSuccess:  camera.scanSuccess,
    flashOn:      camera.flashOn,
    toggleFlash:  camera.toggleFlash,
    zoom:         camera.zoom,
    zoomLabel:    camera.zoomLabel,
    scanLineAnim: camera.scanLineAnim,
    // Camera actions
    cycleZoom:          camera.cycleZoom,
    resetScan:          camera.resetScan,
    onQRBoundsDetected: camera.onQRBoundsDetected,
    // Facing
    facing,
    flipCamera,
    // Anonymous mode
    anonymousMode,
    setAnonymousMode,
    // Messages
    galleryErrorMsg:         messages.galleryErrorMsg,
    dismissGalleryError:     messages.dismissGalleryError,
    scannerMsg:              messages.scannerMsg,
    scannerMsgType:          messages.scannerMsgType,
    dismissScannerMsg:       messages.dismissScannerMsg,
    conversionBannerMsg:     messages.conversionBannerMsg,
    dismissConversionBanner: messages.dismissConversionBanner,
    // Scan handlers
    handleBarCodeScanned,
    handlePickImage,
  };
}
