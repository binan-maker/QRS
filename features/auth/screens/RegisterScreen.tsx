import { useState, useEffect } from "react";
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import Animated from "react-native-reanimated";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import GoogleIcon from "@/shared/components/ui/GoogleIcon";
import GoogleAuthLoading from "@/shared/components/ui/GoogleAuthLoading";
import AuthFormInput from "@/features/auth/components/AuthFormInput";
import AuthBrandBlock from "@/features/auth/components/AuthBrandBlock";
import { useAuthScale } from "@/features/auth/hooks/useAuthScale";
import { makeAuthStyles } from "@/features/auth/styles";
import { validateEmail } from "@/validators";
import { useFadeSlide } from "@/features/auth/hooks/useFadeSlide";

export default function RegisterScreen() {
  const { signUp, signInWithGoogle, googleRequest, user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { sp, px, height } = useAuthScale();
  const S = makeAuthStyles(colors);

  const brandStyle  = useFadeSlide(0, -16);
  const cardStyle   = useFadeSlide(80, 28);
  const footerStyle = useFadeSlide(200, 16);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  useEffect(() => {
    if (user) router.replace("/(tabs)");
  }, [user]);

  useEffect(() => {
    if (user && googleLoading) {
      setGoogleLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissAll();
    }
  }, [user]);

  async function handleRegister() {
    const newFieldErrors = { name: "", email: "", password: "" };
    let hasFieldError = false;
    if (!displayName.trim()) { newFieldErrors.name = "Name is required."; hasFieldError = true; }
    if (!email.trim()) {
      newFieldErrors.email = "Email address is required."; hasFieldError = true;
    } else {
      const emailCheck = validateEmail(email.trim());
      if (!emailCheck.valid) {
        newFieldErrors.email = emailCheck.error || "Please use a real email address.";
        hasFieldError = true;
      }
    }
    if (!password.trim()) { newFieldErrors.password = "Password is required."; hasFieldError = true; }
    else if (password.length < 8) { newFieldErrors.password = "Password must be at least 8 characters."; hasFieldError = true; }
    else if (!/(?=.*[0-9])/.test(password)) { newFieldErrors.password = "Password must contain at least one number."; hasFieldError = true; }
    if (hasFieldError) { setFieldErrors(newFieldErrors); setError(""); return; }
    setError(""); setErrorCode(""); setFieldErrors({ name: "", email: "", password: "" }); setLoading(true);
    try {
      await signUp(email.trim(), displayName.trim(), password);
    } catch (e: any) {
      if (e.code === "auth/verification-sent") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setRegisteredEmail(email.trim());
        setVerificationSent(true);
      } else {
        setErrorCode(e.code ?? "");
        setError(e.message || "Sign up failed. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally { setLoading(false); }
  }

  async function handleGoogleSignIn() {
    setError(""); setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // On success: user state updates → useEffect above resets googleLoading
      // and navigates away. Do NOT call setGoogleLoading(false) here.
    } catch (e: any) {
      if (e.code === "auth/cancelled-by-user") {
        // User tapped Cancel, or first-tap iOS animation race — reset quietly.
      } else {
        setError(e.message || "Google sign-in failed. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setGoogleLoading(false);
    }
  }

  if (verificationSent) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[S.centeredContainer, { paddingBottom: insets.bottom + 40, paddingTop: insets.top + 40, paddingHorizontal: px }]}>
          <View style={[S.successOrb, { backgroundColor: colors.safeDim, borderColor: colors.safe + "30" }]}>
            <Ionicons name="mail-open-outline" size={sp(38)} color={colors.safe} />
          </View>
          <Text style={{ color: colors.text, fontSize: sp(22), fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "center" }}>
            Check your inbox
          </Text>
          <Text style={[S.verifyText, { color: colors.textSecondary, fontSize: sp(14), lineHeight: sp(22) }]}>
            We sent a verification link to{"\n"}
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{registeredEmail}</Text>
            {"\n\n"}Tap the link to activate your account, then sign in.
          </Text>
          <Pressable
            onPress={() => router.replace("/(auth)/login")}
            style={({ pressed }) => [S.primaryBtn, { backgroundColor: colors.primary, paddingVertical: sp(13), width: "100%", opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <Text style={[S.primaryBtnText, { fontSize: sp(14) }]}>Go to Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isDupEmail = errorCode === "auth/email-already-in-use";

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
            <Animated.View style={brandStyle}>
              <AuthBrandBlock title="Create an account" />
            </Animated.View>

            <Animated.View style={[S.card, { backgroundColor: colors.isDark ? "rgba(16,25,41,0.94)" : "#fff", borderColor: colors.surfaceBorder, padding: sp(20) }, cardStyle]}>
              {error ? (
                <View style={[S.errorBanner, { backgroundColor: isDupEmail ? colors.warningDim : colors.dangerDim, borderColor: isDupEmail ? colors.warning + "40" : colors.danger + "40", flexDirection: "column", marginBottom: sp(12) }]}>
                  <View style={S.errorRow}>
                    <Ionicons name="alert-circle" size={14} color={isDupEmail ? colors.warning : colors.danger} />
                    <Text style={[S.errorText, { color: isDupEmail ? colors.warning : colors.danger, fontSize: sp(12) }]}>{error}</Text>
                  </View>
                  {isDupEmail && (
                    <View style={styles.errorActions}>
                      <Pressable onPress={() => router.replace("/(auth)/login")} hitSlop={6} style={[styles.errorActionBtn, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.errorActionText, { fontSize: sp(11) }]}>Sign In</Text>
                      </Pressable>
                      <Pressable onPress={() => router.replace("/(auth)/forgot-password")} hitSlop={6} style={[styles.errorActionBtn, { backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.surfaceBorder }]}>
                        <Text style={[styles.errorActionText, { color: colors.textSecondary, fontSize: sp(11) }]}>Forgot Password?</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ) : null}

              <Pressable
                onPress={handleGoogleSignIn}
                disabled={googleLoading || (!googleRequest && Platform.OS === "web")}
                style={({ pressed }) => [S.googleBtn, { backgroundColor: colors.isDark ? "rgba(255,255,255,0.05)" : colors.surfaceLight, borderColor: colors.surfaceBorder, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }], paddingVertical: sp(12) }]}
              >
                <GoogleIcon size={sp(18)} />
                <Text style={[S.googleBtnText, { color: colors.text, fontSize: sp(13) }]}>Continue with Google</Text>
              </Pressable>

              <View style={[S.dividerRow, { marginVertical: sp(14) }]}>
                <View style={[S.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
                <Text style={[S.dividerText, { color: colors.textMuted, fontSize: sp(11) }]}>or with email</Text>
                <View style={[S.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
              </View>

              <View style={{ gap: sp(10) }}>
                <AuthFormInput
                  icon="person-outline"
                  placeholder="Full name"
                  value={displayName}
                  onChangeText={(v) => { setDisplayName(v); if (fieldErrors.name) setFieldErrors((p) => ({ ...p, name: "" })); }}
                  autoCapitalize="words"
                  error={fieldErrors.name}
                />
                <AuthFormInput
                  icon="mail-outline"
                  placeholder="Email address"
                  value={email}
                  onChangeText={(v) => { setEmail(v); if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: "" })); }}
                  keyboardType="email-address"
                  autoCapitalize="none"
                  autoCorrect={false}
                  error={fieldErrors.email}
                />
                <AuthFormInput
                  icon="lock-closed-outline"
                  placeholder="Password (min. 8 chars + number)"
                  value={password}
                  onChangeText={(v) => { setPassword(v); if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: "" })); }}
                  secureTextEntry={!showPassword}
                  showToggle
                  toggleVisible={showPassword}
                  onToggleVisible={() => setShowPassword(!showPassword)}
                  error={fieldErrors.password}
                />

                <Pressable
                  onPress={handleRegister}
                  disabled={loading}
                  style={({ pressed }) => [S.primaryBtn, { backgroundColor: colors.primary, paddingVertical: sp(13), marginTop: sp(4), opacity: pressed || loading ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={[S.primaryBtnText, { fontSize: sp(14) }]}>Create Account</Text>}
                </Pressable>
              </View>
            </Animated.View>

            <Animated.View style={[S.footer, { marginTop: sp(20) }, footerStyle]}>
              <Text style={[S.footerText, { color: colors.textSecondary, fontSize: sp(13) }]}>Already have an account?</Text>
              <Link href="/(auth)/login" asChild>
                <Pressable hitSlop={8}>
                  <Text style={[S.footerLink, { color: colors.primary, fontSize: sp(13) }]}>Sign in</Text>
                </Pressable>
              </Link>
            </Animated.View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <GoogleAuthLoading visible={googleLoading} />
    </View>
  );
}

const styles = StyleSheet.create({
  errorActions:    { flexDirection: "row", gap: 8, marginTop: 2, paddingLeft: 22 },
  errorActionBtn:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  errorActionText: { fontFamily: "Inter_600SemiBold", color: "#fff" },
});
