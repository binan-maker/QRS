import { useState, useCallback } from "react";
import { Alert } from "react-native";
import * as Haptics from "@/shared/utils/haptics";
import { submitFeedback } from "@/lib/firestore-service";

interface UseFeedbackSettingsOptions {
  userId: string | null;
  userEmail: string;
}

export function useFeedbackSettings({ userId, userEmail }: UseFeedbackSettingsOptions) {
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState(userEmail);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);

  const resetFeedback = useCallback((email: string) => {
    setFeedbackEmail(email);
    setFeedbackText("");
    setFeedbackDone(false);
  }, []);

  const handleSubmitFeedback = useCallback(async () => {
    if (!feedbackText.trim()) return;
    setFeedbackSubmitting(true);
    try {
      await submitFeedback(userId, feedbackEmail.trim() || null, feedbackText.trim());
      setFeedbackDone(true);
      setFeedbackText("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Could not submit feedback. Please try again.");
    } finally {
      setFeedbackSubmitting(false);
    }
  }, [feedbackText, feedbackEmail, userId]);

  return {
    feedbackText, setFeedbackText,
    feedbackEmail, setFeedbackEmail,
    feedbackSubmitting,
    feedbackDone,
    resetFeedback,
    handleSubmitFeedback,
  };
}
