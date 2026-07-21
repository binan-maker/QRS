// Overlay
export { default as ScannerOverlay }  from "./overlay/ScannerOverlay";
export { default as FinderFrame }     from "./overlay/FinderFrame";
export { default as OverlayTopBar }   from "./overlay/OverlayTopBar";
export { default as OverlayBottomBar }from "./overlay/OverlayBottomBar";
export { SCANNER_GLOW, SCANNER_AMBER, VIGNETTE } from "./overlay/constants";

// Modals
// SafetyModal intentionally not re-exported — openSafetyModal() navigates
// directly to /qr-detail, so the modal is never rendered by the scanner.
export { default as VerifiedModal }   from "./modals/VerifiedModal";
export { UnverifiedModal }            from "./modals/UnverifiedModal";
export { default as LivingShieldModal }from "./modals/LivingShieldModal";

// Feedback
export { ScannerToast, toastContainerStyle } from "./feedback/ScannerToast";
export type { ToastType }             from "./feedback/ScannerToast";
export { DonationBanner }             from "./feedback/DonationBanner";
export { ConversionBanner }           from "./feedback/ConversionBanner";

// System
export { CameraErrorBoundary }        from "./system/CameraErrorBoundary";
export { CameraUnavailableBanner }    from "./system/CameraUnavailableBanner";
export type { CameraErrorType }       from "./system/CameraUnavailableBanner";
export { default as PermissionScreen }from "./system/PermissionScreen";
export { default as ProcessingOverlay }from "./system/ProcessingOverlay";
