import { useState, useEffect } from "react";
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView,
} from "react-native";
import Animated, {
  useSharedValue, useAnimatedStyle, withTiming, withDelay,
  Easing,
} from "react-native-reanimated";
import { Link, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import GoogleIcon from "@/shared/components/GoogleIcon";
import GoogleAuthLoading from "@/shared/components/GoogleAuthLoading";
import AuthFormInput from "@/features/auth/components/AuthFormInput";
import AuthBrandBlock from "@/features/auth/components/AuthBrandBlock";
import { useAuthScale } from "@/features/auth/hooks/useAuthScale";
import { makeAuthStyles } from "@/features/auth/styles";

const EASE = Easing.bezier(0.25, 0.46, 0.45, 0.94);
const DURATION = 380;

function useFadeSlide(delay: number, offsetY = 22) {
  const opacity = useSharedValue(0);
  const translateY = useSharedValue(offsetY);

  useEffect(() => {
    opacity.value = withDelay(delay, withTiming(1, { duration: DURATION, easing: EASE }));
    translateY.value = withDelay(delay, withTiming(0, { duration: DURATION, easing: EASE }));
  }, []);

  const style = useAnimatedStyle(() => ({
    opacity: opacity.value,
    transform: [{ translateY: translateY.value }],
  }));

  return style;
}

export default function LoginScreen() {
  const { signIn, signInWithGoogle, googleRequest, user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { sp, px, height } = useAuthScale();
  const S = makeAuthStyles(colors);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const brandStyle = useFadeSlide(0, -16);
  const cardStyle  = useFadeSlide(80, 28);
  const footerStyle = useFadeSlide(200, 16);

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

  async function handleLogin() {
    const newFieldErrors = { email: "", password: "" };
    let hasFieldError = false;
    if (!email.trim()) { newFieldErrors.email = "Email address is required."; hasFieldError = true; }
    if (!password.trim()) { newFieldErrors.password = "Password is required."; hasFieldError = true; }
    if (hasFieldError) { setFieldErrors(newFieldErrors); setError(""); setErrorCode(""); return; }
    setError(""); setErrorCode(""); setFieldErrors({ email: "", password: "" }); setLoading(true);
    try {
      await signIn(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissAll();
    } catch (e: any) {
      if (e.code === "auth/email-not-verified") {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
        router.replace({ pathname: "/(auth)/verify-email", params: { fromLogin: "true" } });
        return;
      }
      setErrorCode(e.code ?? "");
      setError(e.message || "Sign in failed. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setLoading(false); }
  }

  async function handleGoogleSignIn() {
    setError(""); setErrorCode(""); setGoogleLoading(true);
    try {
      await signInWithGoogle();
      // On success: user state updates → useEffect above resets googleLoading
      // and navigates away. Do NOT call setGoogleLoading(false) here — the
      // GoogleAuthLoading overlay should stay visible until navigation completes.
    } catch (e: any) {
      if (e.code === "auth/cancelled-by-user") {
        // User tapped Cancel, or the first-tap iOS animation race —
        // reset loading quietly without a red banner. They can tap again.
      } else {
        setError(e.message || "Google sign-in failed. Please try again.");
        setErrorCode("");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      // Always reset loading on any error (including silent cancellation)
      setGoogleLoading(false);
    }
  }

  const isUserNotFound = errorCode === "auth/user-not-found";
  const bannerBg     = isUserNotFound ? colors.primaryDim  : colors.dangerDim;
  const bannerBorder = isUserNotFound ? colors.primary + "40" : colors.danger + "40";
  const bannerColor  = isUserNotFound ? colors.primary     : colors.danger;
  const bannerIcon: any = isUserNotFound ? "person-add-outline" : "alert-circle";

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
              <AuthBrandBlock title="Welcome back" />
            </Animated.View>

            <Animated.View style={[{ backgroundColor: colors.isDark ? "rgba(16,25,41,0.94)" : "#fff", borderColor: colors.surfaceBorder, borderWidth: 1, borderRadius: 20, padding: sp(20), shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.07, shadowRadius: 24, elevation: 5 }, cardStyle]}>
              {error ? (
                <View style={[S.errorBanner, { backgroundColor: bannerBg, borderColor: bannerBorder, marginBottom: sp(12) }]}>
                  <View style={S.errorRow}>
                    <Ionicons name={bannerIcon} size={14} color={bannerColor} />
                    <Text style={[S.errorText, { color: bannerColor, fontSize: sp(12) }]}>{error}</Text>
                  </View>
                  {isUserNotFound && (
                    <Pressable onPress={() => router.replace("/(auth)/register")} hitSlop={6} style={styles.errorLinkBtn}>
                      <Ionicons name="arrow-forward-circle-outline" size={12} color={colors.primary} />
                      <Text style={[styles.errorLink, { color: colors.primary, fontSize: sp(12) }]}>Create an account</Text>
                    </Pressable>
                  )}
                </View>
              ) : null}

              <View style={{ gap: sp(10) }}>
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
                      <Text style={[styles.forgotText, { color: colors.primary, fontSize: sp(12) }]}>Forgot password?</Text>
                    </Pressable>
                  </Link>
                </View>

                <Pressable
                  onPress={handleLogin}
                  disabled={loading}
                  style={({ pressed }) => [S.primaryBtn, { backgroundColor: colors.primary, paddingVertical: sp(13), marginTop: sp(4), opacity: pressed || loading ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={[S.primaryBtnText, { fontSize: sp(14) }]}>Sign In</Text>}
                </Pressable>
              </View>

              <View style={[S.dividerRow, { marginVertical: sp(14) }]}>
                <View style={[S.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
                <Text style={[S.dividerText, { color: colors.textMuted, fontSize: sp(11) }]}>or</Text>
                <View style={[S.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
              </View>

              <Pressable
                onPress={handleGoogleSignIn}
                disabled={googleLoading || (!googleRequest && Platform.OS === "web")}
                style={({ pressed }) => [S.googleBtn, { backgroundColor: colors.isDark ? "rgba(255,255,255,0.05)" : colors.surfaceLight, borderColor: colors.surfaceBorder, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }], paddingVertical: sp(12) }]}
              >
                <GoogleIcon size={sp(18)} />
                <Text style={[S.googleBtnText, { color: colors.text, fontSize: sp(13) }]}>Continue with Google</Text>
              </Pressable>
            </Animated.View>

            <Animated.View style={[S.footer, { marginTop: sp(20) }, footerStyle]}>
              <Text style={[S.footerText, { color: colors.textSecondary, fontSize: sp(13) }]}>Don't have an account?</Text>
              <Link href="/(auth)/register" asChild>
                <Pressable hitSlop={8}>
                  <Text style={[S.footerLink, { color: colors.primary, fontSize: sp(13) }]}>Sign up</Text>
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
  forgotBtn:    { alignSelf: "flex-end", marginTop: 8, paddingVertical: 2 },
  forgotText:   { fontFamily: "Inter_600SemiBold" },
  errorLinkBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingLeft: 20 },
  errorLink:    { fontFamily: "Inter_600SemiBold" },
});
