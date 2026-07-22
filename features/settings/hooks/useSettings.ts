import { useState, useEffect, useCallback, useRef } from "react";
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
  const [startupScreen, setStartupScreenState] = useState<"home" | "scanner">("home");

  const feedback = useFeedbackSettings({ userId: user?.id ?? null, userEmail: user?.email || "" });
  const data = useDataSettings({ userId: user?.id });
  const account = useAccountSettings({ userId: user?.id, signOut });

  // Use refs so the user-change effect always calls the latest reset functions
  // without needing them as deps (avoids stale-closure resets if sub-hook
  // identity changes between the user-change render and the effect flush).
  const feedbackResetRef = useRef(feedback.resetFeedback);
  const dataResetRef     = useRef(data.resetData);
  const accountResetRef  = useRef(account.resetAccount);
  feedbackResetRef.current = feedback.resetFeedback;
  dataResetRef.current     = data.resetData;
  accountResetRef.current  = account.resetAccount;

  useEffect(() => {
    feedbackResetRef.current(user?.email || "");
    setSection("main");
    dataResetRef.current();
    accountResetRef.current();
  }, [user?.id]);

  useEffect(() => {
    // Apply stored haptic preference at startup even though there is no UI
    // toggle yet — keeps the saved preference active across sessions.
    AsyncStorage.getItem(HAPTIC_KEY).then((v) => {
      setHapticsEnabled(v === "true");
    });
    AsyncStorage.getItem(STARTUP_SCREEN_KEY).then((v) => {
      if (v === "scanner") setStartupScreenState("scanner");
    });
  }, []);

  const setStartupScreen = useCallback(async (screen: "home" | "scanner") => {
    setStartupScreenState(screen);
    await AsyncStorage.setItem(STARTUP_SCREEN_KEY, screen);
  }, []);

  // Keep stable refs to the data-load functions so the section handler never
  // goes stale even if sub-hook identity changes across renders.
  const loadFollowingRef  = useRef(data.loadFollowing);
  const loadCommentsRef   = useRef(data.loadMyComments);
  const loadHistoryRef    = useRef(data.loadMyHistory);
  loadFollowingRef.current = data.loadFollowing;
  loadCommentsRef.current  = data.loadMyComments;
  loadHistoryRef.current   = data.loadMyHistory;

  const handleSectionChange = useCallback((s: Section) => {
    setSection(s);
    if (s === "following") loadFollowingRef.current();
    if (s === "comments")  loadCommentsRef.current();
    if (s === "history")   loadHistoryRef.current();
  }, []);

  return {
    user,
    section,
    setSection: handleSectionChange,
    startupScreen,
    setStartupScreen,
    ...feedback,
    ...data,
    ...account,
  };
}
