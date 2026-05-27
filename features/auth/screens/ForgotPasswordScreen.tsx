import { useState } from "react";
import {
  View, Text, Pressable, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import AuthFormInput from "@/features/auth/components/AuthFormInput";
import AuthBrandBlock from "@/features/auth/components/AuthBrandBlock";
import { useAuthScale } from "@/features/auth/hooks/useAuthScale";
import { makeAuthStyles } from "@/features/auth/styles";

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { sendPasswordReset } = useAuth();
  const insets = useSafeAreaInsets();
  const { sp, px, height } = useAuthScale();
  const S = makeAuthStyles(colors);

  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleReset() {
    setError(""); setEmailError("");
    if (!email.trim()) { setEmailError("Email address is required."); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email.trim())) { setEmailError("Please enter a valid email address."); return; }
    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
    } catch {
      // Intentionally swallow all errors — always show success to prevent email enumeration attacks
    } finally { setLoading(false); }
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    setSent(true);
  }

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[S.centeredContainer, { paddingBottom: insets.bottom + 40, paddingTop: insets.top + 40, paddingHorizontal: px }]}>
          <View style={[S.successOrb, { backgroundColor: colors.safeDim, borderColor: colors.safe + "30" }]}>
            <Ionicons name="checkmark-circle" size={sp(42)} color={colors.safe} />
          </View>
          <Text style={{ color: colors.text, fontSize: sp(22), fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "center" }}>
            Check your inbox
          </Text>
          <Text style={[S.bodyText, { color: colors.textSecondary, fontSize: sp(14), lineHeight: sp(22) }]}>
            A reset link was sent to{"\n"}
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{email}</Text>
            {"\n\n"}Follow the link to set a new password.
          </Text>
          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [S.primaryBtn, { backgroundColor: colors.primary, paddingVertical: sp(13), width: "100%", opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <Text style={[S.primaryBtnText, { fontSize: sp(14) }]}>Back to Sign In</Text>
          </Pressable>
          <Pressable onPress={() => { setSent(false); setEmail(""); }} hitSlop={8} style={S.linkBtn}>
            <Text style={[S.linkText, { color: colors.textSecondary, fontSize: sp(13) }]}>Try a different email</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={[S.scrollContent, { paddingTop: insets.top + 16, paddingBottom: insets.bottom + 24, paddingHorizontal: px, minHeight: height }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          <View style={S.inner}>
            <AuthBrandBlock
              title="Reset password"
              subtitle="Enter your email and we'll send you a reset link."
            />

            <View style={[S.card, { backgroundColor: colors.isDark ? "rgba(16,25,41,0.94)" : "#fff", borderColor: colors.surfaceBorder, padding: sp(20) }]}>
              {error ? (
                <View style={[S.errorBanner, { backgroundColor: colors.dangerDim, borderColor: colors.danger + "40", marginBottom: sp(12) }]}>
                  <View style={S.errorRow}>
                    <Ionicons name="alert-circle" size={14} color={colors.danger} />
                    <Text style={[S.errorText, { color: colors.danger, fontSize: sp(12) }]}>{error}</Text>
                  </View>
                </View>
              ) : null}

              <AuthFormInput
                icon="mail-outline"
                placeholder="Email address"
                value={email}
                onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(""); }}
                keyboardType="email-address"
                autoCapitalize="none"
                autoCorrect={false}
                error={emailError}
              />

              <View style={{ height: sp(12) }} />

              <Pressable
                onPress={handleReset}
                disabled={loading}
                style={({ pressed }) => [S.primaryBtn, { backgroundColor: colors.primary, paddingVertical: sp(13), opacity: pressed || loading ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
              >
                {loading
                  ? <ActivityIndicator color="#fff" />
                  : <Text style={[S.primaryBtnText, { fontSize: sp(14) }]}>Send Reset Link</Text>}
              </Pressable>
            </View>

            <Pressable onPress={() => router.back()} style={[S.linkBtn, { marginTop: sp(20) }]} hitSlop={8}>
              <Ionicons name="arrow-back" size={sp(13)} color={colors.textSecondary} />
              <Text style={[S.linkText, { color: colors.textSecondary, fontSize: sp(13) }]}>Back to Sign In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}
