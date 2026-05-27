import React from "react";
import {
  View, Text, Pressable, ScrollView, TextInput, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { DARK, styles } from "./error-fallback-styles";

interface Props {
  error: Error;
  reportText: string;
  setReportText: (t: string) => void;
  submitted: boolean;
  submitting: boolean;
  submitError: string | null;
  topPadding: number;
  bottomPadding: number;
  handleRestart: () => void;
  handleSubmitReport: () => void;
  onBack: () => void;
}

export function ErrorReportView({
  error, reportText, setReportText,
  submitted, submitting, submitError,
  topPadding, bottomPadding,
  handleRestart, handleSubmitReport, onBack,
}: Props) {
  return (
    <View style={[styles.container, { paddingTop: topPadding, paddingBottom: bottomPadding }]}>
      <Pressable onPress={onBack} style={styles.backRow}>
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
              style={({ pressed }) => [styles.primaryBtn, { opacity: pressed ? 0.85 : 1 }]}
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
              style={({ pressed }) => [styles.primaryBtn, { opacity: pressed || submitting ? 0.7 : 1 }]}
            >
              {submitting
                ? <ActivityIndicator size="small" color="#000" />
                : <Ionicons name="send" size={18} color="#000" />}
              <Text style={styles.primaryBtnText}>{submitting ? "Sending…" : "Send Report"}</Text>
            </Pressable>
          </>
        )}
      </ScrollView>
    </View>
  );
}
