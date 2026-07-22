import { useWindowDimensions } from "react-native";

/**
 * Returns responsive scaling helpers based on the current window width.
 * - `rf(n)` — responsive font size
 * - `sp(n)` — responsive spacing / dimension
 * - `s`     — raw scale factor (0.82 – 1.0)
 */
export function useScaleFns() {
  const { width } = useWindowDimensions();
  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);
  return { rf, sp, s };
}
