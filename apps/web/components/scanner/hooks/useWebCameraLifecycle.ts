"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { CameraView, useCameraPermissions } from "../system/CameraView";
import type { CameraErrorType } from "../system/CameraUnavailableBanner";

export function useWebCameraLifecycle() {
  const [permission, requestPermission] = useCameraPermissions();
  const [hardwareAvailable, setHardwareAvailable] = useState<boolean | null>(true);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [cameraErrorType, setCameraErrorType] = useState<CameraErrorType>("unavailable");
  const [cameraPreviewReady, setCameraPreviewReady] = useState(false);
  const [focusKey, setFocusKey] = useState(0);

  const focusCountRef = useRef(0);
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const t = new Promise<boolean>((res) => setTimeout(() => res(true), 3000));
    Promise.race([(CameraView as any).isAvailableAsync?.() ?? Promise.resolve(true), t])
      .then((avail) => { if (!cancelled) setHardwareAvailable(avail); })
      .catch(() => { if (!cancelled) setHardwareAvailable(true); });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    if (!permission?.granted || hardwareAvailable === null) return;
    readyTimerRef.current = setTimeout(() => {
      setCameraAvailable(false);
      setCameraErrorType("unavailable");
    }, 12000);
    return () => { if (readyTimerRef.current) clearTimeout(readyTimerRef.current); };
  }, [permission?.granted, hardwareAvailable, focusKey]);

  const markUnavailable = useCallback((type: CameraErrorType) => {
    if (readyTimerRef.current) clearTimeout(readyTimerRef.current);
    setCameraErrorType(type);
    setCameraAvailable(false);
  }, []);

  const markReady = useCallback(() => {
    if (readyTimerRef.current) clearTimeout(readyTimerRef.current);
    setCameraPreviewReady(true);
  }, []);

  const handleRetry = useCallback(() => {
    if (readyTimerRef.current) clearTimeout(readyTimerRef.current);
    focusCountRef.current += 1;
    setFocusKey(focusCountRef.current);
    setCameraPreviewReady(false);
    setCameraAvailable(true);
    setCameraErrorType("unavailable");
  }, []);

  const cameraLive = hardwareAvailable !== null && cameraAvailable && cameraPreviewReady;

  return {
    permission, requestPermission,
    hardwareAvailable, cameraAvailable, cameraErrorType,
    cameraPreviewReady, cameraLive, focusKey,
    markUnavailable, markReady, handleRetry,
  };
}
