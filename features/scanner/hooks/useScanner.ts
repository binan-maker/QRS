import { useState, useCallback } from "react";
import * as Haptics from "@/shared/utils/haptics";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useCameraControls } from "@/features/scanner/hooks/useCameraControls";
import { useScanModals } from "@/features/scanner/hooks/useScanModals";
import { useScanProcessor } from "@/features/scanner/hooks/useScanProcessor";
import { useScanMessages } from "@/features/scanner/hooks/useScanMessages";

export { FINDER_SIZE, CORNER_SIZE, CORNER_WIDTH, ZOOM_LEVELS } from "@/features/scanner/hooks/useCameraControls";

export function useScanner() {
  const { user } = useAuth();

  // ── Camera hardware, zoom, flash, scan lifecycle ───────────────────────────
  const camera = useCameraControls();

  // ── Camera facing (UI preference, not hardware state) ─────────────────────
  const [facing, setFacing] = useState<"back" | "front">("back");
  function flipCamera() {
    setFacing((prev) => {
      const next = prev === "back" ? "front" : "back";
      // Disable torch when switching to front camera (no front torch)
      if (next === "front") camera.setFlashOn(false);
      return next;
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }

  // ── Anonymous mode ────────────────────────────────────────────────────────
  const [anonymousMode, setAnonymousMode] = useState(false);

  // ── Toast / banner messages ───────────────────────────────────────────────
  const messages = useScanMessages();

  // ── Post-scan modals ──────────────────────────────────────────────────────
  const modals = useScanModals(camera.resetScan);

  // ── Scan processing (all business logic) ──────────────────────────────────
  const { handleBarCodeScanned: _rawHandleBarCodeScanned, handlePickImage } = useScanProcessor({
    anonymousMode,
    scanned:                camera.scanned,
    setScanned:             camera.setScanned,
    setProcessing:          camera.setProcessing,
    setScanSuccess:         camera.setScanSuccess,
    scanLockRef:            camera.scanLockRef,
    canScanRef:             camera.canScanRef,
    modalControls:          modals.controls,
    showScannerMsg:         messages.showScannerMsg,
    showGalleryError:       messages.showGalleryError,
    setConversionBannerMsg: messages.setConversionBannerMsg,
  });

  // ── Wrap handleBarCodeScanned to kill auto-flash immediately on scan hit ──
  const handleBarCodeScanned = useCallback(
    async (data: any) => {
      camera.onScanSuccess(); // stop auto-torch + auto-zoom progression
      await _rawHandleBarCodeScanned(data);
    },
    [_rawHandleBarCodeScanned, camera.onScanSuccess]
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
    cycleZoom:    camera.cycleZoom,
    resetScan:    camera.resetScan,
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
    livingShieldModal:     modals.livingShieldModal,
    livingShieldData:      modals.livingShieldData,
    livingShieldLoading:   modals.livingShieldLoading,
    // Modal handlers
    handleSafetyModalProceed:    modals.handleSafetyModalProceed,
    handleSafetyModalBack:       modals.handleSafetyModalBack,
    handleUnverifiedProceed:     modals.handleUnverifiedProceed,
    handleUnverifiedBack:        modals.handleUnverifiedBack,
    handleLivingShieldProceed:   modals.handleLivingShieldProceed,
    handleLivingShieldCancel:    modals.handleLivingShieldCancel,
    // Messages
    galleryErrorMsg:          messages.galleryErrorMsg,
    dismissGalleryError:      messages.dismissGalleryError,
    scannerMsg:               messages.scannerMsg,
    scannerMsgType:           messages.scannerMsgType,
    dismissScannerMsg:        messages.dismissScannerMsg,
    conversionBannerMsg:      messages.conversionBannerMsg,
    dismissConversionBanner:  messages.dismissConversionBanner,
    // Scan handlers
    handleBarCodeScanned,
    handlePickImage,
  };
}
