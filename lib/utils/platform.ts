import { Platform, ViewStyle } from "react-native";

/**
 * Cross-platform shadow helper.
 * On native: uses shadowColor/shadowOffset/shadowOpacity/shadowRadius + elevation.
 * On web: uses boxShadow (avoids the "shadow* props deprecated" warning).
 *
 * Usage:
 *   style={[styles.myCard, shadow(8, "#000", 0.3)]}
 */
export function shadow(
  radius: number = 8,
  color: string = "#000",
  opacity: number = 0.25,
  offsetX: number = 0,
  offsetY: number = 4,
  elevation: number = 6
): ViewStyle {
  if (Platform.OS === "web") {
    const hex = color.startsWith("#") ? color : "#000";
    const r = parseInt(hex.slice(1, 3), 16) || 0;
    const g = parseInt(hex.slice(3, 5), 16) || 0;
    const b = parseInt(hex.slice(5, 7), 16) || 0;
    return {
      boxShadow: `${offsetX}px ${offsetY}px ${radius}px rgba(${r},${g},${b},${opacity})`,
    } as ViewStyle;
  }
  return {
    shadowColor: color,
    shadowOffset: { width: offsetX, height: offsetY },
    shadowOpacity: opacity,
    shadowRadius: radius,
    elevation,
  };
}

/**
 * Cross-platform pointer events helper.
 * Use style.pointerEvents (not the deprecated props.pointerEvents).
 */
export function pointerEvents(value: "auto" | "none" | "box-none" | "box-only"): ViewStyle {
  return { pointerEvents: value } as ViewStyle;
}

/**
 * Max width for web layouts — keeps content readable on wide screens.
 * Wrap screen content with this on web.
 */
export const WEB_MAX_WIDTH = 480;

export function webContainer(): ViewStyle {
  if (Platform.OS !== "web") return {};
  return {
    maxWidth: WEB_MAX_WIDTH,
    width: "100%",
    alignSelf: "center",
  } as ViewStyle;
}
