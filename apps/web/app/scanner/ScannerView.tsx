"use client";

import React from "react";
import { useRouter } from "next/navigation";
import {
  ScannerOverlay,
  ProcessingOverlay,
  PermissionScreen,
  CameraErrorBoundary,
  ScannerToast,
  toastContainerStyle,
  CameraUnavailableBanner,
  ConversionBanner,
  CameraView,
  useScanner,
  useLowLightDetection,
  useWebCameraLifecycle,
} from "@/components/scanner";
import styles from "./scanner.module.css";

export default function ScannerView() {
  const router = useRouter();
  const life = useWebCameraLifecycle();
  const sc = useScanner({ isCameraAvailable: life.cameraAvailable });
  const { suggested: lowLightSuggested } = useLowLightDetection({
    cameraLive: life.cameraLive, scanned: sc.scanned, flashOn: sc.flashOn, facing: sc.facing,
  });

  if (!life.permission) return <div className={styles.scannerRootBlack} />;
  if (!life.permission.granted) {
    return <PermissionScreen canAskAgain={life.permission.canAskAgain} onRequestPermission={life.requestPermission} />;
  }

  return (
    <div className={styles.scannerRootBlack} style={{ position: "relative", width: "100%", height: "100%" }}>
      {life.hardwareAvailable !== null && !life.cameraAvailable ? (
        <CameraUnavailableBanner onPickImage={sc.handlePickImage} onRetry={life.handleRetry} errorType={life.cameraErrorType} />
      ) : (
        <CameraErrorBoundary onError={() => life.markUnavailable("unavailable")}>
          <CameraView
            key={life.focusKey}
            facing={sc.facing}
            enableTorch={sc.flashOn && sc.facing === "back"}
            zoom={sc.zoom}
            onBarcodeScanned={(d) => { sc.onQRBoundsDetected(d?.bounds); sc.handleBarCodeScanned(d); }}
            onCameraReady={life.markReady}
            onMountError={() => life.markUnavailable("unavailable")}
          />
        </CameraErrorBoundary>
      )}

      {life.cameraLive && (
        <ScannerOverlay
          topInset={16}
          bottomInset={24}
          zoom={sc.zoom}
          zoomLabel={sc.zoomLabel}
          onCycleZoom={sc.cycleZoom}
          scanned={sc.scanned}
          scanSuccess={sc.scanSuccess}
          anonymousMode={sc.anonymousMode}
          onToggleAnonymous={() => sc.setAnonymousMode(!sc.anonymousMode)}
          onPickImage={sc.handlePickImage}
          user={sc.user}
        />
      )}

      {sc.processing && <ProcessingOverlay />}
      <ConversionBanner message={sc.conversionBannerMsg} visible={!sc.user && !!sc.conversionBannerMsg} bottomOffset={40} onSignIn={() => router.push("/login")} onDismiss={sc.dismissConversionBanner} />
      {(sc.galleryErrorMsg || sc.scannerMsg) && (
        <div style={{ ...toastContainerStyle, bottom: 40 }}>
          <ScannerToast message={sc.galleryErrorMsg || sc.scannerMsg || ""} type={sc.galleryErrorMsg ? "error" : sc.scannerMsgType} onDone={sc.galleryErrorMsg ? sc.dismissGalleryError : sc.dismissScannerMsg} />
        </div>
      )}
    </div>
  );
}
