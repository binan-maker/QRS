export { default as ScannerScreen } from "./screens/ScannerScreen";
export { default }                  from "./screens/ScannerScreen";
export { useScanner }               from "./hooks/useScanner";

// Components — re-export from the barrel for external consumers
export {
  ScannerOverlay, FinderFrame, OverlayTopBar, OverlayBottomBar,
  ProcessingOverlay, PermissionScreen, CameraErrorBoundary, CameraUnavailableBanner,
  ScannerToast, ConversionBanner, TapFocusRing,
} from "./components";

// Hooks
export { useCameraControls, FINDER_SIZE, CORNER_SIZE, CORNER_WIDTH, ZOOM_LEVELS } from "./hooks/useCameraControls";
export { useScanProcessor }     from "./hooks/useScanProcessor";
export { useOverlayAnimations } from "./hooks/useOverlayAnimations";
export { useLowLightDetection } from "./hooks/useLowLightDetection";
export { useCameraLifecycle }   from "./hooks/useCameraLifecycle";
export { useTapToFocus }        from "./hooks/useTapToFocus";

// Utils
export * from "./utils";
