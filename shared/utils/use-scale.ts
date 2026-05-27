import { useWindowDimensions } from "react-native";

export function useScaleFns() {
  const { width } = useWindowDimensions();
  const s = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s);
  const sp = (n: number) => Math.round(n * s);
  return { rf, sp, s };
}
