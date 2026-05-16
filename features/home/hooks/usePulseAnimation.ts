import { useEffect } from "react";
import {
  useSharedValue,
  useAnimatedStyle,
  withRepeat,
  withTiming,
  withSequence,
} from "react-native-reanimated";

export function usePulseAnimation() {
  const scanPulse = useSharedValue(1);

  useEffect(() => {
    scanPulse.value = withRepeat(
      withSequence(
        withTiming(1.06, { duration: 1200 }),
        withTiming(1,    { duration: 1200 })
      ),
      -1,
      true
    );
  }, []);

  return useAnimatedStyle(() => ({ transform: [{ scale: scanPulse.value }] }));
}
