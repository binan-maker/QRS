import { Dimensions, PixelRatio, Platform } from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");

const BASE_WIDTH = 375;

function scale(size: number): number {
  const ratio = SCREEN_WIDTH / BASE_WIDTH;
  const scaled = size * ratio;
  const clamped = Math.min(Math.max(scaled, size * 0.82), size * 1.18);
  return Math.round(PixelRatio.roundToNearestPixel(clamped));
}

export const fs = {
  xs: scale(10),
  sm: scale(12),
  base: scale(14),
  md: scale(15),
  lg: scale(17),
  xl: scale(20),
  xxl: scale(24),
  xxxl: scale(28),
  display: scale(32),
};

export const sp = {
  xs: scale(4),
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(20),
  xxl: scale(24),
  xxxl: scale(32),
};

export const radius = {
  sm: scale(8),
  md: scale(12),
  lg: scale(16),
  xl: scale(20),
  pill: scale(100),
};

export const icon = {
  sm: scale(16),
  md: scale(20),
  lg: scale(24),
  xl: scale(28),
  xxl: scale(32),
};

export const avatar = {
  sm: scale(32),
  md: scale(44),
  lg: scale(64),
  xl: scale(80),
};

export const hit = {
  sm: scale(36),
  md: scale(44),
  lg: scale(52),
};
