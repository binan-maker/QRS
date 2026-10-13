// ─── Overlay Animations ───────────────────────────────────────────────────────
// Manages ScannerOverlay animated values.
// cornerBreath: subtle opacity loop on the corner indicators.

import { useRef, useEffect } from "react";
import { Animated } from "react-native";

export function useOverlayAnimations() {
  const cornerBreathRef = useRef(new Animated.Value(0.7));

  useEffect(() => {
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

    return () => {
      breath.stop();
    };
  }, []);

  return {
    cornerBreath: cornerBreathRef.current,
  };
}
