"use client";

// ─── Web Scanner Screen ───────────────────────────────────────────────────────
// 1:1 mirror of features/scanner/ScannerScreen.tsx

import React, { useRef, useEffect, useState, useCallback } from "react";
import { useRouter } from "next/navigation";
import Colors from "@shared/constants/colors";
import { useTheme } from "@/lib/theme-context";
import { Ionicons } from "./icons";
import { useScanner } from "./hooks/useScanner";
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
  useCameraPermissions,
  stopSharedCameraStream,
} from "./components";
import type { CameraErrorType } from "./components";
import styles from "./scanner.module.css";

const AUTOFOCUS_MODE = undefined;

export default function ScannerView() {
  const router = useRouter();
  const [permission, requestPermission] = useCameraPermissions();
  const [hardwareAvailable, setHardwareAvailable] = useState<boolean | null>(true);
  const [cameraAvailable,   setCameraAvailable]   = useState(true);
  const [cameraErrorType,   setCameraErrorType]   = useState<CameraErrorType>("unavailable");
  const cameraAvailableRef     = useRef(true);
  const cameraReadyTimerRef    = useRef<ReturnType<typeof setTimeout> | null>(null);
  const cameraActivateTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // ── cameraPreviewReady: true only after onCameraReady fires ───────────────
  const [cameraPreviewReady, setCameraPreviewReady] = useState(false);

  const isFocused = true;

  // ── cameraActive: immediate mount on web ──────────────────────────────────
  const [cameraActive, setCameraActive] = useState(true);

  const focusCountRef = useRef(0);
  const [focusKey, setFocusKey] = useState(0);

  useEffect(() => {
    if (cameraActivateTimerRef.current) {
      clearTimeout(cameraActivateTimerRef.current);
      cameraActivateTimerRef.current = null;
    }

    if (isFocused) {
      setCameraActive(true);
    } else {
      setCameraActive(false);
      setCameraPreviewReady(false);
    }

    return () => {
      if (cameraActivateTimerRef.current) {
        clearTimeout(cameraActivateTimerRef.current);
        cameraActivateTimerRef.current = null;
      }
    };
  }, [isFocused]);

  useEffect(() => {
    cameraAvailableRef.current = cameraAvailable;
  }, [cameraAvailable]);

  useEffect(() => {
    cameraAvailableRef.current = true;
    setCameraAvailable(true);
  }, []);

  const { colors }  = useTheme();
  const topInset    = 16;
  const bottomInset = 24;

  // ── Hardware availability check ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    const timeout = new Promise<boolean>((resolve) =>
      setTimeout(() => resolve(true), 3000)
    );
    Promise.race([CameraView.isAvailableAsync(), timeout])
      .then((available) => {
        if (!cancelled) setHardwareAvailable(available);
      })
      .catch(() => {
        if (!cancelled) setHardwareAvailable(true);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // ── Camera ready watchdog ──────────────────────────────────────────────────
  useEffect(() => {
    if (!permission?.granted || hardwareAvailable === null || !cameraActive) return;

    const timeoutMs = hardwareAvailable === false ? 5000 : 12000;

    cameraReadyTimerRef.current = setTimeout(() => {
      setCameraAvailable((prev) => {
        if (prev) setCameraErrorType("unavailable");
        return false;
      });
    }, timeoutMs);

    return () => {
      if (cameraReadyTimerRef.current) {
        clearTimeout(cameraReadyTimerRef.current);
        cameraReadyTimerRef.current = null;
      }
    };
  }, [permission?.granted, hardwareAvailable, cameraActive, focusKey]);

  function markCameraUnavailable(type: CameraErrorType) {
    if (cameraReadyTimerRef.current) {
      clearTimeout(cameraReadyTimerRef.current);
      cameraReadyTimerRef.current = null;
    }
    if (cameraPreviewSafetyRef.current) {
      clearTimeout(cameraPreviewSafetyRef.current);
      cameraPreviewSafetyRef.current = null;
    }
    cameraAvailableRef.current = false;
    setCameraErrorType(type);
    setCameraAvailable(false);
  }

  // ── Safety net: lift the black cover if onCameraReady never fires ──────────
  const cameraPreviewSafetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (cameraPreviewSafetyRef.current) {
      clearTimeout(cameraPreviewSafetyRef.current);
      cameraPreviewSafetyRef.current = null;
    }
    if (cameraActive && !cameraPreviewReady) {
      cameraPreviewSafetyRef.current = setTimeout(() => {
        if (!cameraAvailableRef.current) return;
        setCameraPreviewReady((prev) => (prev ? prev : true));
      }, 5000);
    }
    return () => {
      if (cameraPreviewSafetyRef.current) {
        clearTimeout(cameraPreviewSafetyRef.current);
        cameraPreviewSafetyRef.current = null;
      }
    };
  }, [cameraActive, cameraPreviewReady]);

  function markCameraReady() {
    if (cameraReadyTimerRef.current) {
      clearTimeout(cameraReadyTimerRef.current);
      cameraReadyTimerRef.current = null;
    }
    if (cameraPreviewSafetyRef.current) {
      clearTimeout(cameraPreviewSafetyRef.current);
      cameraPreviewSafetyRef.current = null;
    }
    setCameraPreviewReady(true);
  }

  function handleCameraRetry() {
    if (cameraReadyTimerRef.current) {
      clearTimeout(cameraReadyTimerRef.current);
      cameraReadyTimerRef.current = null;
    }
    if (cameraPreviewSafetyRef.current) {
      clearTimeout(cameraPreviewSafetyRef.current);
      cameraPreviewSafetyRef.current = null;
    }
    focusCountRef.current += 1;
    setFocusKey(focusCountRef.current);
    setCameraPreviewReady(false);
    cameraAvailableRef.current = true;
    setCameraAvailable(true);
    setCameraErrorType("unavailable");
  }

  // ── Scanner hook ──────────────────────────────────────────────────────────
  const {
    user,
    scanned,
    processing,
    scanSuccess,
    anonymousMode,
    setAnonymousMode,
    zoom,
    zoomLabel,
    facing,
    galleryErrorMsg,
    dismissGalleryError,
    scannerMsg,
    scannerMsgType,
    dismissScannerMsg,
    conversionBannerMsg,
    dismissConversionBanner,
    handleBarCodeScanned,
    handlePickImage,
    cycleZoom,
    onQRBoundsDetected,
  } = useScanner({ isCameraAvailable: cameraAvailable });

  // ── Barcode handler — wires smart zoom before processing ─────────────────
  const handleScanWithCount = useCallback(
    (data: any) => {
      onQRBoundsDetected(data?.bounds);
      handleBarCodeScanned(data);
    },
    [handleBarCodeScanned, onQRBoundsDetected]
  );

  // ── cameraLive — computed once here, used by tap-to-focus and JSX ────────
  const cameraLive =
    cameraActive && hardwareAvailable !== null && cameraAvailable && cameraPreviewReady;

  // ── Tap-to-focus ──────────────────────────────────────────────────────────
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number; key: number } | null>(null);
  const focusRingTimer              = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [autofocusMode]             = useState<"on" | "off" | undefined>(AUTOFOCUS_MODE);

  const handleTapFocus = useCallback(
    (x: number, y: number) => {
      if (!cameraLive || scanned) return;

      if (focusRingTimer.current) clearTimeout(focusRingTimer.current);
      setFocusPoint({ x, y, key: Date.now() });

      focusRingTimer.current = setTimeout(() => {
        setFocusPoint(null);
      }, 1140);
    },
    [cameraLive, scanned]
  );

  // Cleanup focus ring timer on unmount
  useEffect(() => {
    return () => {
      if (focusRingTimer.current) clearTimeout(focusRingTimer.current);
    };
  }, []);

  // ── Permission not yet resolved ────────────────────────────────────────────
  if (!permission) {
    return <section className={styles.scannerRootBlack} aria-label="QR Scanner" />;
  }

  if (!permission.granted) {
    return (
      <section
        className={styles.permissionRoot}
        style={{ backgroundColor: colors.background }}
        aria-labelledby="permission-title"
      >
        <PermissionScreen
          canAskAgain={permission.canAskAgain}
          onRequestPermission={requestPermission}
        />
        {scannerMsg && (
          <div style={{ ...toastContainerStyle, bottom: 32 }}>
            <ScannerToast
              message={scannerMsg}
              type={scannerMsgType}
              onDone={dismissScannerMsg}
            />
          </div>
        )}
      </section>
    );
  }

  return (
    <section className={styles.scannerRootBlack} aria-labelledby="scanner-title">
      {/* Black placeholder holds space during all non-camera states */}
      <div className={styles.blackPlaceholder} />

      {hardwareAvailable === null ? null : !cameraAvailable && isFocused ? (
        <div className={styles.unavailableOverlay}>
          <div
            className={styles.unavailableTopBar}
            style={{
              paddingTop:    topInset + 8,
              paddingLeft:   16,
              paddingRight:  16,
              paddingBottom: 10,
            }}
          >
            <button
              type="button"
              onClick={() => {
                stopSharedCameraStream();
                router.replace("/");
              }}
              className={styles.unavailableBackBtn}
              aria-label="Go back"
            >
              <Ionicons name="chevron-back" size={22} color="#fff" />
            </button>
          </div>
          <div className={styles.unavailableCenter}>
            <CameraUnavailableBanner
              onPickImage={handlePickImage}
              onRetry={handleCameraRetry}
              errorType={cameraErrorType}
            />
          </div>
        </div>
      ) : cameraActive ? (
        <CameraErrorBoundary onError={() => markCameraUnavailable("unavailable")}>
          <>
            <CameraView
              key={focusKey}
              facing={facing}
              zoom={zoom}
              autofocus={autofocusMode}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              onBarcodeScanned={handleScanWithCount}
              onCameraReady={markCameraReady}
              onMountError={(error) => {
                const msg = (error?.message ?? "").toLowerCase();
                const isInUse =
                  msg.includes("in use") ||
                  msg.includes("busy") ||
                  msg.includes("already") ||
                  msg.includes("another app") ||
                  msg.includes("restricted");
                markCameraUnavailable(isInUse ? "inuse" : "unavailable");
              }}
            />

            {/* Blue-frame shield — removed once onCameraReady fires */}
            {!cameraPreviewReady && <div className={styles.blackShield} />}
          </>
        </CameraErrorBoundary>
      ) : null}

      {/* Tap-to-focus area — transparent, sits between camera and overlay */}
      {cameraLive && !scanned && (
        <div
          className={styles.tapFocusArea}
          onClick={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            handleTapFocus(e.clientX - rect.left, e.clientY - rect.top);
          }}
        />
      )}

      {/* Tap-to-focus ring indicator */}
      {focusPoint && (
        <div
          key={focusPoint.key}
          className={styles.focusRing}
          style={{
            left: focusPoint.x - 28,
            top:  focusPoint.y - 28,
          }}
        />
      )}

      {/* Scanner overlay (controls, finder, animations) */}
      {cameraAvailable && (
        <ScannerOverlay
          topInset={topInset}
          bottomInset={bottomInset}
          zoom={zoom}
          zoomLabel={zoomLabel}
          onCycleZoom={cycleZoom}
          scanned={scanned}
          scanSuccess={scanSuccess}
          anonymousMode={anonymousMode}
          onToggleAnonymous={() => setAnonymousMode(!anonymousMode)}
          onPickImage={handlePickImage}
          user={user}
        />
      )}

      {/* Processing overlay */}
      {processing && <ProcessingOverlay />}

      <ConversionBanner
        message={conversionBannerMsg}
        visible={!user && !!conversionBannerMsg}
        bottomOffset={bottomInset + 16}
        onSignIn={() => {
          dismissConversionBanner();
          stopSharedCameraStream();
          router.push("/");
        }}
        onDismiss={dismissConversionBanner}
      />

      {galleryErrorMsg && (
        <div
          style={{
            ...toastContainerStyle,
            bottom: bottomInset + (conversionBannerMsg ? 96 : 16),
          }}
        >
          <ScannerToast
            message={galleryErrorMsg}
            type="error"
            onDone={dismissGalleryError}
          />
        </div>
      )}

      {scannerMsg && !galleryErrorMsg && (
        <div style={{ ...toastContainerStyle, bottom: bottomInset + 16 }}>
          <ScannerToast
            message={scannerMsg}
            type={scannerMsgType}
            onDone={dismissScannerMsg}
          />
        </div>
      )}
    </section>
  );
}
