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

export default function LoginScreen() {
  const { signIn, signInWithGoogle, googleRequest, user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(false);

  useEffect(() => {
    if (user && googleLoading) {
      setGoogleLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissAll();
    }
  }, [user]);

  async function handleLogin() {
    const newFieldErrors = { email: "", password: "" };
    let hasFieldError = false;
    if (!email.trim()) { newFieldErrors.email = "Email address is required."; hasFieldError = true; }
    if (!password.trim()) { newFieldErrors.password = "Password is required."; hasFieldError = true; }
    if (hasFieldError) { setFieldErrors(newFieldErrors); setError(""); return; }
    setError(""); setFieldErrors({ email: "", password: "" }); setUnverifiedEmail(false); setLoading(true);
    try {
      await signIn(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissAll();
    } catch (e: any) {
      if (e.code === "auth/email-not-verified") setUnverifiedEmail(true);
      setError(e.message || "Sign in failed. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setLoading(false); }
  }

  async function handleGoogleSignIn() {
    setError(""); setUnverifiedEmail(false); setGoogleLoading(true);
    try { await signInWithGoogle(); }
    catch (e: any) {
      setError(e.message || "Google sign-in failed. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setGoogleLoading(false); }
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
            <Ionicons name="shield-checkmark" size={36} color="#fff" />
          </LinearGradient>
          <Text style={[styles.appName, { color: colors.primary }]}>QR Guard</Text>
          <Text style={[styles.title, { color: colors.text }]}>Welcome back</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            Sign in to unlock full QR scanning features
          </Text>
        </View>

        {/* Error Banner */}
        {error ? (
          <View style={[styles.errorBanner, {
            backgroundColor: unverifiedEmail ? colors.warningDim : colors.dangerDim,
            borderColor: unverifiedEmail ? colors.warning + "40" : colors.danger + "40",
          }]}>
            <Ionicons
              name={unverifiedEmail ? "mail-unread-outline" : "alert-circle"}
              size={16}
              color={unverifiedEmail ? colors.warning : colors.danger}
            />
            <Text style={[styles.errorText, { color: unverifiedEmail ? colors.warning : colors.danger }]}>{error}</Text>
          </View>
        ) : null}

        {/* Fields */}
        <View style={styles.fieldsSection}>
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

          <View>
            <AuthFormInput
              icon="lock-closed-outline"
              placeholder="Password"
              value={password}
              onChangeText={(v) => { setPassword(v); if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: "" })); }}
              secureTextEntry={!showPassword}
              showToggle
              toggleVisible={showPassword}
              onToggleVisible={() => setShowPassword(!showPassword)}
              error={fieldErrors.password}
            />
            <Link href="/(auth)/forgot-password" asChild>
              <Pressable style={styles.forgotBtn}>
                <Text style={[styles.forgotText, { color: colors.primary }]}>Forgot Password?</Text>
              </Pressable>
            </Link>
          </View>

          {/* Sign In Button */}
          <Pressable
            onPress={handleLogin}
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
                <Text style={styles.primaryBtnText}>Sign In</Text>
              )}
            </LinearGradient>
          </Pressable>
        </View>

        {/* Divider */}
        <View style={styles.dividerRow}>
          <View style={[styles.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
          <Text style={[styles.dividerText, { color: colors.textMuted }]}>or</Text>
          <View style={[styles.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
        </View>

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

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.textSecondary }]}>Don't have an account?</Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={[styles.footerLink, { color: colors.primary }]}>Sign Up</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 24 },
  heroSection: { alignItems: "center", paddingTop: 60, paddingBottom: 36, gap: 6 },
  logoCircle: { width: 84, height: 84, borderRadius: 28, alignItems: "center", justifyContent: "center", marginBottom: 8 },
  appName: { fontSize: 14, fontFamily: "Inter_700Bold", letterSpacing: 2, textTransform: "uppercase" },
  title: { fontSize: 30, fontFamily: "Inter_700Bold", textAlign: "center" },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21 },
  errorBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    padding: 14, borderRadius: 16, marginBottom: 12, borderWidth: 1,
  },
  errorText: { fontFamily: "Inter_500Medium", fontSize: 14, flex: 1 },
  fieldsSection: { gap: 12 },
  forgotBtn: { alignSelf: "flex-end", marginTop: 8, paddingVertical: 2 },
  forgotText: { fontFamily: "Inter_600SemiBold", fontSize: 13 },
  primaryBtn: { paddingVertical: 17, borderRadius: 20, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12, marginVertical: 20 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontSize: 13, fontFamily: "Inter_400Regular" },
  googleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12,
    borderWidth: 1, paddingVertical: 15, paddingHorizontal: 20, borderRadius: 20,
  },
  googleBtnText: { fontSize: 15, fontFamily: "Inter_600SemiBold" },
  footer: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 24 },
  footerText: { fontFamily: "Inter_400Regular", fontSize: 14 },
  footerLink: { fontFamily: "Inter_700Bold", fontSize: 14 },
});
