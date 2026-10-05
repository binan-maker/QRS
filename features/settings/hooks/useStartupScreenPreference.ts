import { useCallback, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

const STARTUP_SCREEN_KEY = "qrg:startup:screen";

export type StartupScreen = "home" | "scanner";

export function useStartupScreenPreference() {
  const [startupScreen, setStartupScreenState] = useState<StartupScreen>("home");

  useEffect(() => {
    AsyncStorage.getItem(STARTUP_SCREEN_KEY)
      .then((value) => {
        if (value === "scanner") setStartupScreenState("scanner");
      })
      .catch(() => {});
  }, []);

  const setStartupScreen = useCallback(async (screen: StartupScreen) => {
    setStartupScreenState(screen);
    await AsyncStorage.setItem(STARTUP_SCREEN_KEY, screen);
  }, []);

  return { startupScreen, setStartupScreen };
}