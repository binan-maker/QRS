import React, { useState, useCallback } from "react";
import { reloadAppAsync } from "expo";
import { View, Text, Pressable, ActivityIndicator } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { DARK, styles } from "./error-fallback-styles";
import { submitBugReport } from "./submit-bug-report";
import { ErrorReportView } from "./ErrorReportView";

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

export function ErrorFallback({ error, resetError }: ErrorFallbackProps) {
  const insets = useSafeAreaInsets();
  const [view, setView] = useState<"main" | "report">("main");
  const [reportText, setReportText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const handleRestart = useCallback(async () => {
    try {
      await reloadAppAsync();
    } catch {
      resetError();
    }
  }, [resetError]);

  const handleSubmitReport = useCallback(async () => {
    setSubmitting(true);
    setSubmitError(null);
    try {
      await submitBugReport(reportText, error);
      setSubmitted(true);
      try {
        const stored = await AsyncStorage.getItem("qrguard_last_crash");
        const prev = stored ? JSON.parse(stored) : { count: 0 };
        await AsyncStorage.setItem(
          "qrguard_last_crash",
          JSON.stringify({ count: (prev.count || 0) + 1, lastAt: Date.now() })
        );
      } catch {}
    } catch (e: any) {
      setSubmitError(e.message || "Could not send report. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }, [reportText, error]);

  if (view === "report") {
    return (
      <ErrorReportView
        error={error}
        reportText={reportText}
        setReportText={setReportText}
        submitted={submitted}
        submitting={submitting}
        submitError={submitError}
        topPadding={insets.top + 16}
        bottomPadding={insets.bottom + 16}
        handleRestart={handleRestart}
        handleSubmitReport={handleSubmitReport}
        onBack={() => setView("main")}
      />
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 }]}>
      <View style={styles.iconCircle}>
        <Ionicons name="warning" size={40} color={DARK.danger} />
      </View>

      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.subtitle}>
        BinRo ran into an unexpected problem. You can reload to continue or send us a report to help us fix it.
      </Text>

      <View style={styles.errorBox}>
        <Text style={styles.errorBoxLabel}>ERROR DETAILS</Text>
        <Text style={styles.errorBoxText} numberOfLines={5} selectable>
          {error.message || "An unexpected error occurred."}
        </Text>
      </View>

      <View style={styles.actions}>
        <Pressable
          onPress={handleRestart}
          style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="refresh" size={18} color="#000" />
          <Text style={styles.primaryBtnText}>Reload App</Text>
        </Pressable>

        <Pressable
          onPress={() => setView("report")}
          style={({ pressed }) => [styles.secondaryBtn, { opacity: pressed ? 0.8 : 1 }]}
        >
          <Ionicons name="bug-outline" size={18} color={DARK.textSecondary} />
          <Text style={styles.secondaryBtnText}>Report Issue</Text>
        </Pressable>

        <Pressable
          onPress={resetError}
          style={({ pressed }) => [styles.ghostBtn, { opacity: pressed ? 0.7 : 1 }]}
        >
          <Text style={styles.ghostBtnText}>Dismiss and try to continue</Text>
        </Pressable>
      </View>
    </View>
  );
}
