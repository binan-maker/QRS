import { View, Text, TextInput, Pressable, ScrollView, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { settingsStyles as styles } from "@/features/settings/styles";
import Colors from "@/constants/colors";

interface Props {
  feedbackText: string;
  setFeedbackText: (v: string) => void;
  feedbackEmail: string;
  setFeedbackEmail: (v: string) => void;
  feedbackSubmitting: boolean;
  feedbackDone: boolean;
  handleSubmitFeedback: () => void;
}

export default function FeedbackSection({
  feedbackText, setFeedbackText, feedbackEmail, setFeedbackEmail,
  feedbackSubmitting, feedbackDone, handleSubmitFeedback,
}: Props) {
  const insets = useSafeAreaInsets();

  if (feedbackDone) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", gap: 16, padding: 32 }}>
        <View style={[styles.guideStepIcon, { width: 72, height: 72, borderRadius: 36 }]}>
          <Ionicons name="checkmark-circle" size={40} color={Colors.dark.safe} />
        </View>
        <Text style={{ fontSize: 20, fontFamily: "Inter_700Bold", color: Colors.dark.text, textAlign: "center" }}>
          Thank you!
        </Text>
        <Text style={{ fontSize: 15, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, textAlign: "center" }}>
          Your feedback has been submitted. We appreciate you helping improve QR Guard.
        </Text>
      </View>
    );
  }

  return (
    <ScrollView
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 20 }]}
    >
      <Text style={styles.feedbackIntro}>
        Found a bug? Have a feature idea? We'd love to hear from you.
      </Text>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Email (optional)</Text>
        <TextInput
          style={styles.textInput}
          value={feedbackEmail}
          onChangeText={setFeedbackEmail}
          placeholder="your@email.com"
          placeholderTextColor={Colors.dark.textMuted}
          keyboardType="email-address"
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputGroup}>
        <Text style={styles.inputLabel}>Your Feedback *</Text>
        <TextInput
          style={[styles.textInput, styles.textArea]}
          value={feedbackText}
          onChangeText={setFeedbackText}
          placeholder="Tell us what's on your mind..."
          placeholderTextColor={Colors.dark.textMuted}
          multiline
          numberOfLines={6}
          textAlignVertical="top"
          maxLength={1000}
        />
        <Text style={styles.charCount}>{feedbackText.length}/1000</Text>
      </View>

      <Pressable
        onPress={handleSubmitFeedback}
        disabled={feedbackSubmitting || !feedbackText.trim()}
        style={({ pressed }) => [
          styles.submitBtn,
          { opacity: feedbackSubmitting || !feedbackText.trim() ? 0.5 : pressed ? 0.8 : 1 },
        ]}
      >
        {feedbackSubmitting ? (
          <ActivityIndicator color="#000" />
        ) : (
          <>
            <Ionicons name="send" size={18} color="#000" />
            <Text style={styles.submitBtnText}>Submit Feedback</Text>
          </>
        )}
      </Pressable>
    </ScrollView>
  );
}
