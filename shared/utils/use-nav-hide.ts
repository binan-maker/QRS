import { useRef, useCallback } from "react";
import { useSharedValue, withSpring, useAnimatedStyle } from "react-native-reanimated";

const THRESHOLD  = 4;
const NAV_OFFSET = -64;

export function useNavHide() {
  const navOffset = useSharedValue(0);
  const lastY     = useRef(0);
  const hidden    = useRef(false);

  const onNavScroll = useCallback((e: any) => {
    const y    = e.nativeEvent.contentOffset.y;
    const diff = y - lastY.current;
    lastY.current = y;
    if (Math.abs(diff) < THRESHOLD) return;
    if (diff > 0 && y > 40 && !hidden.current) {
      hidden.current  = true;
      navOffset.value = withSpring(NAV_OFFSET, { damping: 15, stiffness: 120 });
    } else if (diff < 0 && hidden.current) {
      hidden.current  = false;
      navOffset.value = withSpring(0, { damping: 15, stiffness: 120 });
    }
  }, [navOffset]);

  const navAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: navOffset.value }],
  }));

  return { navAnimatedStyle, onNavScroll };
}
