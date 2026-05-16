// ─── Overlay Animations ───────────────────────────────────────────────────────
// Manages all ScannerOverlay animated values: dual pulse rings, corner glow,
// blinking dot, and the scan-ready button pulse. Keeps ScannerOverlay purely
// declarative — it just reads the values returned here.

import { useRef, useEffect, useMemo } from "react";
import { Animated } from "react-native";

export function useOverlayAnimations() {
  const pulse1Ref     = useRef(new Animated.Value(0));
  const pulse2Ref     = useRef(new Animated.Value(0));
  const cornerGlowRef = useRef(new Animated.Value(0.6));
  const dotBlinkRef   = useRef(new Animated.Value(1));
  const scanReadyRef  = useRef(new Animated.Value(0.7));

  const pulse1Scale   = useMemo(
    () => pulse1Ref.current.interpolate({ inputRange: [0, 1], outputRange: [1, 1.45] }),
    []
  );
  const pulse1Opacity = useMemo(
    () => pulse1Ref.current.interpolate({ inputRange: [0, 0.3, 1], outputRange: [0.35, 0.1, 0] }),
    []
  );
  const pulse2Scale   = useMemo(
    () => pulse2Ref.current.interpolate({ inputRange: [0, 1], outputRange: [1, 1.25] }),
    []
  );
  const pulse2Opacity = useMemo(
    () => pulse2Ref.current.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0.2, 0.06, 0] }),
    []
  );

  useEffect(() => {
    const p1 = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse1Ref.current, { toValue: 1, duration: 2800, useNativeDriver: true }),
        Animated.timing(pulse1Ref.current, { toValue: 0, duration: 0,    useNativeDriver: true }),
      ])
    );
    p1.start();

    const t1 = setTimeout(() => {
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulse2Ref.current, { toValue: 1, duration: 2800, useNativeDriver: true }),
          Animated.timing(pulse2Ref.current, { toValue: 0, duration: 0,    useNativeDriver: true }),
        ])
      ).start();
    }, 1400);

    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(cornerGlowRef.current, { toValue: 1,   duration: 2000, useNativeDriver: true }),
        Animated.timing(cornerGlowRef.current, { toValue: 0.6, duration: 2000, useNativeDriver: true }),
      ])
    );
    glow.start();

    const blink = Animated.loop(
      Animated.sequence([
        Animated.timing(dotBlinkRef.current, { toValue: 0.2, duration: 700, useNativeDriver: true }),
        Animated.timing(dotBlinkRef.current, { toValue: 1,   duration: 700, useNativeDriver: true }),
      ])
    );
    blink.start();

    const ready = Animated.loop(
      Animated.sequence([
        Animated.timing(scanReadyRef.current, { toValue: 1,   duration: 1600, useNativeDriver: true }),
        Animated.timing(scanReadyRef.current, { toValue: 0.7, duration: 1600, useNativeDriver: true }),
      ])
    );
    ready.start();

    return () => {
      clearTimeout(t1);
      p1.stop();
      glow.stop();
      blink.stop();
      ready.stop();
    };
  }, []);

  return {
    pulse1Scale,
    pulse1Opacity,
    pulse2Scale,
    pulse2Opacity,
    cornerGlow:  cornerGlowRef.current,
    dotBlink:    dotBlinkRef.current,
    scanReady:   scanReadyRef.current,
  };
}
