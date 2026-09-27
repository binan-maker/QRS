import { useEffect } from "react";
import {
  useSharedValue, useAnimatedStyle, withTiming, withDelay, Easing,
} from "react-native-reanimated";

const EASE = Easing.bezier(0.25, 0.46, 0.45, 0.94);
const DURATION = 380;

export function useFadeSlide(delay: number, offsetY = 22) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(offsetY);
  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: DURATION, easing: EASE }));
    translateY.value = withDelay(delay, withTiming(0, { duration: DURATION, easing: EASE }));
  }, []);
  return useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));
}
