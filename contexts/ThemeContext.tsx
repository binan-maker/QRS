import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
} from "react";
import { useColorScheme } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as SystemUI from "expo-system-ui";
import Colors, { type AppColors } from "@/constants/colors";

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

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const systemScheme = useColorScheme();
  const [mode, setModeState] = useState<ThemeMode>("system");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY)
      .then((stored) => {
        if (stored === "dark" || stored === "light" || stored === "system") {
          setModeState(stored as ThemeMode);
        }
      })
      .catch(() => {})
      .finally(() => setReady(true));
  }, []);

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

  if (!ready) return null;

  return (
    <ThemeContext.Provider
      value={{ colors, isDark: effectiveIsDark, mode, setMode, toggleTheme }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}
