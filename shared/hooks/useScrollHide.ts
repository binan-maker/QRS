import { useCallback } from "react";
import {
  useSharedValue,
  withTiming,
  Easing,
  useAnimatedStyle,
  useAnimatedScrollHandler,
} from "react-native-reanimated";

export interface ScrollHideOptions {
  /** Minimum scroll delta before triggering a hide/show. Default: 8 */
  threshold?: number;
  /** Animation duration (ms) when hiding. Default: 280 */
  hideDuration?: number;
  /** Animation duration (ms) when showing. Default: 340 */
  showDuration?: number;
}

type ScrollEvent = { contentOffset: { y: number } };

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
  const lastY     = useSharedValue(0);
  const hidden    = useSharedValue(false);
  const height    = useSharedValue(0);

  const setHeight = useCallback((h: number) => {
    height.value = h;
  }, [height]);

  const reset = useCallback(() => {
    hidden.value = false;
    lastY.value  = 0;
    offset.value   = withTiming(0, {
      duration: showDuration,
      easing: Easing.out(Easing.cubic),
    });
  }, [hidden, lastY, offset, showDuration]);

  // Keep scroll-linked navigation work on the UI thread so it does not
  // compete with content/comment rendering on the JavaScript thread.
  const onScroll = useAnimatedScrollHandler((event: ScrollEvent) => {
    const y    = event.contentOffset.y;
    const diff = y - lastY.value;
    lastY.value = y;
    if (Math.abs(diff) < threshold) return;

    if (diff > 0 && y > 50 && !hidden.value) {
      hidden.value = true;
      offset.value = withTiming(-height.value, {
        duration: hideDuration,
        easing: Easing.in(Easing.cubic),
      });
    } else if (diff < 0 && hidden.value) {
      hidden.value = false;
      offset.value = withTiming(0, {
        duration: showDuration,
        easing: Easing.out(Easing.cubic),
      });
    }
  });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: offset.value }],
  }));

  return { animatedStyle, setHeight, onScroll, reset, offset };
}
