import { useState, useRef, useEffect, useCallback } from "react";
import { Platform } from "react-native";
import { CameraView, useCameraPermissions } from "expo-camera";
import { useFocusEffect } from "expo-router";
import type { CameraErrorType } from "@/features/scanner/components";

export function useCameraLifecycle() {
  const [permission, requestPermission] = useCameraPermissions();
  const [hardwareAvailable, setHardwareAvailable] = useState<boolean | null>(null);
  const [cameraAvailable, setCameraAvailable] = useState(true);
  const [cameraErrorType, setCameraErrorType] = useState<CameraErrorType>("unavailable");
  const [cameraPreviewReady, setCameraPreviewReady] = useState(false);
  const [isFocused, setIsFocused] = useState(true);
  const [cameraActive, setCameraActive] = useState(false);
  const [focusKey, setFocusKey] = useState(0);

  const focusCountRef = useRef(0);
  const readyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let cancelled = false;
    const timeout = new Promise<boolean>((res) => setTimeout(() => res(true), 3000));
    Promise.race([CameraView.isAvailableAsync(), timeout])
      .then((avail) => { if (!cancelled) setHardwareAvailable(avail); })
      .catch(() => { if (!cancelled) setHardwareAvailable(true); });
    return () => { cancelled = true; };
  }, []);

  useFocusEffect(
    useCallback(() => {
      setIsFocused(true);
      setCameraAvailable(true);
      return () => { setIsFocused(false); };
    }, [])
  );

  useEffect(() => {
    if (isFocused) {
      const delay = Platform.OS === "ios" ? 600 : 300;
      const t = setTimeout(() => {
        focusCountRef.current += 1;
        setFocusKey(focusCountRef.current);
        setCameraPreviewReady(false);
        setCameraActive(true);
      }, delay);
      return () => clearTimeout(t);
    }
    setCameraActive(false);
    setCameraPreviewReady(false);
  }, [isFocused]);

  useEffect(() => {
    if (!permission?.granted || hardwareAvailable === null || !cameraActive) return;
    const timeoutMs = hardwareAvailable === false ? 5000 : Platform.OS === "android" ? 15000 : 12000;
    readyTimerRef.current = setTimeout(() => {
      setCameraAvailable((prev) => {
        if (prev) setCameraErrorType("unavailable");
        return false;
      });
    }, timeoutMs);
    return () => { if (readyTimerRef.current) clearTimeout(readyTimerRef.current); };
  }, [permission?.granted, hardwareAvailable, cameraActive, focusKey]);

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

  const cameraLive = cameraActive && hardwareAvailable !== null && cameraAvailable && cameraPreviewReady;

  return {
    permission, requestPermission,
    hardwareAvailable, cameraAvailable, cameraErrorType,
    cameraActive, cameraPreviewReady, cameraLive,
    focusKey, isFocused,
    markUnavailable, markReady, handleRetry,
  };
}
