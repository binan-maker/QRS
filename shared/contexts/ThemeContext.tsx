import type { ReactNode } from "react";
import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useMemo,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import Colors, { type AppColors } from "@/shared/constants/colors";
import {
  prefetchStartupPrefs,
  getStartupPref,
  isStartupPrefsLoaded,
  STARTUP_PREF_KEYS,
} from "@/lib/startup-prefs";

type ThemeMode = "system" | "dark" | "light";

interface ThemeContextValue {
  colors: AppColors;
  isDark: boolean;
  mode: ThemeMode;
  setMode: (m: ThemeMode) => void;
  toggleTheme: () => void;
}

const STORAGE_KEY = "qrguard_theme_mode";

const ThemeContext = createContext<ThemeContextValue>({
  colors: Colors.dark,
  isDark: true,
  mode: "system",
  setMode: () => {},
  toggleTheme: () => {},
});

function resolveStoredMode(raw: string | null): ThemeMode {
  if (raw === "dark" || raw === "light" || raw === "system") return raw;
  return "system";
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();

  // ── Synchronous initialisation from startup-prefs cache ──────────────────
  // startup-prefs kicks off AsyncStorage.multiGet at module-load time (before
  // React renders). By the time this useState initialiser runs, the cache is
  // almost always already resolved — so the correct theme is applied on the
  // very first render with zero async delay and no theme flash.
  const [mode, setModeState] = useState<ThemeMode>(() =>
    resolveStoredMode(
      isStartupPrefsLoaded()
        ? getStartupPref(STARTUP_PREF_KEYS.THEME_MODE)
        : null
    )
  );

  useEffect(() => {
    // Fast path: cache already resolved — nothing to do.
    if (isStartupPrefsLoaded()) return;
    // Slow path (rare): await the in-flight prefetch and apply stored mode.
    prefetchStartupPrefs().then(() => {
      setModeState(resolveStoredMode(getStartupPref(STARTUP_PREF_KEYS.THEME_MODE)));
    });
  }, []);

  // NOTE: null-gate ("if (!ready) return null") has been removed.
  // Previously this gate blocked the entire React tree — including font loading
  // and the auth listener — while waiting for a single AsyncStorage read.
  // With startup-prefs, the mode is initialised synchronously above so there
  // is nothing to wait for.

  const setMode = useCallback((m: ThemeMode) => {
    setModeState(m);
    AsyncStorage.setItem(STORAGE_KEY, m).catch(() => {});
  }, []);

  const toggleTheme = useCallback(() => {
    const next = mode === "dark" ? "light" : "dark";
    setMode(next);
  }, [mode, setMode]);

  const effectiveIsDark =
    mode === "system" ? systemScheme === "dark" : mode === "dark";

  const colors = effectiveIsDark ? Colors.dark : Colors.light;

  useEffect(() => {
    SystemUI.setBackgroundColorAsync(colors.background).catch(() => {});
  }, [colors.background]);

  const contextValue = useMemo(
    () => ({ colors, isDark: effectiveIsDark, mode, setMode, toggleTheme }),
    [colors, effectiveIsDark, mode, setMode, toggleTheme]
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
