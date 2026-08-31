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
 *   const { animatedStyle, setHeight, onScroll, animatedOnScroll, reset } = useScrollHide();
 *   // Apply animatedStyle to a Reanimated.Animated.View wrapping your header/nav.
 *   // Call setHeight(measuredHeight) in onLayout.
 *   // Pass onScroll to a regular React Native list's onScroll prop.
 *   // Pass animatedOnScroll to a Reanimated list's onScroll prop.
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

  const updateScrollState = (event: ScrollEvent) => {
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
  };

  // Keep the existing callback API for regular React Native ScrollViews and
  // FlashLists. Reanimated's handler is an object, not a callable function.
  const onScroll = useCallback(updateScrollState, [
    hidden,
    lastY,
    offset,
    height,
    threshold,
    hideDuration,
    showDuration,
  ]);

  // QR detail screens use Reanimated scroll views, so their scroll-linked
  // navigation work stays on the UI thread.
  const animatedOnScroll = useAnimatedScrollHandler((event: ScrollEvent) => {
    "worklet";
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

  return { animatedStyle, setHeight, onScroll, animatedOnScroll, reset, offset };
}
