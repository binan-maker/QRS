import { useScrollHide } from "./useScrollHide";

/**
 * Scroll-linked header hide/show.
 * Wraps useScrollHide with header-specific timing constants.
 */
export function useHeaderHide() {
  const { animatedStyle, setHeight, onScroll, animatedOnScroll, reset } = useScrollHide({
    hideDuration: 260,
    showDuration: 320,
  });
  return { headerStyle: animatedStyle, setHeight, onScroll, animatedOnScroll, reset };
}
