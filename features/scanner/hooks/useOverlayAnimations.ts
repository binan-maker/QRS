// ─── Overlay Animations ───────────────────────────────────────────────────────
// Manages all ScannerOverlay animated values.
// cornerBreath: subtle 0.65→1 opacity loop on the corner indicators.
// dotBlink:     slow pulse for any live-indicator dot.
// scanReady:    gentle pulse on the ready-state CTA.
// No pulse rings, no scan beam — kept minimal per premium design spec.

import { useRef, useEffect, useMemo } from "react";
import { Animated } from "react-native";

export function useOverlayAnimations() {
  const cornerBreathRef = useRef(new Animated.Value(0.7));
  const dotBlinkRef     = useRef(new Animated.Value(1));
  const scanReadyRef    = useRef(new Animated.Value(0.7));

  useEffect(() => {
    // Subtle corner opacity breath — 3 s cycle, barely noticeable
    const breath = Animated.loop(
      Animated.sequence([
        Animated.timing(cornerBreathRef.current, {
          toValue:         1,
          duration:        2400,
          useNativeDriver: true,
        }),
        Animated.timing(cornerBreathRef.current, {
          toValue:         0.65,
          duration:        2400,
          useNativeDriver: true,
        }),
      ])
    );
    breath.start();

    // Live-indicator dot blink
    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(dotBlinkRef.current, {
          toValue:         0.25,
          duration:        900,
          useNativeDriver: true,
        }),
        Animated.timing(dotBlinkRef.current, {
          toValue:         1,
          duration:        900,
          useNativeDriver: true,
        }),
      ])
    );
    blink.start();

    // Scan-ready button gentle pulse
    const ready = Animated.loop(
      Animated.sequence([
        Animated.timing(scanReadyRef.current, {
          toValue:         1,
          duration:        1600,
          useNativeDriver: true,
        }),
        Animated.timing(scanReadyRef.current, {
          toValue:         0.7,
          duration:        1600,
          useNativeDriver: true,
        }),
      ])
    );
    ready.start();

    return () => {
      breath.stop();
      blink.stop();
      ready.stop();
    };
  }, []);

  return {
    cornerBreath: cornerBreathRef.current,
    dotBlink:     dotBlinkRef.current,
    scanReady:    scanReadyRef.current,
  };
}
