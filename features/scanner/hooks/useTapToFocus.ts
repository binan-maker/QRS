import { useState, useRef, useCallback } from "react";
import { Platform, Animated } from "react-native";

export function useTapToFocus(cameraLive: boolean, scanned: boolean) {
  const [focusPoint, setFocusPoint] = useState<{ x: number; y: number } | null>(null);
  const focusRingAnim = useRef(new Animated.Value(0)).current;
  const [autofocusMode, setAutofocusMode] = useState<"on" | "off" | undefined>(
    Platform.OS === "ios" ? "on" : undefined
  );

  const handleTapFocus = useCallback((x: number, y: number) => {
    if (!cameraLive || scanned) return;
    setFocusPoint({ x, y });
    focusRingAnim.stopAnimation();
    focusRingAnim.setValue(0);

    Animated.sequence([
      Animated.timing(focusRingAnim, { toValue: 1, duration: 160, useNativeDriver: true }),
      Animated.delay(700),
      Animated.timing(focusRingAnim, { toValue: 0, duration: 280, useNativeDriver: true }),
    ]).start(() => setFocusPoint(null));

    if (Platform.OS === "ios") {
      setAutofocusMode("off");
      setTimeout(() => setAutofocusMode("on"), 120);
    }
  }, [cameraLive, scanned, focusRingAnim]);

  return { focusPoint, focusRingAnim, autofocusMode, handleTapFocus };
}
