"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import styles from "./scanner.module.css";

type DetectorResult = { rawValue?: string };
type Detector = {
  detect: (source: HTMLVideoElement) => Promise<DetectorResult[]>;
};
type DetectorConstructor = new (options?: { formats?: string[] }) => Detector;

function qrDetailsPath(value: string) {
  const raw = value.trim();
  try {
    const url = new URL(raw, window.location.origin);
    const match = url.pathname.match(/\/qr\/([^/?#]+)/i);
    if (match?.[1]) return `/qr/${encodeURIComponent(match[1])}`;
  } catch {
    // Raw QR data can be a share code rather than a URL.
  }

  if (/^[0-9a-zA-Z]{1,14}$/.test(raw)) {
    return `/qr/${encodeURIComponent(raw)}`;
  }
  return null;
}

export default function ScannerView() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const detectingRef = useRef(false);
  const [status, setStatus] = useState<"starting" | "ready" | "error" | "unsupported">("starting");
  const [error, setError] = useState("");
  const [detected, setDetected] = useState("");

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera();
    setError("");
    setDetected("");
    setStatus("starting");

    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported");
      setError("This browser does not provide camera access. Open BinRo in a current browser over HTTPS.");
      return;
    }

    const DetectorApi = (window as Window & { BarcodeDetector?: DetectorConstructor }).BarcodeDetector;
    if (!DetectorApi) {
      setStatus("unsupported");
      setError("Live QR decoding is not available in this browser yet. Try the latest Chrome or Edge.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } },
      });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream;
      await videoRef.current.play();
      setStatus("ready");

      const detector = new DetectorApi({ formats: ["qr_code"] });
      const scanFrame = async () => {
        if (!videoRef.current || !streamRef.current) return;
        if (!detectingRef.current) {
          detectingRef.current = true;
          try {
            const results = await detector.detect(videoRef.current);
            const value = results.find((result) => result.rawValue)?.rawValue?.trim();
            if (value) {
              const path = qrDetailsPath(value);
              stopCamera();
              if (path) {
                router.push(path);
              } else {
                setDetected(value);
                setStatus("error");
                setError("This QR code is not a BinRo details link.");
              }
              return;
            }
          } catch {
            // Keep scanning. A frame can be unavailable while the camera starts.
          } finally {
            detectingRef.current = false;
          }
        }
        frameRef.current = requestAnimationFrame(scanFrame);
      };
      frameRef.current = requestAnimationFrame(scanFrame);
    } catch (caught) {
      stopCamera();
      setStatus("error");
      const name = (caught as { name?: string })?.name;
      setError(
        name === "NotAllowedError"
          ? "Camera permission was denied. Allow camera access in your browser and try again."
          : name === "NotFoundError"
            ? "No camera was found on this device."
            : "The camera could not be opened. Check browser permissions and try again."
      );
    }
  }, [router, stopCamera]);

  useEffect(() => {
    void startCamera();
    return stopCamera;
  }, [startCamera, stopCamera]);

  return (
    <section className={styles.scannerCard} aria-labelledby="scanner-title">
      <div className={styles.cameraStage}>
        <video ref={videoRef} className={styles.cameraVideo} playsInline muted aria-label="QR camera preview" />
        <div className={styles.finder} aria-hidden="true" />
        {status === "starting" ? <div className={styles.cameraOverlay}>Opening camera…</div> : null}
      </div>
      <h2 id="scanner-title">Scan a BinRo QR code</h2>
      <p className={styles.scannerHelp}>
        Point your camera at a BinRo QR code. The matching public details page will open automatically.
      </p>
      {error ? <p className={styles.scannerError} role="alert">{error}</p> : null}
      {detected ? <code className={styles.detectedValue}>{detected}</code> : null}
      <button type="button" className={styles.primaryButton} onClick={() => void startCamera()}>
        {status === "ready" ? "Restart Camera" : "Enable Camera"}
      </button>
    </section>
  );
}