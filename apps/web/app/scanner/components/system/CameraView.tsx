"use client";

import React, { useEffect, useRef, useCallback } from "react";
import styles from "../../scanner.module.css";
import { acquireCameraStream, stopSharedCameraStream, applyTrackTorch, applyTrackZoom } from "./cameraStream";
import { detectQrFromCanvas, isValidDecodedQr } from "./qrDetector";

export { useCameraPermissions } from "./useCameraPermissions";
export { stopSharedCameraStream, isValidDecodedQr };
export { loadJsQr } from "./qrDetector";

interface CameraViewProps {
  facing?: "back" | "front";
  enableTorch?: boolean;
  zoom?: number;
  autofocus?: any;
  barcodeScannerSettings?: { barcodeTypes: string[] };
  onBarcodeScanned?: (data: { data: string; bounds?: any }) => void;
  onCameraReady?: () => void;
  onMountError?: (error: Error) => void;
  style?: React.CSSProperties;
}

export function CameraView({
  facing = "back", enableTorch = false, zoom = 0,
  onBarcodeScanned, onCameraReady, onMountError,
}: CameraViewProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animFrameRef = useRef<number | null>(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const stream = await acquireCameraStream(facing);
        if (!mounted) return;
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          onCameraReady?.();
        }
      } catch (err: any) {
        if (mounted) onMountError?.(err);
      }
    })();
    return () => {
      mounted = false;
      stopSharedCameraStream();
    };
  }, [facing, onCameraReady, onMountError]);

  useEffect(() => { applyTrackTorch(streamRef.current, enableTorch); }, [enableTorch]);
  useEffect(() => { applyTrackZoom(streamRef.current, zoom); }, [zoom]);

  const scanLoop = useCallback(async () => {
    const video = videoRef.current;
    if (video && video.readyState >= 2 && video.videoWidth > 0) {
      if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
      const canvas = canvasRef.current;
      if (canvas.width !== video.videoWidth) canvas.width = video.videoWidth;
      if (canvas.height !== video.videoHeight) canvas.height = video.videoHeight;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (ctx) {
        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const result = await detectQrFromCanvas(ctx, canvas.width, canvas.height);
        if (result && onBarcodeScanned) onBarcodeScanned(result);
      }
    }
    animFrameRef.current = requestAnimationFrame(scanLoop);
  }, [onBarcodeScanned]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(scanLoop);
    return () => { if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current); };
  }, [scanLoop]);

  return (
    <div className={styles.cameraWrapper} style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
      <video ref={videoRef} playsInline muted autoPlay className={styles.cameraVideo} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
    </div>
  );
}

(CameraView as any).isAvailableAsync = async () => typeof navigator !== "undefined" && !!navigator.mediaDevices?.getUserMedia;

export default CameraView;
