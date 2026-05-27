import { useState, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { setHapticsEnabled } from "@/shared/utils/haptics";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useFeedbackSettings } from "./useFeedbackSettings";
import { useDataSettings } from "./useDataSettings";
import { useAccountSettings } from "./useAccountSettings";

export type Section = "main" | "profile" | "account" | "guide" | "feedback" | "following" | "comments" | "history";

const HAPTIC_KEY = "haptic_enabled";
const STARTUP_SCREEN_KEY = "qrg:startup:screen";

export function useSettings() {
  const { user, signOut } = useAuth();
  const [section, setSection] = useState<Section>("main");
  const [hapticsEnabled, setHapticsEnabledState] = useState(false);
  const [startupScreen, setStartupScreenState] = useState<"home" | "scanner">("home");

  const feedback = useFeedbackSettings({ userId: user?.id ?? null, userEmail: user?.email || "" });
  const data = useDataSettings({ userId: user?.id });
  const account = useAccountSettings({ userId: user?.id, signOut });

  useEffect(() => {
    feedback.resetFeedback(user?.email || "");
    setSection("main");
    data.resetData();
    account.resetAccount();
  }, [user?.id]);

  useEffect(() => {
    AsyncStorage.getItem(HAPTIC_KEY).then((v) => {
      const enabled = v === "true";
      setHapticsEnabledState(enabled);
      setHapticsEnabled(enabled);
    });
    AsyncStorage.getItem(STARTUP_SCREEN_KEY).then((v) => {
      if (v === "scanner") setStartupScreenState("scanner");
    });
  }, []);

  const toggleHaptics = useCallback(async () => {
    const next = !hapticsEnabled;
    setHapticsEnabledState(next);
    setHapticsEnabled(next);
    await AsyncStorage.setItem(HAPTIC_KEY, String(next));
  }, [hapticsEnabled]);

  const setStartupScreen = useCallback(async (screen: "home" | "scanner") => {
    setStartupScreenState(screen);
    await AsyncStorage.setItem(STARTUP_SCREEN_KEY, screen);
  }, []);

  const handleSectionChange = useCallback((s: Section) => {
    setSection(s);
    if (s === "following") data.loadFollowing();
    if (s === "comments") data.loadMyComments();
    if (s === "history") data.loadMyHistory();
  }, [data.loadFollowing, data.loadMyComments, data.loadMyHistory]);

  return {
    user,
    section,
    setSection: handleSectionChange,
    hapticsEnabled,
    toggleHaptics,
    startupScreen,
    setStartupScreen,
    ...feedback,
    ...data,
    ...account,
  };
}
