import { useState } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { sendPasswordReset } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    setError("");
    setEmailError("");
    if (!email.trim()) { setEmailError("Email address is required."); return; }
    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSent(true);
    } catch (e: any) {
      setError(e.message || "Failed to send reset email.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  if (sent) {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
          <View style={styles.iconContainer}>
            <View style={[styles.iconCircle, { backgroundColor: "rgba(16,185,129,0.15)" }]}>
              <Ionicons name="checkmark-circle" size={40} color={colors.safe} />
            </View>
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Check Your Email</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            A password reset link has been sent to{"\n"}
            <Text style={{ color: colors.primary }}>{email}</Text>
            {"\n\n"}Follow the link in the email to set a new password. If you don't see it, check your spam folder.
          </Text>
          <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed ? 0.8 : 1 }]}>
            <Text style={[styles.primaryButtonText, { color: colors.primaryText }]}>Back to Sign In</Text>
          </Pressable>
          <Pressable onPress={() => { setSent(false); setEmail(""); }} style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.6 : 1 }]}>
            <Text style={[styles.linkText, { color: colors.primary }]}>Try a different email</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={90}>
      <ScrollView contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]} keyboardShouldPersistTaps="handled">
        <View style={styles.iconContainer}>
          <View style={[styles.iconCircle, { backgroundColor: colors.primaryDim }]}>
            <Ionicons name="key-outline" size={40} color={colors.primary} />
          </View>
        </View>
        <Text style={[styles.title, { color: colors.text }]}>Forgot Password?</Text>
        <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
          Enter the email address linked to your account and we'll send you a link to reset your password.
        </Text>
        {error ? (
          <View style={[styles.errorContainer, { backgroundColor: colors.dangerDim }]}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : null}
        <View>
          <View style={[
            styles.inputContainer,
            { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder },
            emailError ? { borderColor: colors.danger, backgroundColor: colors.dangerDim } : null,
          ]}>
            <Ionicons name="mail-outline" size={20} color={emailError ? colors.danger : colors.textMuted} style={styles.inputIcon} />
            <TextInput
              style={[styles.input, { color: colors.text }]}
              placeholder="Email address"
              placeholderTextColor={colors.textMuted}
              value={email}
              onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(""); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>
          {emailError ? <Text style={[styles.fieldError, { color: colors.danger }]}>{emailError}</Text> : null}
        </View>
        <Pressable
          onPress={handleReset}
          disabled={loading}
          style={({ pressed }) => [styles.primaryButton, { backgroundColor: colors.primary, opacity: pressed || loading ? 0.8 : 1 }]}
        >
          {loading ? <ActivityIndicator color={colors.primaryText} /> : <Text style={[styles.primaryButtonText, { color: colors.primaryText }]}>Send Reset Link</Text>}
        </Pressable>
        <Pressable onPress={() => router.back()} style={({ pressed }) => [styles.linkButton, { opacity: pressed ? 0.6 : 1 }]}>
          <Text style={[styles.linkText, { color: colors.primary }]}>Back to Sign In</Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, padding: 24, justifyContent: "center", gap: 16 },
  iconContainer: { alignItems: "center", marginBottom: 8 },
  iconCircle: { width: 80, height: 80, borderRadius: 40, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", marginBottom: 8, lineHeight: 22 },
  errorContainer: { flexDirection: "row", alignItems: "center", gap: 8, padding: 12, borderRadius: 12 },
  errorText: { fontFamily: "Inter_500Medium", fontSize: 14, flex: 1 },
  inputContainer: { flexDirection: "row", alignItems: "center", borderRadius: 14, borderWidth: 1, paddingHorizontal: 16 },
  inputIcon: { marginRight: 12 },
  input: { flex: 1, paddingVertical: 16, fontSize: 16, fontFamily: "Inter_400Regular" },
  fieldError: { fontFamily: "Inter_400Regular", fontSize: 12, marginTop: 4, marginLeft: 4 },
  primaryButton: { paddingVertical: 16, borderRadius: 14, alignItems: "center", marginTop: 8 },
  primaryButtonText: { fontSize: 16, fontFamily: "Inter_700Bold" },
  linkButton: { alignItems: "center", paddingVertical: 8 },
  linkText: { fontFamily: "Inter_600SemiBold", fontSize: 14 },
});
