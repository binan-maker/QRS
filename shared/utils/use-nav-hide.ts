import { useRef, useCallback } from "react";
import { useSharedValue, withTiming, Easing, useAnimatedStyle } from "react-native-reanimated";

const THRESHOLD    = 8;
const HIDE_DURATION = 280;
const SHOW_DURATION = 340;

/**
 * Scroll-linked nav hide/show — LinkedIn-style slow ease.
 * No spring: pure timing so it never snaps or bounces.
 * Call setNavHeight with the measured nav bar height so the bar
 * slides fully off screen (including the topInset padding area).
 */
export function useNavHide() {
  const navOffset = useSharedValue(0);
  const lastY     = useRef(0);
  const hidden    = useRef(false);
  const heightRef = useRef(0);

  const setNavHeight = useCallback((h: number) => {
    heightRef.current = h;
  }, []);

  const onNavScroll = useCallback((e: any) => {
    const y    = e.nativeEvent.contentOffset.y;
    const diff = y - lastY.current;
    lastY.current = y;
    if (Math.abs(diff) < THRESHOLD) return;

    if (diff > 0 && y > 50 && !hidden.current) {
      hidden.current  = true;
      navOffset.value = withTiming(-heightRef.current, {
        duration: HIDE_DURATION,
        easing: Easing.in(Easing.cubic),
      });
    } else if (diff < 0 && hidden.current) {
      hidden.current  = false;
      navOffset.value = withTiming(0, {
        duration: SHOW_DURATION,
        easing: Easing.out(Easing.cubic),
      });
    }
  }, [navOffset]);

  const navAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: navOffset.value }],
  }));

  return { navAnimatedStyle, onNavScroll, setNavHeight };
}
