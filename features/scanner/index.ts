export { default as ScannerScreen } from "./ScannerScreen";
export { useScanner }               from "./hooks/useScanner";

// Components — re-export from the barrel for external consumers
export {
  ScannerOverlay, FinderFrame, OverlayTopBar, OverlayBottomBar,
  ProcessingOverlay, PermissionScreen, CameraErrorBoundary, CameraUnavailableBanner,
  VerifiedModal, UnverifiedModal, LivingShieldModal,
  ScannerToast, DonationBanner, ConversionBanner,
} from "./components";

// Hooks
export { useCameraControls, FINDER_SIZE, CORNER_SIZE, CORNER_WIDTH, ZOOM_LEVELS } from "./hooks/useCameraControls";
export { useScanModals }        from "./hooks/useScanModals";
export { useScanProcessor }     from "./hooks/useScanProcessor";
export { useOverlayAnimations } from "./hooks/useOverlayAnimations";

// Utils
export { consumeAnonScanSlot, ANON_DAILY_SCAN_LIMIT, ANON_CONVERSION_MILESTONES } from "./utils/anon-scan-limit";
export { runSecurityCheck }     from "./utils/security-analysis";
