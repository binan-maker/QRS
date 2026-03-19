import React, { useState, useCallback } from "react";
import { reloadAppAsync } from "expo";
import {
  StyleSheet,
  View,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  Platform,
  ActivityIndicator,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type ErrorFallbackProps = {
  error: Error;
  resetError: () => void;
};

const DARK = {
  background: "#0a0e17",
  surface: "#111827",
  surfaceBorder: "rgba(255,255,255,0.08)",
  text: "#f8fafc",
  textSecondary: "#94a3b8",
  textMuted: "#64748b",
  primary: "#00d4ff",
  danger: "#ef4444",
  safe: "#22c55e",
};

async function submitBugReport(message: string, error: Error): Promise<void> {
  const FIREBASE_PROJECT_ID =
    (typeof process !== "undefined" && process.env?.FIREBASE_PROJECT_ID) ||
    "scan-guard-19a7f";
  const FIREBASE_API_KEY =
    (typeof process !== "undefined" && process.env?.FIREBASE_API_KEY) ||
    "AIzaSyClEPO1EIRG3vxbQgS6l9AdZj0dIt765e0";

  const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/bugReports?key=${FIREBASE_API_KEY}`;

  let deviceInfo = `Platform: ${Platform.OS}`;
  try {
    const stored = await AsyncStorage.getItem("qrguard_last_crash");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed?.count) deviceInfo += `, crash #${parsed.count}`;
    }
  } catch {}

  const body = {
    fields: {
      errorMessage: { stringValue: error.message || "Unknown error" },
      errorStack: { stringValue: (error.stack || "").slice(0, 2000) },
      userMessage: { stringValue: message || "" },
      deviceInfo: { stringValue: deviceInfo },
      reportedAt: { timestampValue: new Date().toISOString() },
      appVersion: { stringValue: "1.0.0" },
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`Failed to submit report (${res.status}): ${text}`);
  }
}

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
      // Record that we submitted so we don't spam
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
      <View
        style={[
          styles.container,
          { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 16 },
        ]}
      >
        <Pressable onPress={() => setView("main")} style={styles.backRow}>
          <Ionicons name="chevron-back" size={22} color={DARK.textSecondary} />
          <Text style={styles.backText}>Back</Text>
        </Pressable>

        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={styles.reportContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {submitted ? (
            <View style={styles.successBox}>
              <View style={styles.successIcon}>
                <Ionicons name="checkmark-circle" size={48} color={DARK.safe} />
              </View>
              <Text style={styles.successTitle}>Report Sent</Text>
              <Text style={styles.successMsg}>
                Thank you! Our team will look into this. You can now reload the app.
              </Text>
              <Pressable
                onPress={handleRestart}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Ionicons name="refresh" size={18} color="#000" />
                <Text style={styles.primaryBtnText}>Reload App</Text>
              </Pressable>
            </View>
          ) : (
            <>
              <Text style={styles.reportTitle}>Report This Issue</Text>
              <Text style={styles.reportSubtitle}>
                Tell us what you were doing when the crash happened. This really helps us fix it faster.
              </Text>

              <View style={styles.errorPreview}>
                <Text style={styles.errorPreviewLabel}>ERROR</Text>
                <Text style={styles.errorPreviewText} numberOfLines={4}>
                  {error.message || "Unknown error"}
                </Text>
              </View>

              <Text style={styles.inputLabel}>What were you doing? (optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. I tapped the scan button and then..."
                placeholderTextColor={DARK.textMuted}
                value={reportText}
                onChangeText={setReportText}
                multiline
                numberOfLines={4}
                maxLength={500}
                textAlignVertical="top"
              />
              <Text style={styles.charCount}>{reportText.length}/500</Text>

              {submitError && (
                <View style={styles.submitErrorBox}>
                  <Ionicons name="warning-outline" size={16} color={DARK.danger} />
                  <Text style={styles.submitErrorText}>{submitError}</Text>
                </View>
              )}

              <Pressable
                onPress={handleSubmitReport}
                disabled={submitting}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { opacity: pressed || submitting ? 0.7 : 1 },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#000" />
                ) : (
                  <Ionicons name="send" size={18} color="#000" />
                )}
                <Text style={styles.primaryBtnText}>
                  {submitting ? "Sending…" : "Send Report"}
                </Text>
              </Pressable>
            </>
          )}
        </ScrollView>
      </View>
    );
  }

  return (
    <View
      style={[
        styles.container,
        { paddingTop: insets.top + 24, paddingBottom: insets.bottom + 24 },
      ]}
    >
      <View style={styles.iconCircle}>
        <Ionicons name="warning" size={40} color={DARK.danger} />
      </View>

      <Text style={styles.title}>Something went wrong</Text>
      <Text style={styles.subtitle}>
        QR Guard ran into an unexpected problem. You can reload to continue or send us a report to help us fix it.
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
          style={({ pressed }) => [
            styles.primaryBtn,
            { opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="refresh" size={18} color="#000" />
          <Text style={styles.primaryBtnText}>Reload App</Text>
        </Pressable>

        <Pressable
          onPress={() => setView("report")}
          style={({ pressed }) => [
            styles.secondaryBtn,
            { opacity: pressed ? 0.8 : 1 },
          ]}
        >
          <Ionicons name="bug-outline" size={18} color={DARK.textSecondary} />
          <Text style={styles.secondaryBtnText}>Report Issue</Text>
        </Pressable>

        <Pressable
          onPress={resetError}
          style={({ pressed }) => [
            styles.ghostBtn,
            { opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Text style={styles.ghostBtnText}>Dismiss and try to continue</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: DARK.background,
    paddingHorizontal: 24,
    alignItems: "center",
    justifyContent: "center",
  },
  iconCircle: {
    width: 88,
    height: 88,
    borderRadius: 44,
    backgroundColor: "rgba(239,68,68,0.12)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: DARK.text,
    textAlign: "center",
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 15,
    color: DARK.textSecondary,
    textAlign: "center",
    lineHeight: 22,
    marginBottom: 24,
    maxWidth: 320,
  },
  errorBox: {
    width: "100%",
    backgroundColor: DARK.surface,
    borderWidth: 1,
    borderColor: DARK.surfaceBorder,
    borderRadius: 12,
    padding: 14,
    marginBottom: 28,
  },
  errorBoxLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: DARK.danger,
    letterSpacing: 1.2,
    marginBottom: 6,
  },
  errorBoxText: {
    fontSize: 12,
    color: DARK.textSecondary,
    lineHeight: 18,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  },
  actions: {
    width: "100%",
    gap: 10,
    alignItems: "center",
  },
  primaryBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: DARK.primary,
    paddingVertical: 15,
    borderRadius: 14,
  },
  primaryBtnText: {
    fontSize: 15,
    fontWeight: "700",
    color: "#000",
  },
  secondaryBtn: {
    width: "100%",
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    backgroundColor: DARK.surface,
    borderWidth: 1,
    borderColor: DARK.surfaceBorder,
    paddingVertical: 14,
    borderRadius: 14,
  },
  secondaryBtnText: {
    fontSize: 15,
    fontWeight: "600",
    color: DARK.textSecondary,
  },
  ghostBtn: {
    paddingVertical: 10,
  },
  ghostBtnText: {
    fontSize: 13,
    color: DARK.textMuted,
    textDecorationLine: "underline",
  },
  backRow: {
    flexDirection: "row",
    alignItems: "center",
    alignSelf: "flex-start",
    marginBottom: 16,
    gap: 4,
  },
  backText: {
    fontSize: 15,
    color: DARK.textSecondary,
  },
  reportContent: {
    paddingBottom: 40,
  },
  reportTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: DARK.text,
    marginBottom: 8,
  },
  reportSubtitle: {
    fontSize: 14,
    color: DARK.textSecondary,
    lineHeight: 21,
    marginBottom: 20,
  },
  errorPreview: {
    backgroundColor: DARK.surface,
    borderWidth: 1,
    borderColor: DARK.surfaceBorder,
    borderRadius: 10,
    padding: 12,
    marginBottom: 20,
  },
  errorPreviewLabel: {
    fontSize: 10,
    fontWeight: "700",
    color: DARK.danger,
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  errorPreviewText: {
    fontSize: 12,
    color: DARK.textSecondary,
    lineHeight: 17,
    fontFamily: Platform.select({ ios: "Menlo", android: "monospace", default: "monospace" }),
  },
  inputLabel: {
    fontSize: 13,
    fontWeight: "600",
    color: DARK.textSecondary,
    marginBottom: 8,
  },
  input: {
    backgroundColor: DARK.surface,
    borderWidth: 1,
    borderColor: DARK.surfaceBorder,
    borderRadius: 12,
    padding: 14,
    fontSize: 14,
    color: DARK.text,
    minHeight: 110,
    lineHeight: 20,
  },
  charCount: {
    fontSize: 11,
    color: DARK.textMuted,
    textAlign: "right",
    marginTop: 4,
    marginBottom: 16,
  },
  submitErrorBox: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    backgroundColor: "rgba(239,68,68,0.1)",
    borderWidth: 1,
    borderColor: "rgba(239,68,68,0.25)",
    borderRadius: 10,
    padding: 12,
    marginBottom: 14,
  },
  submitErrorText: {
    flex: 1,
    fontSize: 13,
    color: DARK.danger,
    lineHeight: 18,
  },
  successBox: {
    alignItems: "center",
    paddingVertical: 40,
    gap: 12,
  },
  successIcon: {
    marginBottom: 8,
  },
  successTitle: {
    fontSize: 22,
    fontWeight: "700",
    color: DARK.text,
  },
  successMsg: {
    fontSize: 14,
    color: DARK.textSecondary,
    textAlign: "center",
    lineHeight: 21,
    marginBottom: 20,
    maxWidth: 280,
  },
});
