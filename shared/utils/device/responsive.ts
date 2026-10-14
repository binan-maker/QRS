import { Dimensions, Platform } from "react-native";

const BASE_WIDTH = 390;

const ANDROID_MIN = 0.95;
const IOS_MIN = 0.84;

export function getScale(width?: number): number {
  const w = width ?? Dimensions.get("window").width;
  return Math.min(Math.max(w / BASE_WIDTH, 0.82), 1.18);
}

export function rs(size: number, width?: number): number {
  return Math.round(size * getScale(width));
}

export function rf(size: number, width?: number): number {
  const scale = getScale(width);
  const minClamp = Platform.OS === "android" ? ANDROID_MIN : IOS_MIN;
  const clamped = Math.min(Math.max(scale, minClamp), 1.15);
  return Math.round(size * clamped);
}

export function rp(size: number, width?: number): number {
  return Math.round(size * getScale(width));
}
