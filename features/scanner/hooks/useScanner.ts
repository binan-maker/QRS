import { useState } from "react";
import * as Haptics from "@/lib/haptics";
import { useAuth } from "@/contexts/AuthContext";
import { useCameraControls } from "@/features/scanner/hooks/useCameraControls";
import { useScanModals } from "@/features/scanner/hooks/useScanModals";
import { useScanProcessor } from "@/features/scanner/hooks/useScanProcessor";

// Re-export constants so ScannerOverlay can source them from one place
export { FINDER_SIZE, CORNER_SIZE, CORNER_WIDTH, ZOOM_LEVELS } from "@/features/scanner/hooks/useCameraControls";

export function useScanner() {
  const { user } = useAuth();

  // ── Camera hardware, zoom, flash, scan lifecycle ──────────────────────────
  const camera = useCameraControls();

  // ── Camera facing (not in useCameraControls — purely UI preference) ───────
  const [facing, setFacing] = useState<"back" | "front">("back");
  function flipCamera() {
    setFacing((prev) => {
      const next = prev === "back" ? "front" : "back";
      if (next === "front") camera.setFlashOn(false);
      return next;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // ── Anonymous mode toggle ─────────────────────────────────────────────────
  const [anonymousMode, setAnonymousMode] = useState(false);

  // ── Toast / inline message state ─────────────────────────────────────────
  const [galleryErrorMsg,      setGalleryErrorMsg]      = useState<string | null>(null);
  const [scannerMsg,           setScannerMsg]            = useState<string | null>(null);
  const [scannerMsgType,       setScannerMsgType]        = useState<"error" | "warning" | "info">("error");
  const [conversionBannerMsg,  setConversionBannerMsg]   = useState<string | null>(null);

  function showScannerMsg(msg: string, type: "error" | "warning" | "info" = "error") {
    setScannerMsg(msg);
    setScannerMsgType(type);
  }
  function showGalleryError(msg: string)  { setGalleryErrorMsg(msg); }
  function dismissGalleryError()          { setGalleryErrorMsg(null); }
  function dismissScannerMsg()            { setScannerMsg(null); }
  function dismissConversionBanner()      { setConversionBannerMsg(null); }

  // ── Post-scan modals ──────────────────────────────────────────────────────
  const modals = useScanModals(camera.resetScan);

  // ── Scan processing (all business logic) ─────────────────────────────────
  const { handleBarCodeScanned, handlePickImage } = useScanProcessor({
    anonymousMode,
    scanned:                camera.scanned,
    setScanned:             camera.setScanned,
    setProcessing:          camera.setProcessing,
    setScanSuccess:         camera.setScanSuccess,
    scanLockRef:            camera.scanLockRef,
    canScanRef:             camera.canScanRef,
    modalControls:          modals.controls,
    showScannerMsg,
    showGalleryError,
    setConversionBannerMsg,
  });

  return {
    user,
    // Camera state
    scanned:       camera.scanned,
    processing:    camera.processing,
    scanSuccess:   camera.scanSuccess,
    flashOn:       camera.flashOn,
    setFlashOn:    camera.setFlashOn,
    zoom:          camera.zoom,
    zoomLabel:     camera.zoomLabel,
    scanLineAnim:  camera.scanLineAnim,
    // Camera actions
    cycleZoom:     camera.cycleZoom,
    resetScan:     camera.resetScan,
    // Facing
    facing,
    flipCamera,
    // Anonymous mode
    anonymousMode,
    setAnonymousMode,
    // Modal state
    safetyModal:           modals.safetyModal,
    safetyWarnings:        modals.safetyWarnings,
    safetyRiskLevel:       modals.safetyRiskLevel,
    verifiedModal:         modals.verifiedModal,
    verifiedOwnerName:     modals.verifiedOwnerName,
    unverifiedModal:       modals.unverifiedModal,
    unverifiedCountdown:   modals.unverifiedCountdown,
    // Modal handlers
    handleSafetyModalProceed:  modals.handleSafetyModalProceed,
    handleSafetyModalBack:     modals.handleSafetyModalBack,
    handleUnverifiedProceed:   modals.handleUnverifiedProceed,
    handleUnverifiedBack:      modals.handleUnverifiedBack,
    // Message state
    galleryErrorMsg,
    dismissGalleryError,
    scannerMsg,
    scannerMsgType,
    dismissScannerMsg,
    conversionBannerMsg,
    dismissConversionBanner,
    // Scan handlers
    handleBarCodeScanned,
    handlePickImage,
  };
}
