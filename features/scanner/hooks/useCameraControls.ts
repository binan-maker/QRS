import { useState, useRef, useCallback } from "react";
import { Animated, Easing } from "react-native";
import { useFocusEffect } from "expo-router";
import * as Haptics from "@/shared/utils/haptics";
import { useCameraZoom, ZOOM_LEVELS } from "./useCameraZoom";

export { ZOOM_LEVELS };
export const FINDER_SIZE  = 270;
export const CORNER_SIZE  = 32;
export const CORNER_WIDTH = 4;

export function useCameraControls() {
  const [scanned, setScanned] = useState(false);
  const [processing, setProcessing] = useState(false);
  const [scanSuccess, setScanSuccess] = useState(false);
  const [flashOn, setFlashOnRaw] = useState(false);

  const scanLockRef = useRef(false);
  const canScanRef = useRef(false);
  const focusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const zoomControls = useCameraZoom(scanLockRef);
  const scanLineAnim = useRef(new Animated.Value(0)).current;
  const scanLineLoop = useRef<Animated.CompositeAnimation | null>(null);

  const startScanLine = useCallback(() => {
    scanLineAnim.setValue(0);
    scanLineLoop.current = Animated.loop(
      Animated.sequence([
        Animated.timing(scanLineAnim, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(scanLineAnim, { toValue: 0, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    );
    scanLineLoop.current.start();
  }, [scanLineAnim]);

  const stopScanLine = useCallback(() => {
    scanLineLoop.current?.stop();
  }, []);

  const toggleFlash = useCallback(() => {
    setFlashOnRaw((prev) => !prev);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, []);

  useFocusEffect(
    useCallback(() => {
      setScanned(false);
      setProcessing(false);
      setScanSuccess(false);
      scanLockRef.current = false;
      canScanRef.current = false;
      setFlashOnRaw(false);
      zoomControls.resetZoom();
      startScanLine();

      focusTimerRef.current = setTimeout(() => {
        canScanRef.current = true;
      }, 200);

      return () => {
        if (focusTimerRef.current) clearTimeout(focusTimerRef.current);
        canScanRef.current = false;
        stopScanLine();
        setFlashOnRaw(false);
        zoomControls.clearSmartZoom();
      };
    }, [startScanLine, stopScanLine, zoomControls])
  );

  const resetScan = useCallback(() => {
    setScanned(false);
    setScanSuccess(false);
    setProcessing(false);
    scanLockRef.current = false;
    canScanRef.current = true;
    zoomControls.resetZoom();
  }, [zoomControls]);

  return {
    scanned, setScanned,
    processing, setProcessing,
    scanSuccess, setScanSuccess,
    flashOn, toggleFlash,
    zoom: zoomControls.zoom,
    zoomLabel: zoomControls.zoomLabel,
    scanLineAnim,
    scanLockRef, canScanRef,
    resetScan,
    cycleZoom: zoomControls.cycleZoom,
    onScanSuccess: zoomControls.clearSmartZoom,
    onQRBoundsDetected: zoomControls.onQRBoundsDetected,
    setFlashOn: setFlashOnRaw,
  };
}
