import { useWindowDimensions } from "react-native";
import { rf as rfBase, rs } from "@/shared/utils/responsive";

/**
 * Returns responsive scaling helpers that react to window dimension changes.
 * Delegates to responsive.ts so there is one scaling implementation across
 * the codebase — no divergent clamp values.
 *
 * - `rf(n)` — responsive font size (same algorithm as responsive.ts rf)
 * - `sp(n)` — responsive spacing / dimension (same as responsive.ts rs)
 * - `s`     — raw scale factor (0.82 – 1.18)
 */
export function useScaleFns() {
  const { width } = useWindowDimensions();
  return {
    rf: (n: number) => rfBase(n, width),
    sp: (n: number) => rs(n, width),
    s: Math.min(Math.max(width / 390, 0.82), 1.18),
  };
}
