import { useState, useEffect, useCallback, useRef } from "react";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useFeedbackSettings } from "./useFeedbackSettings";
import { useDataSettings } from "./useDataSettings";
import { useAccountSettings } from "./useAccountSettings";

export type Section = "main" | "profile" | "account" | "guide" | "feedback" | "comments" | "history";

export function useSettings() {
  const { user, signOut } = useAuth();
  const [section, setSection] = useState<Section>("main");

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

  // Keep stable refs to the data-load functions so the section handler never
  // goes stale even if sub-hook identity changes across renders.
  const loadCommentsRef   = useRef(data.loadMyComments);
  const loadHistoryRef    = useRef(data.loadMyHistory);
  loadCommentsRef.current  = data.loadMyComments;
  loadHistoryRef.current   = data.loadMyHistory;

  const handleSectionChange = useCallback((s: Section) => {
    setSection(s);
    if (s === "comments")  loadCommentsRef.current();
    if (s === "history")   loadHistoryRef.current();
  }, []);

  return {
    user,
    section,
    setSection: handleSectionChange,
    ...feedback,
    ...data,
    ...account,
  };
}
