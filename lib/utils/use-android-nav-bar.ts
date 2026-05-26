import { useEffect } from "react";
import { Platform } from "react-native";
import * as NavigationBar from "expo-navigation-bar";

/**
 * Pins the Android system navigation bar to a specific color while `visible`
 * is true, then restores it to `restoreColor` when it becomes false.
 *
 * Use this in every transparent / slide-up Modal so the bar never goes
 * transparent in dark theme.
 */
export function useAndroidNavBar(
  visible: boolean,
  openColor: string,
  restoreColor: string,
  isDark: boolean,
) {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    const color = visible ? openColor : restoreColor;
    NavigationBar.setPositionAsync("relative").catch(() => {});
    NavigationBar.setBackgroundColorAsync(color).catch(() => {});
    NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark").catch(() => {});
  }, [visible, openColor, restoreColor, isDark]);
}

/**
 * Always keeps the Android system navigation bar pinned to `color` for the
 * lifetime of the screen. Use this on full-screen non-tab pages (e.g. QR
 * detail) so the bar colour matches the app background the same way the home
 * tab does via its extended background view.
 */
export function useAndroidNavBarScreen(color: string, isDark: boolean) {
  useEffect(() => {
    if (Platform.OS !== "android") return;
    NavigationBar.setPositionAsync("relative").catch(() => {});
    NavigationBar.setBackgroundColorAsync(color).catch(() => {});
    NavigationBar.setButtonStyleAsync(isDark ? "light" : "dark").catch(() => {});
  }, [color, isDark]);
}
