import { useScrollHide } from "./useScrollHide";

/**
 * Scroll-linked nav bar hide/show.
 * Wraps useScrollHide with nav-specific timing constants.
 * Call setNavHeight with the measured nav bar height so the bar
 * slides fully off screen on scroll-down.
 */
export function useNavHide() {
  const { animatedStyle, setHeight, onScroll, reset } = useScrollHide({
    hideDuration: 280,
    showDuration: 340,
  });
  return {
    navAnimatedStyle: animatedStyle,
    setNavHeight: setHeight,
    onNavScroll: onScroll,
    reset,
  };
}
