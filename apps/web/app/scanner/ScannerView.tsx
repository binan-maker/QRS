"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import jsQR from "jsqr";
import styles from "./scanner.module.css";

type DetectorResult = { rawValue?: string };
type Detector = { detect: (source: HTMLVideoElement) => Promise<DetectorResult[]> };
type DetectorConstructor = new (options?: { formats?: string[] }) => Detector;
type BarcodeDetectorWindow = Window & { BarcodeDetector?: DetectorConstructor };

async function getQrDetailsPath(value: string) {
  const raw = value.trim();
  if (!raw) return null;
  try {
    const url = new URL(raw, window.location.origin);
    const match = url.pathname.match(/\/qr\/([^/?#]+)/i);
    if (match?.[1]) return `/qr/${encodeURIComponent(match[1])}`;
  } catch { /* raw QR data can be a share code */ }
  if (/^[0-9a-zA-Z]{1,14}$/.test(raw) || /^[0-9a-f]{20}$/i.test(raw)) return `/qr/${encodeURIComponent(raw)}`;
  if (!window.crypto?.subtle) return null;
  const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(raw));
  const qrId = Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("").slice(0, 20);
  return `/qr/${qrId}?content=${encodeURIComponent(raw)}`;
}

function decodeVideoFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement) {
  if (video.readyState < HTMLMediaElement.HAVE_CURRENT_DATA || !video.videoWidth || !video.videoHeight) return null;
  canvas.width = video.videoWidth; canvas.height = video.videoHeight;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return null;
  context.drawImage(video, 0, 0, canvas.width, canvas.height);
  const image = context.getImageData(0, 0, canvas.width, canvas.height);
  return jsQR(image.data, image.width, image.height, { inversionAttempts: "attemptBoth" })?.data ?? null;
}

function Icon({ name, size = 22 }: { name: "camera" | "gallery" | "torch" | "back"; size?: number }) {
  const common = { width: size, height: size, viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: 1.8, strokeLinecap: "round" as const, strokeLinejoin: "round" as const, "aria-hidden": true };
  if (name === "back") return <svg {...common}><path d="m15 5-7 7 7 7" /></svg>;
  if (name === "gallery") return <svg {...common}><rect x="3" y="5" width="18" height="15" rx="2" /><circle cx="8" cy="10" r="1.4" /><path d="m4 17 4.5-4 3 2.5 2-2 5.5 4.5" /></svg>;
  if (name === "torch") return <svg {...common}><path d="m9 3 6 0-1 5-4 4-1 7 6 0-1-7-4-4-1-5Z" /><path d="M5 21h14" /></svg>;
  return <svg {...common}><path d="M8 5H6a2 2 0 0 0-2 2v2M16 5h2a2 2 0 0 1 2 2v2M20 15v2a2 2 0 0 1-2 2h-2M8 19H6a2 2 0 0 1-2-2v-2" /><path d="M8 9h8v6H8z" /></svg>;
}

export default function ScannerView() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const frameRef = useRef<number | null>(null);
  const detectingRef = useRef(false);
  const [status, setStatus] = useState<"permission" | "starting" | "ready" | "error" | "unsupported">("permission");
  const [error, setError] = useState("");
  const [torch, setTorch] = useState(false);

  const stopCamera = useCallback(() => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    frameRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  }, []);

  const startCamera = useCallback(async () => {
    stopCamera(); setError(""); setStatus("starting");
    if (!navigator.mediaDevices?.getUserMedia) {
      setStatus("unsupported"); setError("Camera access is not available in this browser."); return;
    }
    const DetectorApi = (window as BarcodeDetectorWindow).BarcodeDetector;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: "environment" }, width: { ideal: 1280 }, height: { ideal: 720 } } });
      streamRef.current = stream;
      if (!videoRef.current) return;
      videoRef.current.srcObject = stream; await videoRef.current.play(); setStatus("ready");
      const detector = DetectorApi ? new DetectorApi({ formats: ["qr_code"] }) : null;
      const scanFrame = async () => {
        if (!videoRef.current || !streamRef.current) return;
        if (!detectingRef.current) {
          detectingRef.current = true;
          try {
            const value = detector
              ? (await detector.detect(videoRef.current)).find((result) => result.rawValue)?.rawValue?.trim()
              : decodeVideoFrame(videoRef.current, canvasRef.current ?? document.createElement("canvas"));
            if (value) {
              const path = await getQrDetailsPath(value); stopCamera();
              if (path) router.push(path);
              else { setStatus("error"); setError("This QR code could not be opened by BinRo."); }
              return;
            }
          } catch { /* keep scanning while a frame is unavailable */ }
          finally { detectingRef.current = false; }
        }
        frameRef.current = requestAnimationFrame(scanFrame);
      };
      frameRef.current = requestAnimationFrame(scanFrame);
    } catch (caught) {
      stopCamera(); setStatus("permission");
      const name = (caught as { name?: string })?.name;
      setError(name === "NotAllowedError" ? "Camera permission was denied. You can allow it in your browser settings." : "The camera could not be opened. Try again.");
    }
  }, [router, stopCamera]);

  useEffect(() => () => stopCamera(), [stopCamera]);

  if (status === "permission" || status === "unsupported") {
    return (
      <section className={styles.permission} aria-labelledby="permission-title">
        <div className={styles.permissionIcon}><Icon name="camera" size={48} /></div>
        <h1 id="permission-title">Camera Permission</h1>
        <p>We need access to your camera to scan QR<br className={styles.mobileBreak} /> codes.</p>
        {error ? <p className={styles.permissionError} role="alert">{error}</p> : null}
        <button type="button" className={styles.enableButton} onClick={() => void startCamera()}><Icon name="camera" size={20} /> Enable Camera</button>
      </section>
    );
  }

  return (
    <section className={styles.scannerCard} aria-labelledby="scanner-title">
      <div className={styles.cameraStage}><video ref={videoRef} className={styles.cameraVideo} playsInline muted aria-label="QR camera preview" /><canvas ref={canvasRef} className={styles.decoderCanvas} aria-hidden="true" /></div>
      <div className={styles.scannerShade} />
      <div className={styles.scannerTop}><Link href="/" className={styles.backButton} aria-label="Back"><Icon name="back" /></Link><strong>BinRo</strong><span /></div>
      {status === "starting" ? <div className={styles.cameraOverlay} role="status">Opening camera</div> : null}
      <h1 id="scanner-title" className={styles.scannerTitle}>Scan a QR code</h1>
      <div className={styles.finder} aria-hidden="true"><span /><div className={styles.scanBeam} /></div>
      {error ? <p className={styles.scannerError} role="alert">{error}</p> : null}
      <div className={styles.scannerControls}>
        <button type="button" className={styles.controlButton}><Icon name="gallery" size={27} /><span>Gallery</span></button>
        <button type="button" className={`${styles.controlButton} ${torch ? styles.controlActive : ""}`} onClick={() => setTorch((value) => !value)}><Icon name="torch" size={27} /><span>Torch</span></button>
      </div>
      <button type="button" className={styles.restartButton} onClick={() => void startCamera()}>Restart camera</button>
    </section>
  );
}