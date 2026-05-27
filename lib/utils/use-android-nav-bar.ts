import { useEffect } from "react";
import { Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";

/**
 * Syncs the Android navigation-bar button style (light/dark icons) whenever
 * `visible` changes.
 *
 * NOTE: On API 35+ (edge-to-edge enforced) setPositionAsync and
 * setBackgroundColorAsync are no-ops and generate warnings. Only
 * setButtonStyleAsync is respected — that is all we call here.
 */
export function useAndroidNavBar(
  visible: boolean,
  openColor: string,
  restoreColor: string,
  isDark: boolean,
) {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark").catch(() => {});
  }, [visible, isDark]);
}

/**
 * Syncs the Android navigation-bar button style for the lifetime of a screen.
 * Use on full-screen non-tab pages (e.g. QR detail) to keep icons readable.
 *
 * NOTE: setPositionAsync / setBackgroundColorAsync are intentionally omitted —
 * they are ignored on API 35+ edge-to-edge builds.
 */
export function useAndroidNavBarScreen(color: string, isDark: boolean) {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark").catch(() => {});
  }, [isDark]);
}
