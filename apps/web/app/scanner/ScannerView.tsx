"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import styles from "./scanner.module.css";

const CAMERA_PERMISSION_KEY = "binro_camera_permission_granted";

type DetectorResult = { rawValue?: string };
type Detector = { detect: (source: HTMLVideoElement) => Promise<DetectorResult[]> };
type DetectorConstructor = new (options?: { formats?: string[] }) => Detector;
type BarcodeDetectorWindow = Window & { BarcodeDetector?: DetectorConstructor };

async function getQrDetailsPath(value: string): Promise<string | null> {
  const raw = value.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw, window.location.origin);
    const match = url.pathname.match(/\/qr\/([^/?#]+)/i);
    if (match?.[1]) return `/qr/${encodeURIComponent(match[1])}`;
  } catch {
    /* raw QR data may be non-URL or a direct share code */
  }
  if (/^[0-9a-zA-Z]{1,14}$/.test(raw) || /^[0-9a-f]{20}$/i.test(raw)) {
    return `/qr/${encodeURIComponent(raw)}`;
  }
  if (typeof window !== "undefined" && window.crypto?.subtle) {
    const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
    const qrId = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 20);
    return `/qr/${qrId}?content=${encodeURIComponent(raw)}`;
  }
  return `/qr/custom?content=${encodeURIComponent(raw)}`;
}

function decodeVideoFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): string | null {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) {
    return null;
  }
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" })?.data ?? null;
}

function Icon({ name, size = 22 }: { name: "camera" | "gallery" | "torch" | "back"; size?: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.8,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    "aria-hidden": true,
  };
  if (name === "back") return <svg {...common}><path d="m15 5-7 7 7 7" /></svg>;
  if (name === "gallery") {
    return (
      <svg {...common}>
        <rect x="3" y="5" width="18" height="15" rx="2" />
        <circle cx="8" cy="10" r="1.4" />
        <path d="m4 17 4.5-4 3 2.5 2-2 5.5 4.5" />
      </svg>
    );
  }
  if (name === "torch") {
    return (
      <svg {...common}>
        <path d="m9 3 6 0-1 5-4 4-1 7 6 0-1-7-4-4-1-5Z" />
        <path d="M5 21h14" />
      </svg>
    );
  }
  return (
    <svg {...common}>
      <path d="M8 5H6a2 2 0 0 0-2 2v2M16 5h2a2 2 0 0 1 2 2v2M20 15v2a2 2 0 0 1-2 2h-2M8 19H6a2 2 0 0 1-2-2v-2" />
      <path d="M8 9h8v6H8z" />
    </svg>
  );
}

export default function ScannerView() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const detectingRef = useRef(false);

  const [status, setStatus] = useState<"permission" | "starting" | "ready" | "error" | "unsupported">("permission");
  const [error, setError] = useState("");
  const [torch, setTorch] = useState(false);

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) {
      cancelAnimationFrame(frameRef.current);
      frameRef.current = null;
    }
    detectingRef.current = false;
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setTorch(false);
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setError("");
    setStatus("starting");

    if (typeof navigator === "undefined" || !navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      setError("Camera access is not supported by your browser environment.");
      return;
    }

    // Try multiple camera constraints in progressive fallback order
    const constraintSets: MediaStreamConstraints[] = [
      { audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 } } },
      { audio: false, video: { facingMode: "environment" } },
      { audio: false, video: { facingMode: "user" } },
      { audio: false, video: true },
    ];

    let stream: MediaStream | null = null;
    let lastError: any = null;

    for (const constraints of constraintSets) {
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        if (stream) break;
      } catch (err: any) {
        lastError = err;
        // If user denied permission explicitly, don't continue looping constraints
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          break;
        }
      }
    }

    if (!stream) {
      stopCamera();
      setStatus("permission");
      const errName = lastError?.name;
      if (errName === "NotAllowedError" || errName === "PermissionDeniedError") {
        setError("Camera permission was denied. Please allow camera access in your browser and tap Enable Camera.");
      } else if (errName === "NotFoundError" || errName === "DevicesNotFoundError") {
        setError("No camera was found on this device.");
      } else if (errName === "NotReadableError" || errName === "TrackStartError") {
        setError("Camera is in use by another application. Please close other camera apps and retry.");
      } else {
        setError("Could not open camera. Please allow camera permissions and tap Enable Camera.");
      }
      return;
    }

    // Permission granted! Remember it so we don't ask again on future visits
    try {
      localStorage.setItem(CAMERA_PERMISSION_KEY, "true");
    } catch {}

    streamRef.current = stream;

    const video = videoRef.current;
    if (video) {
      video.srcObject = stream;
      video.muted = true;
      video.setAttribute("playsinline", "true");
      video.setAttribute("muted", "true");
      video.setAttribute("autoplay", "true");

      try {
        await video.play();
      } catch (playErr) {
        console.warn("[Scanner] video.play() warning:", playErr);
        video.onloadedmetadata = async () => {
          try {
            await video.play();
          } catch {}
        };
      }
    }

    setStatus("ready");
    setError("");

    // Safe BarcodeDetector setup
    let detector: Detector | null = null;
    try {
      const DetectorApi = (window as BarcodeDetectorWindow).BarcodeDetector;
      if (DetectorApi) {
        detector = new DetectorApi({ formats: ["qr_code"] });
      }
    } catch {
      detector = null;
    }

    const scanFrame = async () => {
      if (!videoRef.current || !streamRef.current) return;
      if (!detectingRef.current && videoRef.current.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
        detectingRef.current = true;
        try {
          let value: string | null | undefined = null;
          if (detector) {
            try {
              const results = await detector.detect(videoRef.current);
              value = results.find((result) => result.rawValue)?.rawValue?.trim();
            } catch {
              // fallback to jsQR
            }
          }
          if (!value && canvasRef.current && videoRef.current) {
            value = decodeVideoFrame(videoRef.current, canvasRef.current);
          }
          if (value) {
            const path = await getQrDetailsPath(value);
            stopCamera();
            if (path) {
              router.push(path);
              return;
            } else {
              setStatus("error");
              setError("This QR code could not be opened by BinRo.");
            }
          }
        } catch {
          /* ignore frame decode anomalies and continue scan loop */
        } finally {
          detectingRef.current = false;
        }
      }
      frameRef.current = requestAnimationFrame(scanFrame);
    };

    frameRef.current = requestAnimationFrame(scanFrame);
  }, [router, stopCamera]);

  // Check if camera permission was already granted previously
  useEffect(() => {
    let previouslyGranted = false;
    try {
      previouslyGranted = localStorage.getItem(CAMERA_PERMISSION_KEY) === "true";
    } catch {}

    if (previouslyGranted) {
      // User already granted permission previously - open camera automatically!
      void startCamera();
    } else if (typeof navigator !== "undefined" && navigator.permissions?.query) {
      navigator.permissions
        .query({ name: "camera" as PermissionName })
        .then((res) => {
          if (res.state === "granted") {
            try {
              localStorage.setItem(CAMERA_PERMISSION_KEY, "true");
            } catch {}
            void startCamera();
          }
        })
        .catch(() => {});
    }

    return () => {
      stopCamera();
    };
  }, [startCamera, stopCamera]);

  const toggleTorch = useCallback(async () => {
    if (!streamRef.current) return;
    const track = streamRef.current.getVideoTracks()[0];
    if (!track) return;
    const nextState = !torch;
    try {
      await (track as any).applyConstraints({
        advanced: [{ torch: nextState }],
      });
      setTorch(nextState);
    } catch {
      // Torch not supported on current device
    }
  }, [torch]);

  // Gallery image decoder (only shown inside active scanner page)
  const handleImageFile = useCallback((file: File) => {
    if (!file) return;
    setError("");
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = async () => {
        const canvas = canvasRef.current ?? document.createElement("canvas");
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return;
        ctx.drawImage(img, 0, 0);
        const imgData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imgData.data, imgData.width, imgData.height, {
          inversionAttempts: "attemptBoth",
        });
        if (code && code.data) {
          const path = await getQrDetailsPath(code.data);
          stopCamera();
          if (path) {
            router.push(path);
          }
        } else {
          setError("No QR code detected in this photo. Please make sure the code is clearly framed and in focus.");
        }
      };
      img.src = reader.result as string;
    };
    reader.readAsDataURL(file);
  }, [router, stopCamera]);

  const isLightHeader = status !== "ready" && status !== "starting";

  return (
    <section className={styles.scannerCard} aria-labelledby="scanner-title">
      {/* Hidden file input for gallery upload (used inside scanner) */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        aria-label="Upload QR code image"
        style={{ display: "none" }}
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleImageFile(file);
        }}
      />

      {/* Camera Video & Canvas always rendered so refs are always mounted */}
      <div className={styles.cameraStage}>
        <video
          ref={videoRef}
          className={styles.cameraVideo}
          playsInline
          muted
          aria-label="QR camera preview"
        />
        <canvas ref={canvasRef} className={styles.decoderCanvas} aria-hidden="true" />
      </div>

      <div className={styles.scannerShade} />

      {/* ── Top Header with Back Button (ALWAYS VISIBLE in all states) ── */}
      <header className={styles.topHeader}>
        <Link
          href="/"
          className={`${styles.backButton} ${isLightHeader ? styles.backButtonLight : ""}`}
          aria-label="Back to home"
        >
          <Icon name="back" size={22} />
        </Link>
        <span className={`${styles.headerTitle} ${isLightHeader ? styles.headerTitleLight : ""}`}>
          BinRo Scanner
        </span>
        <div className={styles.headerPlaceholder} />
      </header>

      {/* ── Active Scanning View (status === "ready") ── */}
      {status === "ready" && (
        <>
          <h1 id="scanner-title" className={styles.scannerTitle}>
            Scan a QR code
          </h1>
          <div className={styles.finder} aria-hidden="true">
            <span />
            <div className={styles.scanBeam} />
          </div>
          {error ? <p className={styles.scannerError} role="alert">{error}</p> : null}

          {/* Controls: Gallery (Upload QR) and Torch ONLY inside the active scanner page */}
          <div className={styles.scannerControls}>
            <button
              type="button"
              className={styles.controlButton}
              onClick={() => fileInputRef.current?.click()}
              aria-label="Upload QR image from gallery"
            >
              <Icon name="gallery" size={27} />
              <span>Gallery</span>
            </button>
            <button
              type="button"
              className={`${styles.controlButton} ${torch ? styles.controlActive : ""}`}
              onClick={() => void toggleTorch()}
              aria-label="Toggle flashlight"
            >
              <Icon name="torch" size={27} />
              <span>Torch</span>
            </button>
          </div>

          <button
            type="button"
            className={styles.restartButton}
            onClick={() => void startCamera()}
          >
            Restart camera
          </button>
        </>
      )}

      {/* ── Connecting to Camera (status === "starting") ── */}
      {status === "starting" && (
        <div className={styles.cameraOverlay} role="status">
          <div style={{ textAlign: "center", color: "#ffffff" }}>
            <div style={{ marginBottom: 12, fontSize: 32 }}>📷</div>
            <strong style={{ fontSize: 16 }}>Opening camera...</strong>
            <p style={{ margin: "6px 0 0", color: "#b5cde6", fontSize: 13 }}>
              Please allow camera permissions if prompted
            </p>
          </div>
        </div>
      )}

      {/* ── Permission / Fallback View (status !== "ready" && status !== "starting") ── */}
      {status !== "ready" && status !== "starting" && (
        <div className={styles.permission} aria-labelledby="permission-title">
          <div className={styles.permissionIcon}>
            <Icon name="camera" size={48} />
          </div>
          <h1 id="permission-title">Camera Permission</h1>
          <p>
            We need access to your camera to scan QR codes with BinRo.
            <br className={styles.mobileBreak} />
            Camera access stays secure in your browser.
          </p>

          {error ? (
            <p className={styles.permissionError} role="alert">
              {error}
            </p>
          ) : null}

          {/* Single Primary Action: Enable Camera */}
          <button
            type="button"
            className={styles.enableButton}
            onClick={() => void startCamera()}
          >
            <Icon name="camera" size={20} /> Enable Camera
          </button>
        </div>
      )}
    </section>
  );
}
