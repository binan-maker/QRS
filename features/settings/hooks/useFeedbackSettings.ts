import { useState, useCallback } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "@/shared/utils/haptics";
import { submitFeedback } from "@/lib/firestore-service";

const STORAGE_KEY = "qrg:feedback:timestamps";

// ── Rate limits ────────────────────────────────────────────────────────────────
// Each window defines a rolling period (ms) and max submissions allowed in it.
const RATE_LIMITS = [
  { label: "5 minutes",  ms: 5  * 60 * 1000,        max: 1  },
  { label: "1 hour",     ms: 60 * 60 * 1000,         max: 3  },
  { label: "1 day",      ms: 24 * 60 * 60 * 1000,    max: 10 },
  { label: "1 month",    ms: 30 * 24 * 60 * 60 * 1000, max: 20 },
] as const;

async function loadTimestamps(): Promise<number[]> {
  try {
    const raw = await AsyncStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as number[];
  } catch {
    return [];
  }
}

async function saveTimestamps(ts: number[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(ts));
  } catch {}
}

/** Returns a human-readable "try again in X" string, or null if allowed. */
function checkRateLimits(timestamps: number[], now: number): string | null {
  for (const limit of RATE_LIMITS) {
    const windowStart = now - limit.ms;
    const count = timestamps.filter((t) => t > windowStart).length;
    if (count >= limit.max) {
      // Find the oldest timestamp in this window — user can retry after it expires
      const oldest = timestamps
        .filter((t) => t > windowStart)
        .sort((a, b) => a - b)[0];
      const retryAt = oldest + limit.ms;
      const waitMs  = retryAt - now;
      const waitMin = Math.ceil(waitMs / 60_000);
      const waitHr  = Math.ceil(waitMs / 3_600_000);
      const waitDay = Math.ceil(waitMs / 86_400_000);
      const waitStr =
        waitMs < 60_000        ? `${Math.ceil(waitMs / 1000)} seconds`
        : waitMin < 60         ? `${waitMin} minute${waitMin !== 1 ? "s" : ""}`
        : waitHr  < 24         ? `${waitHr} hour${waitHr !== 1 ? "s" : ""}`
                               : `${waitDay} day${waitDay !== 1 ? "s" : ""}`;
      return `You've reached the ${limit.label} limit (${limit.max} feedback${limit.max !== 1 ? "s" : ""}). Please try again in ${waitStr}.`;
    }
  }
  return null;
}

interface UseFeedbackSettingsOptions {
  userId: string | null;
  userEmail: string;
}

export function useFeedbackSettings({ userId, userEmail }: UseFeedbackSettingsOptions) {
  const [feedbackText,    setFeedbackText]    = useState("");
  const [feedbackEmail,   setFeedbackEmail]   = useState(userEmail);
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackDone,    setFeedbackDone]    = useState(false);

  const resetFeedback = useCallback((email: string) => {
    setFeedbackEmail(email);
    setFeedbackText("");
    setFeedbackDone(false);
  }, []);

  // Let the user go back to the form to send another message
  const handleSendAnother = useCallback(() => {
    setFeedbackText("");
    setFeedbackDone(false);
  }, []);

  const handleSubmitFeedback = useCallback(async () => {
    if (!feedbackText.trim()) return;
    setFeedbackSubmitting(true);
    try {
      const now        = Date.now();
      const timestamps = await loadTimestamps();

      // Prune timestamps older than the longest window (1 month)
      const maxWindow  = RATE_LIMITS[RATE_LIMITS.length - 1].ms;
      const pruned     = timestamps.filter((t) => t > now - maxWindow);

      const blocked = checkRateLimits(pruned, now);
      if (blocked) {
        Alert.alert("Slow down a bit 🙏", blocked);
        return;
      }

      await submitFeedback(userId, feedbackEmail.trim() || null, feedbackText.trim());

      // Record this submission
      await saveTimestamps([...pruned, now]);

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
    feedbackText,    setFeedbackText,
    feedbackEmail,   setFeedbackEmail,
    feedbackSubmitting,
    feedbackDone,
    resetFeedback,
    handleSubmitFeedback,
    handleSendAnother,
  };
}
