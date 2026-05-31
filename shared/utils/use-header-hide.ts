import { useRef, useCallback } from "react";
import {
  useSharedValue, useAnimatedStyle, withTiming, Easing,
} from "react-native-reanimated";

const THRESHOLD    = 8;
const HIDE_DURATION = 260;
const SHOW_DURATION = 320;

/**
 * Scroll-linked header hide/show — LinkedIn-style.
 * Hides on scroll-down, slides back in smoothly on scroll-up (no spring bounce).
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
    translateY.value = withTiming(0, {
      duration: SHOW_DURATION,
      easing: Easing.out(Easing.cubic),
    });
  }, [translateY]);

  const onScroll = useCallback((e: any) => {
    const y    = e.nativeEvent.contentOffset.y;
    const diff = y - lastY.current;
    lastY.current = y;
    if (Math.abs(diff) < THRESHOLD) return;

    if (diff > 0 && y > 50 && !hidden.current) {
      hidden.current   = true;
      translateY.value = withTiming(-heightRef.current, {
        duration: HIDE_DURATION,
        easing: Easing.in(Easing.cubic),
      });
    } else if (diff < 0 && hidden.current) {
      hidden.current   = false;
      translateY.value = withTiming(0, {
        duration: SHOW_DURATION,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [translateY]);

  const headerStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: translateY.value }],
  }));

  return { headerStyle, setHeight, onScroll, reset };
}
