import { useState, useRef, useCallback } from "react";
import { Dimensions, Platform } from "react-native";
import * as Haptics from "@/shared/utils/haptics";

export const ZOOM_LEVELS = Platform.select({
  ios: [
    { zoom: 0.02, label: "1×" },
    { zoom: 0.25, label: "1.5×" },
    { zoom: 0.45, label: "2×" },
    { zoom: 0.65, label: "3×" },
  ],
  default: [
    { zoom: 0, label: "1×" },
    { zoom: 0.25, label: "1.5×" },
    { zoom: 0.45, label: "2×" },
    { zoom: 0.65, label: "3×" },
  ],
}) as { zoom: number; label: string }[];

const SMART_ZOOM_SMALL = 0.18;
const SMART_ZOOM_VERY_SMALL = 0.08;
const SMART_ZOOM_RESET_MS = 4000;

export function useCameraZoom(scanLockRef: React.MutableRefObject<boolean>) {
  const manualZoomRef = useRef(ZOOM_LEVELS[0].zoom);
  const zoomRef = useRef(ZOOM_LEVELS[0].zoom);
  const [zoom, setZoomState] = useState(ZOOM_LEVELS[0].zoom);
  const [zoomLabel, setZoomLabel] = useState(ZOOM_LEVELS[0].label);
  const isSmartZoomedRef = useRef(false);
  const smartZoomTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const setZoom = useCallback((val: number) => {
    zoomRef.current = val;
    setZoomState(val);
  }, []);

  const clearTimer = useCallback(() => {
    if (smartZoomTimerRef.current) {
      clearTimeout(smartZoomTimerRef.current);
      smartZoomTimerRef.current = null;
    }
  }, []);

  const resetZoom = useCallback(() => {
    clearTimer();
    isSmartZoomedRef.current = false;
    const base = manualZoomRef.current;
    if (zoomRef.current !== base) setZoom(base);
  }, [clearTimer, setZoom]);

  const cycleZoom = useCallback(() => {
    const currentIdx = ZOOM_LEVELS.findIndex((z) => z.zoom === manualZoomRef.current);
    const next = ZOOM_LEVELS[(currentIdx + 1) % ZOOM_LEVELS.length];
    clearTimer();
    isSmartZoomedRef.current = false;
    manualZoomRef.current = next.zoom;
    setZoom(next.zoom);
    setZoomLabel(next.label);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  }, [clearTimer, setZoom]);

  const onQRBoundsDetected = useCallback((bounds?: { size?: { width?: number } } | null) => {
    if (scanLockRef.current || !bounds?.size?.width) return;
    const frac = bounds.size.width / Dimensions.get("window").width;
    const base = manualZoomRef.current;
    let target = base;

    if (frac < SMART_ZOOM_VERY_SMALL) {
      target = Math.max(base, ZOOM_LEVELS.find((l) => l.label === "2×")?.zoom ?? base);
    } else if (frac < SMART_ZOOM_SMALL) {
      target = Math.max(base, ZOOM_LEVELS.find((l) => l.label === "1.5×")?.zoom ?? base);
    } else {
      if (isSmartZoomedRef.current) resetZoom();
      return;
    }

    if (target !== zoomRef.current) {
      isSmartZoomedRef.current = true;
      setZoom(target);
    }
    clearTimer();
    smartZoomTimerRef.current = setTimeout(() => {
      if (isSmartZoomedRef.current) resetZoom();
    }, SMART_ZOOM_RESET_MS);
  }, [scanLockRef, clearTimer, resetZoom, setZoom]);

  return { zoom, zoomLabel, cycleZoom, onQRBoundsDetected, resetZoom, clearSmartZoom: clearTimer };
}
