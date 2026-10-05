import { useEffect } from "react";
import { Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";

/**
 * Syncs the Android navigation-bar button style (light/dark icons) whenever
 * `isDark` or `visible` changes.
 *
 * NOTE: On API 35+ (edge-to-edge enforced) only setButtonStyleAsync is
 * respected — setPositionAsync and setBackgroundColorAsync are no-ops.
 * The `openColor` and `restoreColor` params are accepted for backward
 * compatibility but have no effect.
 *
 * @param visible      Whether the modal/sheet is open (used as a dep to re-sync on open).
 * @param openColor    Unused — kept for backward compatibility.
 * @param restoreColor Unused — kept for backward compatibility.
 * @param isDark       Whether the current theme is dark (determines icon colour).
 */
export function useAndroidNavBar(
  visible: boolean,
  openColor: string,
  restoreColor: string,
  isDark: boolean,
): void {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark").catch(() => {});
  }, [visible, isDark]);
}

/**
 * Convenience variant for full-screen non-tab pages (e.g. QR detail, crop).
 * Keeps nav-bar button icons readable for the lifetime of the screen.
 *
 * @param color  Unused — kept for backward compatibility.
 * @param isDark Whether the current theme is dark.
 */
export function useAndroidNavBarScreen(color: string, isDark: boolean): void {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark").catch(() => {});
  }, [isDark]);
}
