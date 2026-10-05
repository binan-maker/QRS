"use client";

// ─── Web CameraView & useCameraPermissions ────────────────────────────────────
// 1:1 Web implementation of expo-camera's CameraView and useCameraPermissions
// used by features/scanner/ScannerScreen.tsx.

import React, { useEffect, useRef, useState, useCallback } from "react";
import jsQRModule from "jsqr";
import { ZOOM_LEVELS } from "../../hooks/useCameraControls";
import styles from "../../scanner.module.css";

// Safely resolve jsQR across CJS / ESM bundler interop
let jsQrInstance: typeof jsQRModule | null =
  typeof jsQRModule === "function"
    ? jsQRModule
    : ((jsQRModule as any)?.default ?? (jsQRModule as any)?.default?.default ?? null);

export async function loadJsQr(): Promise<typeof jsQRModule | null> {
  if (typeof jsQrInstance === "function") return jsQrInstance;
  try {
    const mod = await import("jsqr");
    const fn =
      typeof mod === "function"
        ? mod
        : ((mod as any)?.default ?? (mod as any)?.default?.default ?? mod);
    if (typeof fn === "function") {
      jsQrInstance = fn;
    }
  } catch {}
  return jsQrInstance;
}

/**
 * Validate that decoded QR string contains real payload.
 * Crucial: Rejects bare URI schemes like "tel:", "sms:", "mailto:" with no content,
 * which can be emitted by buggy native BarcodeDetector implementations on Android.
 */
export function isValidDecodedQr(str: unknown): str is string {
  if (typeof str !== "string") return false;
  const trimmed = str.trim();
  if (!trimmed || trimmed.length < 2) return false;
  // Reject bare schemes with no payload
  if (/^(tel|sms|smsto|mailto|http|https|geo|wifi):?$/i.test(trimmed)) return false;
  const lower = trimmed.toLowerCase();
  if (lower.startsWith("tel:") && trimmed.replace(/^tel:/i, "").trim().length < 3) return false;
  if (lower.startsWith("sms:") && trimmed.replace(/^sms:/i, "").trim().length < 3) return false;
  if (lower.startsWith("smsto:") && trimmed.replace(/^smsto:/i, "").trim().length < 3) return false;
  if (lower.startsWith("mailto:") && !trimmed.includes("@")) return false;
  return true;
}

const CAMERA_PERMISSION_KEY = "binro_camera_permission_granted";
const CAMERA_COOKIE_NAME    = "binro_cam_granted";

function hasRememberedCameraPermission(): boolean {
  if (typeof window === "undefined") return false;
  try {
    if (localStorage.getItem(CAMERA_PERMISSION_KEY) === "true") return true;
  } catch {}
  try {
    if (sessionStorage.getItem(CAMERA_PERMISSION_KEY) === "true") return true;
  } catch {}
  try {
    if (document.cookie.split(";").some((c) => c.trim().startsWith(`${CAMERA_COOKIE_NAME}=1`))) {
      return true;
    }
  } catch {}
  return false;
}

function rememberCameraPermission(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(CAMERA_PERMISSION_KEY, "true");
  } catch {}
  try {
    sessionStorage.setItem(CAMERA_PERMISSION_KEY, "true");
  } catch {}
  try {
    document.cookie = `${CAMERA_COOKIE_NAME}=1; path=/; max-age=31536000; SameSite=Lax`;
  } catch {}
}

function clearRememberedCameraPermission(): void {
  if (typeof window === "undefined") return;
  try {
    localStorage.removeItem(CAMERA_PERMISSION_KEY);
  } catch {}
  try {
    sessionStorage.removeItem(CAMERA_PERMISSION_KEY);
  } catch {}
  try {
    document.cookie = `${CAMERA_COOKIE_NAME}=; path=/; max-age=0; SameSite=Lax`;
  } catch {}
}

// Shared live stream cache so a stream acquired during user gesture in
// requestPermission() is immediately handed to <CameraView> without a second prompt.
let sharedMediaStream: MediaStream | null = null;
let sharedStreamFacing: "back" | "front" | null = null;
let pendingStreamPromise: Promise<{ stream: MediaStream | null; error: any }> | null = null;
let deferredStopTimer: ReturnType<typeof setTimeout> | null = null;

function cancelDeferredStreamStop(): void {
  if (deferredStopTimer !== null) {
    clearTimeout(deferredStopTimer);
    deferredStopTimer = null;
  }
}

function isStreamLive(stream: MediaStream | null): boolean {
  if (!stream) return false;
  return stream.getVideoTracks().some((t) => t.readyState === "live");
}

export function stopSharedCameraStream(): void {
  cancelDeferredStreamStop();
  if (sharedMediaStream) {
    sharedMediaStream.getTracks().forEach((track) => {
      try {
        (track as any).applyConstraints?.({ advanced: [{ torch: false }] }).catch(() => {});
      } catch {}
      track.stop();
    });
    sharedMediaStream = null;
    sharedStreamFacing = null;
  }
}

function applyContinuousFocusIfSupported(stream: MediaStream): void {
  const track = stream.getVideoTracks()[0];
  if (!track || typeof (track as any).applyConstraints !== "function") return;
  try {
    const caps =
      typeof (track as any).getCapabilities === "function"
        ? (track as any).getCapabilities()
        : null;
    const advanced: Record<string, any> = {};
    if (!caps || (Array.isArray(caps.focusMode) && caps.focusMode.includes("continuous"))) {
      advanced.focusMode = "continuous";
    }
    if (caps && Array.isArray(caps.exposureMode) && caps.exposureMode.includes("continuous")) {
      advanced.exposureMode = "continuous";
    }
    if (caps && Array.isArray(caps.whiteBalanceMode) && caps.whiteBalanceMode.includes("continuous")) {
      advanced.whiteBalanceMode = "continuous";
    }
    if (Object.keys(advanced).length > 0) {
      (track as any).applyConstraints({ advanced: [advanced] }).catch(() => {});
    }
  } catch {}
}

async function acquireCameraStream(
  facing: "back" | "front" = "back"
): Promise<{ stream: MediaStream | null; error: any }> {
  cancelDeferredStreamStop();

  if (isStreamLive(sharedMediaStream) && (!sharedStreamFacing || sharedStreamFacing === facing)) {
    return { stream: sharedMediaStream, error: null };
  }

  if (sharedMediaStream && sharedStreamFacing && sharedStreamFacing !== facing) {
    stopSharedCameraStream();
  }

  if (pendingStreamPromise) {
    return pendingStreamPromise;
  }

  pendingStreamPromise = (async () => {
    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      return {
        stream: null,
        error: new Error("Camera access is not supported by your browser."),
      };
    }

    const preferredFacing = facing === "front" ? "user" : "environment";
    const constraintSets: MediaStreamConstraints[] = [
      {
        audio: false,
        video: {
          facingMode: { ideal: preferredFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      },
      { audio: false, video: { facingMode: preferredFacing } },
      { audio: false, video: { facingMode: "user" } },
      { audio: false, video: true },
    ];

    let lastError: any = null;
    for (const constraints of constraintSets) {
      try {
        const s = await navigator.mediaDevices.getUserMedia(constraints);
        if (s) {
          sharedMediaStream = s;
          sharedStreamFacing = facing;
          rememberCameraPermission();
          applyContinuousFocusIfSupported(s);
          return { stream: s, error: null };
        }
      } catch (err: any) {
        lastError = err;
        if (err?.name === "NotAllowedError" || err?.name === "PermissionDeniedError") {
          break;
        }
      }
    }
    return { stream: null, error: lastError };
  })().finally(() => {
    pendingStreamPromise = null;
  });

  return pendingStreamPromise;
}

export interface WebCameraPermissionResponse {
  granted:     boolean;
  canAskAgain: boolean;
  status:      "granted" | "denied" | "undetermined";
}

async function detectBrowserCameraPermission(): Promise<WebCameraPermissionResponse> {
  if (typeof navigator === "undefined") {
    return { granted: false, canAskAgain: true, status: "undetermined" };
  }

  if (navigator.permissions?.query) {
    try {
      const status = await navigator.permissions.query({ name: "camera" as PermissionName });
      if (status.state === "granted") {
        rememberCameraPermission();
        return { granted: true, canAskAgain: true, status: "granted" };
      }
      if (status.state === "denied") {
        clearRememberedCameraPermission();
        return { granted: false, canAskAgain: false, status: "denied" };
      }
    } catch {}
  }

  if (hasRememberedCameraPermission()) {
    return { granted: true, canAskAgain: true, status: "granted" };
  }

  if (navigator.mediaDevices?.enumerateDevices) {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const hasLabeledCamera = devices.some(
        (d) => d.kind === "videoinput" && typeof d.label === "string" && d.label.trim().length > 0
      );
      if (hasLabeledCamera) {
        rememberCameraPermission();
        return { granted: true, canAskAgain: true, status: "granted" };
      }
    } catch {}
  }

  return { granted: false, canAskAgain: true, status: "undetermined" };
}

export function useCameraPermissions(): [
  WebCameraPermissionResponse | null,
  () => Promise<WebCameraPermissionResponse>
] {
  const [permission, setPermission] = useState<WebCameraPermissionResponse | null>(null);

  useEffect(() => {
    let mounted = true;
    let permStatusObj: PermissionStatus | null = null;

    if (hasRememberedCameraPermission()) {
      setPermission({ granted: true, canAskAgain: true, status: "granted" });
    }

    const fallbackTimer = setTimeout(() => {
      if (mounted) {
        setPermission((prev) =>
          prev ?? {
            granted: hasRememberedCameraPermission(),
            canAskAgain: true,
            status: hasRememberedCameraPermission() ? "granted" : "undetermined",
          }
        );
      }
    }, 450);

    detectBrowserCameraPermission().then((res) => {
      clearTimeout(fallbackTimer);
      if (mounted) setPermission(res);
    });

    if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "camera" as PermissionName })
        .then((status) => {
          if (!mounted) return;
          permStatusObj = status;
          status.onchange = () => {
            if (!mounted) return;
            if (status.state === "granted") {
              rememberCameraPermission();
              setPermission({ granted: true, canAskAgain: true, status: "granted" });
            } else if (status.state === "denied") {
              clearRememberedCameraPermission();
              stopSharedCameraStream();
              setPermission({ granted: false, canAskAgain: false, status: "denied" });
            }
          };
        })
        .catch(() => {});
    }

    const onDeniedEvent = () => {
      if (!mounted) return;
      clearRememberedCameraPermission();
      stopSharedCameraStream();
      setPermission({ granted: false, canAskAgain: false, status: "denied" });
    };

    window.addEventListener("binro_camera_permission_denied", onDeniedEvent);

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
      window.removeEventListener("binro_camera_permission_denied", onDeniedEvent);
      if (permStatusObj) permStatusObj.onchange = null;
    };
  }, []);

  const requestPermission = useCallback(async (): Promise<WebCameraPermissionResponse> => {
    const { stream, error } = await acquireCameraStream("back");
    if (stream) {
      const grantedState: WebCameraPermissionResponse = {
        granted: true,
        canAskAgain: true,
        status: "granted",
      };
      setPermission(grantedState);
      return grantedState;
    }

    const errName = error?.name ?? "";
    if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
      clearRememberedCameraPermission();
      const deniedState: WebCameraPermissionResponse = {
        granted: false,
        canAskAgain: false,
        status: "denied",
      };
      setPermission(deniedState);
      return deniedState;
    }

    // Permission itself was allowed (or hardware error occurred after permission):
    // let ScannerScreen mount CameraView so CameraUnavailableBanner can handle hardware errors.
    const fallbackGranted: WebCameraPermissionResponse = {
      granted: true,
      canAskAgain: true,
      status: "granted",
    };
    setPermission(fallbackGranted);
    return fallbackGranted;
  }, []);

  return [permission, requestPermission];
}

type DetectorResult = {
  rawValue?: string;
  boundingBox?: { width?: number; height?: number; x?: number; y?: number };
};
type Detector = { detect: (source: ImageBitmapSource) => Promise<DetectorResult[]> };
type DetectorConstructor = new (options?: { formats?: string[] }) => Detector;
type BarcodeDetectorWindow = Window & { BarcodeDetector?: DetectorConstructor };

interface DecodedFrameResult {
  data: string;
  bounds?: { size: { width: number; height: number }; origin: { x: number; y: number } };
}

function runJsQrOnRegion(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement,
  sx: number,
  sy: number,
  sw: number,
  sh: number,
  targetW: number,
  targetH: number
): DecodedFrameResult | null {
  if (sw <= 0 || sh <= 0 || targetW <= 0 || targetH <= 0) return null;
  const engine = jsQrInstance;
  if (typeof engine !== "function") return null;

  if (canvas.width !== targetW) canvas.width = targetW;
  if (canvas.height !== targetH) canvas.height = targetH;

  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;

  context.drawImage(video, sx, sy, sw, sh, 0, 0, targetW, targetH);

  const image = context.getImageData(0, 0, targetW, targetH);
  const result = engine(image.data, image.width, image.height, {
    inversionAttempts: "attemptBoth",
  });
  if (!result || !result.data || !isValidDecodedQr(result.data)) return null;

  let bounds:
    | { size: { width: number; height: number }; origin: { x: number; y: number } }
    | undefined;
  if (result.location?.topRightCorner && result.location?.topLeftCorner && targetW > 0) {
    const dx = result.location.topRightCorner.x - result.location.topLeftCorner.x;
    const dy = result.location.topRightCorner.y - result.location.topLeftCorner.y;
    const qrRatioInCrop = Math.hypot(dx, dy) / targetW;
    const cropRatioInVideo = sw / (video.videoWidth || sw);
    const screenW = video.clientWidth || window.innerWidth || 390;
    const pixelW  = qrRatioInCrop * cropRatioInVideo * screenW;
    bounds = {
      size:   { width: pixelW, height: pixelW },
      origin: { x: result.location.topLeftCorner.x, y: result.location.topLeftCorner.y },
    };
  }
  return { data: result.data.trim(), bounds };
}

/**
 * Video frame QR decoder matching features/scanner/utils/qr-decode.ts
 * and expo-camera web (captureImageData + jsQR with attemptBoth):
 * 1. Center finder square ROI at 1:1 native pixel resolution (where users align the QR)
 * 2. Full video frame scaled down to maxDim = 1200 (identical to gallery scan)
 * 3. Half-scale crop for dense / high-density QR codes
 */
function decodeVideoFrame(
  video: HTMLVideoElement,
  canvas: HTMLCanvasElement
): DecodedFrameResult | null {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !vw || !vh) {
    return null;
  }

  // Pass 1: Center square ROI at 1:1 native pixel resolution (primary aiming zone)
  const minDim = Math.min(vw, vh);
  const cropSize = Math.min(480, Math.round(minDim * 0.72));
  const cropX = Math.round((vw - cropSize) / 2);
  const cropY = Math.round((vh - cropSize) / 2);

  const centerHit = runJsQrOnRegion(
    video,
    canvas,
    cropX,
    cropY,
    cropSize,
    cropSize,
    cropSize,
    cropSize
  );
  if (centerHit) return centerHit;

  // Pass 2: Full video frame at native/scaled resolution (capped at maxDim = 1200, matching gallery decodeQrFromImageUri)
  const maxDim = 1200;
  const scale =
    vw > maxDim || vh > maxDim ? maxDim / Math.max(vw, vh) : 1;
  const fullW = Math.max(1, Math.round(vw * scale));
  const fullH = Math.max(1, Math.round(vh * scale));

  const fullHit = runJsQrOnRegion(video, canvas, 0, 0, vw, vh, fullW, fullH);
  if (fullHit) return fullHit;

  // Pass 3: Half-scale center crop for dense QR codes
  if (cropSize >= 360) {
    const halfHit = runJsQrOnRegion(
      video,
      canvas,
      cropX,
      cropY,
      cropSize,
      cropSize,
      Math.round(cropSize * 0.5),
      Math.round(cropSize * 0.5)
    );
    if (halfHit) return halfHit;
  }

  return null;
}

export interface CameraViewProps {
  facing?:                 "back" | "front";
  enableTorch?:            boolean;
  zoom?:                   number;
  autofocus?:              "on" | "off";
  barcodeScannerSettings?: { barcodeTypes: string[] };
  onBarcodeScanned?:       (result: {
    data: string;
    bounds?: { size: { width: number; height: number }; origin: { x: number; y: number } };
  }) => void;
  onCameraReady?:          () => void;
  onMountError?:           (error: { message: string }) => void;
}

export function CameraView({
  facing = "back",
  enableTorch = false,
  zoom = 0,
  onBarcodeScanned,
  onCameraReady,
  onMountError,
}: CameraViewProps) {
  const videoRef        = useRef<HTMLVideoElement | null>(null);
  const canvasRef       = useRef<HTMLCanvasElement | null>(null);
  const frameRef        = useRef<number | null>(null);
  const detectingRef    = useRef(false);
  const lastScanTimeRef = useRef(0);

  const onBarcodeScannedRef = useRef(onBarcodeScanned);
  const onCameraReadyRef    = useRef(onCameraReady);
  const onMountErrorRef     = useRef(onMountError);

  useEffect(() => { onBarcodeScannedRef.current = onBarcodeScanned; }, [onBarcodeScanned]);
  useEffect(() => { onCameraReadyRef.current    = onCameraReady;    }, [onCameraReady]);
  useEffect(() => { onMountErrorRef.current     = onMountError;     }, [onMountError]);

  useEffect(() => {
    void loadJsQr();
  }, []);

  // ── Mount & start camera stream ────────────────────────────────────────────
  useEffect(() => {
    let cancelled = false;
    cancelDeferredStreamStop();

    const start = async () => {
      const { stream, error } = await acquireCameraStream(facing);
      if (cancelled) return;

      if (!stream) {
        const errName = error?.name ?? "";
        const errMsg  = error?.message ?? "";
        const isPermissionDenied =
          errName === "NotAllowedError" ||
          errName === "PermissionDeniedError" ||
          errMsg.toLowerCase().includes("denied") ||
          errMsg.toLowerCase().includes("permission");

        if (isPermissionDenied) {
          clearRememberedCameraPermission();
          if (typeof window !== "undefined") {
            window.dispatchEvent(new CustomEvent("binro_camera_permission_denied"));
          }
        }

        const isInUse =
          errName === "NotReadableError" ||
          errName === "TrackStartError" ||
          errMsg.toLowerCase().includes("in use") ||
          errMsg.toLowerCase().includes("busy");
        onMountErrorRef.current?.({
          message: isInUse ? "Camera is already in use by another app" : errMsg || "Camera unavailable",
        });
        return;
      }

      const video = videoRef.current;
      if (!video) return;

      if (video.srcObject !== stream) {
        video.srcObject = stream;
      }
      video.muted = true;
      video.setAttribute("playsinline", "true");
      video.setAttribute("muted", "true");
      video.setAttribute("autoplay", "true");

      let readyFired = false;
      const fireReady = () => {
        if (cancelled || readyFired) return;
        readyFired = true;
        onCameraReadyRef.current?.();
      };

      video.onloadeddata = fireReady;
      video.onplaying    = fireReady;

      try {
        await video.play();
        fireReady();
      } catch {
        video.onloadedmetadata = async () => {
          if (cancelled) return;
          try {
            await video.play();
            fireReady();
          } catch {}
        };
      }

      let detector: Detector | null = null;
      try {
        const DetectorApi = (window as BarcodeDetectorWindow).BarcodeDetector;
        if (DetectorApi) {
          detector = new DetectorApi({ formats: ["qr_code"] });
        }
      } catch {
        detector = null;
      }

      const scanLoop = async () => {
        if (cancelled) return;
        const vid = videoRef.current;
        const activeStream = (vid?.srcObject as MediaStream | null) ?? sharedMediaStream;

        const now = performance.now();
        if (
          vid &&
          isStreamLive(activeStream) &&
          !detectingRef.current &&
          now - lastScanTimeRef.current >= 120 &&
          vid.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA &&
          vid.videoWidth > 0 &&
          vid.videoHeight > 0
        ) {
          detectingRef.current = true;
          lastScanTimeRef.current = now;
          try {
            let decodedData: string | null = null;
            let bounds:
              | { size: { width: number; height: number }; origin: { x: number; y: number } }
              | undefined;

            // 1. Fast multi-pass jsQR on canvas (exact qr-decode.ts full frame + center ROI)
            if (canvasRef.current) {
              const res = decodeVideoFrame(vid, canvasRef.current);
              if (res) {
                decodedData = res.data;
                bounds      = res.bounds;
              }
            }

            // 2. Native BarcodeDetector fallback ONLY if jsQR didn't match and detector returns a valid payload
            if (!decodedData && detector) {
              try {
                const detectPromise = detector.detect(vid);
                const timeoutPromise = new Promise<DetectorResult[]>((resolve) =>
                  setTimeout(() => resolve([]), 120)
                );
                const results = await Promise.race([detectPromise, timeoutPromise]);
                const match = results.find(
                  (r) => r.rawValue && isValidDecodedQr(r.rawValue)
                );
                if (match?.rawValue) {
                  decodedData = match.rawValue.trim();
                  if (match.boundingBox?.width && vid.videoWidth > 0) {
                    const screenW = vid.clientWidth || window.innerWidth || 390;
                    const pixelW  = (match.boundingBox.width / vid.videoWidth) * screenW;
                    bounds = {
                      size:   { width: pixelW, height: pixelW },
                      origin: { x: match.boundingBox.x ?? 0, y: match.boundingBox.y ?? 0 },
                    };
                  }
                }
              } catch {}
            }

            if (decodedData && isValidDecodedQr(decodedData) && !cancelled) {
              onBarcodeScannedRef.current?.({ data: decodedData, bounds });
            }
          } catch {} finally {
            detectingRef.current = false;
          }
        }

        if (!cancelled) {
          frameRef.current = requestAnimationFrame(scanLoop);
        }
      };

      frameRef.current = requestAnimationFrame(scanLoop);
    };

    void start();

    return () => {
      cancelled = true;
      if (frameRef.current !== null) {
        cancelAnimationFrame(frameRef.current);
        frameRef.current = null;
      }
      detectingRef.current = false;
      // Defer stopping shared camera stream slightly so React StrictMode double-mount
      // or focusKey re-mount reuses the live stream without killing the hardware track.
      cancelDeferredStreamStop();
      deferredStopTimer = setTimeout(() => {
        deferredStopTimer = null;
        stopSharedCameraStream();
      }, 250);
    };
  }, [facing]);

  // ── Apply hardware torch when enableTorch changes ──────────────────────────
  useEffect(() => {
    const stream = sharedMediaStream;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    (async () => {
      try {
        await (track as any).applyConstraints({
          advanced: [{ torch: enableTorch }],
        });
      } catch {
        try {
          await (track as any).applyConstraints({
            torch: enableTorch,
            fillLightMode: enableTorch ? "flash" : "off",
          } as any);
        } catch {}
      }
    })();
  }, [enableTorch]);

  // ── Apply hardware zoom when zoom changes ──────────────────────────────────
  const zoomScale = (ZOOM_LEVELS.find((l) => l.zoom === zoom) ?? ZOOM_LEVELS[0]).scale;

  useEffect(() => {
    const stream = sharedMediaStream;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track) return;

    try {
      const caps =
        typeof (track as any).getCapabilities === "function"
          ? (track as any).getCapabilities()
          : null;
      if (caps?.zoom) {
        const minZ   = caps.zoom.min ?? 1;
        const maxZ   = caps.zoom.max ?? 3;
        const hwZoom = Math.min(maxZ, Math.max(minZ, zoomScale));
        (track as any).applyConstraints({ advanced: [{ zoom: hwZoom }] }).catch(() => {});
      }
    } catch {}
  }, [zoomScale]);

  return (
    <div className={styles.cameraStage}>
      <video
        ref={videoRef}
        className={`${styles.cameraVideo} ${enableTorch ? styles.cameraVideoTorch : ""}`}
        style={zoomScale > 1 ? { transform: `scale(${zoomScale})` } : undefined}
        playsInline
        muted
        aria-label="QR camera preview"
      />
      <canvas ref={canvasRef} className={styles.decoderCanvas} aria-hidden="true" />
    </div>
  );
}

CameraView.isAvailableAsync = async (): Promise<boolean> => {
  return typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;
};
