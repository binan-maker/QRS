"use client";

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import Colors, { type AppColors } from "@shared/constants/colors";

export type ThemeMode = "system" | "light" | "dark";

export interface ThemeContextValue {
  colors: AppColors;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEYS = ["binro_theme_mode", "qrguard_theme_mode"];

function getStoredMode(): ThemeMode {
  if (typeof window === "undefined") return "system";
  try {
    for (const key of STORAGE_KEYS) {
      const stored = localStorage.getItem(key);
      if (stored === "light" || stored === "dark" || stored === "system") {
        return stored;
      }
    }
  } catch {}
  return "system";
}

function getSystemPrefersDark(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
  } catch {
    return false;
  }
}

const ThemeContext = createContext<ThemeContextValue>({
  colors: Colors.light,
  isDark: false,
  mode: "system",
  setMode: () => {},
  toggleTheme: () => {},
});

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [mode, setModeState] = useState<ThemeMode>(() => getStoredMode());
  const [systemDark, setSystemDark] = useState<boolean>(() => getSystemPrefersDark());

  // Listen to OS prefers-color-scheme changes
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
      setSystemDark(mediaQuery.matches);

      const handler = (e: MediaQueryListEvent) => {
        setSystemDark(e.matches);
      };

      mediaQuery.addEventListener("change", handler);
      return () => mediaQuery.removeEventListener("change", handler);
    } catch {}
  }, []);

  const isDark = useMemo(() => {
    if (mode === "dark") return true;
    if (mode === "light") return false;
    return systemDark;
  }, [mode, systemDark]);

  // Apply data-theme to HTML tag and persist
  useEffect(() => {
    if (typeof window === "undefined") return;

    const themeStr = isDark ? "dark" : "light";
    document.documentElement.setAttribute("data-theme", themeStr);
    document.documentElement.setAttribute("data-theme-mode", mode);
    document.documentElement.classList.toggle("dark", isDark);

    try {
      for (const key of STORAGE_KEYS) {
        localStorage.setItem(key, mode);
      }
    } catch {}
  }, [mode, isDark]);

  const setMode = useCallback((newMode: ThemeMode) => {
    setModeState(newMode);
    try {
      for (const key of STORAGE_KEYS) {
        localStorage.setItem(key, newMode);
      }
      const sysDark = getSystemPrefersDark();
      const resolvedDark = newMode === "dark" || (newMode === "system" && sysDark);
      document.documentElement.setAttribute("data-theme", resolvedDark ? "dark" : "light");
      document.documentElement.setAttribute("data-theme-mode", newMode);
      document.documentElement.classList.toggle("dark", resolvedDark);
    } catch {}
  }, []);

  const toggleTheme = useCallback(() => {
    setMode(isDark ? "light" : "dark");
  }, [isDark, setMode]);

  const colors = isDark ? Colors.dark : Colors.light;

  const value = useMemo(
    () => ({
      colors,
      isDark,
      mode,
      setMode,
      toggleTheme,
    }),
    [colors, isDark, mode, setMode, toggleTheme]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
