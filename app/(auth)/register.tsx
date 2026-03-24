import { useState, useEffect } from "react";
import {
  View,
  Text,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "@/lib/haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import GoogleIcon from "@/components/GoogleIcon";
import AuthFormInput from "@/features/auth/components/AuthFormInput";

export default function RegisterScreen() {
  const { signUp, signInWithGoogle, googleRequest, user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

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
    if (!email.trim()) { newFieldErrors.email = "Email address is required."; hasFieldError = true; }
    if (!password.trim()) { newFieldErrors.password = "Password is required."; hasFieldError = true; }
    else if (password.length < 6) { newFieldErrors.password = "Password must be at least 6 characters."; hasFieldError = true; }
    if (hasFieldError) { setFieldErrors(newFieldErrors); setError(""); return; }
    setError(""); setFieldErrors({ name: "", email: "", password: "" }); setLoading(true);
    try {
      await signUp(email.trim(), displayName.trim(), password);
    } catch (e: any) {
      if (e.code === "auth/verification-sent") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        setRegisteredEmail(email.trim());
        setVerificationSent(true);
      } else {
        setError(e.message || "Sign up failed. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally { setLoading(false); }
  }

  async function handleGoogleSignIn() {
    setError(""); setGoogleLoading(true);
    try { await signInWithGoogle(); }
    catch (e: any) {
      setError(e.message || "Google sign-in failed. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setGoogleLoading(false); }
  }

  if (verificationSent) {
    return (
      <KeyboardAvoidingView style={{ flex: 1, backgroundColor: colors.background }} behavior={Platform.OS === "ios" ? "padding" : "height"}>
        <ScrollView contentContainerStyle={[styles.verifyContainer, { paddingBottom: insets.bottom + 32, paddingTop: insets.top + 60 }]} showsVerticalScrollIndicator={false}>
          <View style={[styles.successIconWrap, { backgroundColor: colors.safeDim }]}>
            <Ionicons name="mail-open-outline" size={44} color={colors.safe} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Verify Your Email</Text>
          <Text style={[styles.verifyText, { color: colors.textSecondary }]}>
            Your account has been created! A verification email has been sent to{"\n"}
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{registeredEmail}</Text>
            {"\n\n"}
            Click the link in the email to verify your account before signing in. Check your spam folder if you don't see it.
          </Text>
          <Pressable
            onPress={() => router.replace("/(auth)/login")}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <LinearGradient
              colors={colors.isDark ? ["#10B981", "#059669"] : ["#10B981", "#047857"]}
              style={styles.primaryBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.primaryBtnText}>Go to Sign In</Text>
            </LinearGradient>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32 }]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <LinearGradient
            colors={colors.isDark ? ["#00E5FF", "#006FFF", "#B060FF"] : ["#006FFF", "#0047CC", "#7C3AED"]}
            style={styles.logoCircle}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="person-add" size={32} color="#fff" />
          </LinearGradient>
          <Text style={[styles.appName, { color: colors.primary }]}>QR Guard</Text>
          <Text style={[styles.title, { color: colors.text }]}>Create account</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Join to comment, report, and sync your scan history
          </Text>
        </View>

        {/* Error Banner */}
        {error ? (
          <View style={[styles.errorBanner, { backgroundColor: colors.dangerDim, borderColor: colors.danger + "40" }]}>
            <Ionicons name="alert-circle" size={16} color={colors.danger} />
            <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
          </View>
        ) : null}

        {/* Google Button */}
        <Pressable
          onPress={handleGoogleSignIn}
          disabled={googleLoading || !googleRequest}
          style={({ pressed }) => [
            styles.googleBtn,
            { backgroundColor: colors.surface, borderColor: colors.surfaceBorder, opacity: pressed || googleLoading || !googleRequest ? 0.7 : 1 },
          ]}
        >
          {googleLoading ? (
            <ActivityIndicator color={colors.text} size="small" />
          ) : (
            <>
              <GoogleIcon size={20} />
              <Text style={[styles.googleBtnText, { color: colors.text }]}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
          <Text style={[styles.dividerText, { color: colors.textMuted }]}>or create with email</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
        </View>

        {/* Fields */}
        <View style={styles.fieldsSection}>
          <AuthFormInput
            icon="person-outline"
            placeholder="Display name"
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
            placeholder="Password (min 6 characters)"
            value={password}
            onChangeText={(v) => { setPassword(v); if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: "" })); }}
            secureTextEntry={!showPassword}
            showToggle
            toggleVisible={showPassword}
            onToggleVisible={() => setShowPassword(!showPassword)}
            error={fieldErrors.password}
          />

          {/* Create Account Button */}
          <Pressable
            onPress={handleRegister}
            disabled={loading}
            style={({ pressed }) => [{ opacity: pressed || loading ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <LinearGradient
              colors={colors.isDark ? ["#00E5FF", "#006FFF"] : ["#006FFF", "#0047CC"]}
              style={styles.primaryBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.primaryBtnText}>Create Account</Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Already have an account?</Text>
          <Link href="/(auth)/login" asChild>
            <Pressable>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Sign In</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24 },
  verifyContainer: { flexGrow: 1, paddingHorizontal: 32, alignItems: "center", gap: 16 },
  heroSection: { alignItems: "center", paddingTop: 52, paddingBottom: 28, gap: 6 },
  logoCircle: { width: 84, height: 84, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  appName: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 2, textTransform: "uppercase" },
  title: { fontSize: 30, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  verifyText: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 23 },
  successIconWrap: { width: 96, height: 96, borderRadius: 32, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  errorBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    padding: 14, borderRadius: 16, marginBottom: 12, borderWidth: 1,
  },
  errorText: { fontFamily: "Inter_500Medium", fontSize: 14, flex: 1 },
  googleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12,
    borderWidth: 1, paddingVertical: 15, paddingHorizontal: 20, borderRadius: 20,
    marginBottom: 4,
  },
  googleBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 16 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  fieldsSection: { gap: 12 },
  primaryBtn: { paddingVertical: 17, borderRadius: 20, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  footer: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 24 },
  footerText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  footerLink: { fontFamily: "Inter_700Bold", fontSize: 14 },
});
