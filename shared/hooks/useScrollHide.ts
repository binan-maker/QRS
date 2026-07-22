import { useRef, useCallback } from "react";
import {
  useSharedValue,
  withTiming,
  Easing,
  useAnimatedStyle,
} from "react-native-reanimated";
import type { NativeSyntheticEvent, NativeScrollEvent } from "react-native";

export interface ScrollHideOptions {
  /** Minimum scroll delta before triggering a hide/show. Default: 8 */
  threshold?: number;
  /** Animation duration (ms) when hiding. Default: 280 */
  hideDuration?: number;
  /** Animation duration (ms) when showing. Default: 340 */
  showDuration?: number;
}

/**
 * Shared scroll-linked hide/show hook — LinkedIn-style slow ease, no spring bounce.
 *
 * Usage:
 *   const { animatedStyle, setHeight, onScroll, reset } = useScrollHide();
 *   // Apply animatedStyle to a Reanimated.Animated.View wrapping your header/nav.
 *   // Call setHeight(measuredHeight) in onLayout.
 *   // Pass onScroll to the list's onScroll prop.
 *   // Call reset() on screen focus to slide the bar back in.
 */
export function useScrollHide(opts: ScrollHideOptions = {}) {
  const {
    threshold    = 8,
    hideDuration = 280,
    showDuration = 340,
  } = opts;

  const offset    = useSharedValue(0);
  const lastY     = useRef(0);
  const hidden    = useRef(false);
  const heightRef = useRef(0);

  const setHeight = useCallback((h: number) => {
    heightRef.current = h;
  }, []);

  const reset = useCallback(() => {
    hidden.current = false;
    lastY.current  = 0;
    offset.value   = withTiming(0, {
      duration: showDuration,
      easing: Easing.out(Easing.cubic),
    });
  }, [offset, showDuration]);

  const onScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      const y    = e.nativeEvent.contentOffset.y;
      const diff = y - lastY.current;
      lastY.current = y;
      if (Math.abs(diff) < threshold) return;

      if (diff > 0 && y > 50 && !hidden.current) {
        hidden.current = true;
        offset.value   = withTiming(-heightRef.current, {
          duration: hideDuration,
          easing: Easing.in(Easing.cubic),
        });
      } else if (diff < 0 && hidden.current) {
        hidden.current = false;
        offset.value   = withTiming(0, {
          duration: showDuration,
          easing: Easing.out(Easing.cubic),
        });
      }
    },
    [offset, threshold, hideDuration, showDuration],
  );

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  return { animatedStyle, setHeight, onScroll, reset, offset };
}
