import { useRef, useCallback } from "react";
import {
  useSharedValue, useAnimatedStyle, withTiming, withSpring, Easing,
} from "react-native-reanimated";

const THRESHOLD = 4;

/**
 * Animates a fixed page header out of view on scroll-down and springs it
 * back on scroll-up — matching the feel of the bottom tab bar.
 *
 * Usage:
 *   const { headerStyle, setHeight, onScroll, reset } = useHeaderHide();
 *   // Wrap your header in <Animated.View style={headerStyle} onLayout={…} />
 *   // Call setHeight(e.nativeEvent.layout.height) in onLayout
 *   // Pass onScroll to your ScrollView / FlashList
 *   // Call reset() to force the header back into view (e.g. on search open)
 */
export function useHeaderHide() {
  const translateY = useSharedValue(0);
  const lastY      = useRef(0);
  const hidden     = useRef(false);
  const heightRef  = useRef(0);

  const setHeight = useCallback((h: number) => {
    heightRef.current = h;
  }, []);

  const reset = useCallback(() => {
    hidden.current   = false;
    lastY.current    = 0;
    translateY.value = withSpring(0, { damping: 18, stiffness: 180 });
  }, [translateY]);

  const onScroll = useCallback((e: any) => {
    const y    = e.nativeEvent.contentOffset.y;
    const diff = y - lastY.current;
    lastY.current = y;
    if (Math.abs(diff) < THRESHOLD) return;

    if (diff > 0 && y > 40 && !hidden.current) {
      hidden.current   = true;
      translateY.value = withTiming(-heightRef.current, {
        duration: 210,
        easing: Easing.out(Easing.cubic),
      });
    } else if (diff < 0 && hidden.current) {
      hidden.current   = false;
      translateY.value = withSpring(0, { damping: 18, stiffness: 180 });
    }
  }, [translateY]);

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return { headerStyle, setHeight, onScroll, reset };
}
