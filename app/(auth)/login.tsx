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

    if (!email.trim()) {
      newFieldErrors.email = "Email address is required.";
      hasFieldError = true;
    }
    if (!password.trim()) {
      newFieldErrors.password = "Password is required.";
      hasFieldError = true;
    }

    if (hasFieldError) {
      setFieldErrors(newFieldErrors);
      setError("");
      return;
    }

    setError("");
    setFieldErrors({ email: "", password: "" });
    setUnverifiedEmail(false);
    setLoading(true);

    try {
      await signIn(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissAll();
    } catch (e: any) {
      if (e.code === "auth/email-not-verified") {
        setUnverifiedEmail(true);
      }
      setError(e.message || "Sign in failed. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleSignIn() {
    setError("");
    setUnverifiedEmail(false);
    setGoogleLoading(true);
    try {
      await signInWithGoogle();
    } catch (e: any) {
      setError(e.message || "Google sign-in failed. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setGoogleLoading(false);
    }
  }

  const styles = makeStyles(colors);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: colors.background }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      keyboardVerticalOffset={90}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24 }]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Ionicons name="qr-code" size={40} color={colors.primary} />
          </View>
        </View>

        <Text style={styles.title}>Welcome Back</Text>
        <Text style={styles.subtitle}>Sign in to unlock full QR scanning features</Text>

        {error ? (
          <View style={[styles.errorContainer, unverifiedEmail && styles.warningContainer]}>
            <Ionicons
              name={unverifiedEmail ? "mail-unread-outline" : "alert-circle"}
              size={16}
              color={unverifiedEmail ? colors.warning : colors.danger}
            />
            <Text style={[styles.errorText, unverifiedEmail && styles.warningText]}>{error}</Text>
          </View>
        ) : null}

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
            <Pressable style={styles.forgotPasswordBtn}>
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </Pressable>
          </Link>
        </View>

        <Pressable
          onPress={handleLogin}
          disabled={loading}
          style={({ pressed }) => [styles.primaryButton, { opacity: pressed || loading ? 0.8 : 1 }]}
        >
          {loading ? (
            <ActivityIndicator color={colors.primaryText} />
          ) : (
            <Text style={styles.primaryButtonText}>Sign In</Text>
          )}
        </Pressable>

        <View style={styles.dividerRow}>
          <View style={styles.dividerLine} />
          <Text style={styles.dividerText}>or</Text>
          <View style={styles.dividerLine} />
        </View>

        <Pressable
          onPress={handleGoogleSignIn}
          disabled={googleLoading || !googleRequest}
          style={({ pressed }) => [
            styles.googleButton,
            { opacity: pressed || googleLoading || !googleRequest ? 0.7 : 1 },
          ]}
        >
          {googleLoading ? (
            <ActivityIndicator color={colors.text} size="small" />
          ) : (
            <>
              <GoogleIcon size={20} />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Don't have an account?</Text>
          <Link href="/(auth)/register" asChild>
            <Pressable>
              <Text style={styles.linkText}>Sign Up</Text>
            </Pressable>
          </Link>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function makeStyles(c: ReturnType<typeof import("@/contexts/ThemeContext").useTheme>["colors"]) {
  return StyleSheet.create({
    container: { flexGrow: 1, padding: 24, justifyContent: "center", gap: 16 },
    iconContainer: { alignItems: "center", marginBottom: 8 },
    iconCircle: {
      width: 80, height: 80, borderRadius: 40,
      backgroundColor: c.primaryDim, alignItems: "center", justifyContent: "center",
    },
    title: { fontSize: 28, fontFamily: "Inter_700Bold", color: c.text, textAlign: "center" },
    subtitle: {
      fontSize: 15, fontFamily: "Inter_400Regular", color: c.textSecondary,
      textAlign: "center", marginBottom: 8,
    },
    errorContainer: {
      flexDirection: "row", alignItems: "flex-start", gap: 8,
      backgroundColor: c.dangerDim, padding: 12, borderRadius: 12,
    },
    warningContainer: { backgroundColor: c.warningDim },
    errorText: { color: c.danger, fontFamily: "Inter_500Medium", fontSize: 14, flex: 1 },
    warningText: { color: c.warning },
    forgotPasswordBtn: { alignSelf: "flex-end", marginTop: 8, paddingVertical: 2 },
    forgotPasswordText: { color: c.primary, fontFamily: "Inter_500Medium", fontSize: 13 },
    primaryButton: {
      backgroundColor: c.primary, paddingVertical: 16,
      borderRadius: 14, alignItems: "center", marginTop: 4,
    },
    primaryButtonText: { color: c.primaryText, fontSize: 16, fontFamily: "Inter_700Bold" },
    footer: { flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 4 },
    footerText: { color: c.textSecondary, fontFamily: "Inter_400Regular", fontSize: 14 },
    linkText: { color: c.primary, fontFamily: "Inter_600SemiBold", fontSize: 14 },
    dividerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
    dividerLine: { flex: 1, height: 1, backgroundColor: c.surfaceBorder },
    dividerText: { fontSize: 13, fontFamily: "Inter_400Regular", color: c.textMuted },
    googleButton: {
      flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 12,
      backgroundColor: c.surface, borderWidth: 1, borderColor: c.surfaceBorder,
      paddingVertical: 14, paddingHorizontal: 20, borderRadius: 14,
    },
    googleButtonText: { fontSize: 15, fontFamily: "Inter_600SemiBold", color: c.text },
  });
}
