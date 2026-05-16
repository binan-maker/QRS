import { useWindowDimensions } from "react-native";

export function useAuthScale() {
  const { width, height } = useWindowDimensions();
  const scale = Math.min(Math.max(width / 390, 0.85), 1.0);
  const sp = (v: number) => Math.round(v * scale);
  const isNarrow = width < 360;
  const px = isNarrow ? 20 : sp(28);
  return { sp, px, width, height, scale };
}
