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
  useWindowDimensions,
  Modal,
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
  const { width, height } = useWindowDimensions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(false);

  const scale = Math.min(Math.max(width / 390, 0.85), 1.0);
  const sp = (v: number) => Math.round(v * scale);
  const isNarrow = width < 360;
  const px = isNarrow ? 20 : sp(28);

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
    setError(""); setErrorCode(""); setFieldErrors({ email: "", password: "" }); setUnverifiedEmail(false); setLoading(true);
    try {
      await signIn(email.trim(), password);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissAll();
    } catch (e: any) {
      if (e.code === "auth/email-not-verified") {
        setUnverifiedEmail(true);
        setErrorCode("auth/email-not-verified");
      } else {
        setErrorCode(e.code ?? "");
      }
      setError(e.message || "Sign in failed. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setLoading(false); }
  }

  async function handleGoogleSignIn() {
    setError(""); setErrorCode(""); setUnverifiedEmail(false); setGoogleLoading(true);
    try { await signInWithGoogle(); }
    catch (e: any) {
      setError(e.message || "Google sign-in failed. Please try again.");
      setErrorCode("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setGoogleLoading(false);
    }
  }

  const isUserNotFound = errorCode === "auth/user-not-found";
  const bannerBg = unverifiedEmail ? colors.warningDim : isUserNotFound ? colors.primaryDim : colors.dangerDim;
  const bannerBorder = unverifiedEmail ? colors.warning + "40" : isUserNotFound ? colors.primary + "40" : colors.danger + "40";
  const bannerColor = unverifiedEmail ? colors.warning : isUserNotFound ? colors.primary : colors.danger;
  const bannerIcon = unverifiedEmail ? "mail-unread-outline" : isUserNotFound ? "person-add-outline" : "alert-circle";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[
            styles.scrollContent,
            {
              paddingTop: insets.top + 16,
              paddingBottom: insets.bottom + 24,
              paddingHorizontal: px,
              minHeight: height,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
        >
          <View style={styles.inner}>
            <View style={styles.brandBlock}>
              <Text style={[styles.brandName, { color: colors.text, fontSize: sp(30) }]}>
                QR<Text style={{ color: colors.primary }}>Guard</Text>
              </Text>
              <View style={[styles.brandDivider, { backgroundColor: colors.primary }]} />
              <Text style={[styles.pageTitle, { color: colors.text, fontSize: sp(20) }]}>
                Welcome back
              </Text>
            </View>

            <View style={[
              styles.card,
              {
                backgroundColor: colors.isDark ? "rgba(16,25,41,0.94)" : "#fff",
                borderColor: colors.surfaceBorder,
                padding: sp(20),
              },
            ]}>
              {error ? (
                <View style={[styles.errorBanner, { backgroundColor: bannerBg, borderColor: bannerBorder, marginBottom: sp(12) }]}>
                  <View style={styles.errorRow}>
                    <Ionicons name={bannerIcon} size={14} color={bannerColor} />
                    <Text style={[styles.errorText, { color: bannerColor, fontSize: sp(12) }]}>{error}</Text>
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
                  style={({ pressed }) => [
                    styles.primaryBtn,
                    {
                      backgroundColor: colors.primary,
                      paddingVertical: sp(13),
                      marginTop: sp(4),
                      opacity: pressed || loading ? 0.88 : 1,
                      transform: [{ scale: pressed ? 0.98 : 1 }],
                    },
                  ]}
                >
                  {loading ? <ActivityIndicator color="#fff" /> : (
                    <Text style={[styles.primaryBtnText, { fontSize: sp(14) }]}>Sign In</Text>
                  )}
                </Pressable>
              </View>

              <View style={[styles.dividerRow, { marginVertical: sp(14) }]}>
                <View style={[styles.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
                <Text style={[styles.dividerText, { color: colors.textMuted, fontSize: sp(11) }]}>or</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
              </View>

              <Pressable
                onPress={handleGoogleSignIn}
                disabled={googleLoading || (!googleRequest && Platform.OS === "web")}
                style={({ pressed }) => [
                  styles.googleBtn,
                  {
                    backgroundColor: colors.isDark ? "rgba(255,255,255,0.05)" : colors.surfaceLight,
                    borderColor: colors.surfaceBorder,
                    opacity: pressed || googleLoading ? 0.7 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                    paddingVertical: sp(12),
                  },
                ]}
              >
                {googleLoading ? <ActivityIndicator color={colors.text} size="small" /> : (
                  <>
                    <GoogleIcon size={sp(18)} />
                    <Text style={[styles.googleBtnText, { color: colors.text, fontSize: sp(13) }]}>Continue with Google</Text>
                  </>
                )}
              </Pressable>
            </View>

            <View style={[styles.footer, { marginTop: sp(20) }]}>
              <Text style={[styles.footerText, { color: colors.textSecondary, fontSize: sp(13) }]}>Don't have an account?</Text>
              <Link href="/(auth)/register" asChild>
                <Pressable hitSlop={8}>
                  <Text style={[styles.footerLink, { color: colors.primary, fontSize: sp(13) }]}>Sign up</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={googleLoading} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlayBg}>
          <View style={[styles.overlayCard, {
            backgroundColor: colors.isDark ? "rgba(16,25,41,0.97)" : "rgba(255,255,255,0.97)",
            borderColor: colors.surfaceBorder,
          }]}>
            <ActivityIndicator color={colors.primary} size="large" />
            <Text style={[styles.overlayText, { color: colors.text }]}>Signing in with Google…</Text>
            <Text style={[styles.overlaySubText, { color: colors.textSecondary }]}>Just a moment</Text>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  scrollContent: {
    flexGrow: 1,
    justifyContent: "center",
  },
  inner: {
    width: "100%",
    maxWidth: 420,
    alignSelf: "center",
  },
  brandBlock: {
    alignItems: "center",
    marginBottom: 28,
    gap: 8,
  },
  brandName: {
    fontFamily: "Inter_700Bold",
    letterSpacing: -1,
  },
  brandDivider: {
    width: 32,
    height: 2.5,
    borderRadius: 2,
    marginTop: 2,
    marginBottom: 4,
  },
  pageTitle: {
    fontFamily: "Inter_700Bold",
    letterSpacing: -0.5,
    textAlign: "center",
  },
  card: {
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.07,
    shadowRadius: 24,
    elevation: 5,
  },
  errorBanner: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    gap: 6,
  },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  errorText: { fontFamily: "Inter_500Medium", flex: 1, lineHeight: 17 },
  errorLinkBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingLeft: 20 },
  errorLink: { fontFamily: "Inter_600SemiBold" },
  forgotBtn: { alignSelf: "flex-end", marginTop: 8, paddingVertical: 2 },
  forgotText: { fontFamily: "Inter_600SemiBold" },
  primaryBtn: {
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontFamily: "Inter_400Regular" },
  googleBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
    borderWidth: 1,
    paddingHorizontal: 16,
    borderRadius: 14,
  },
  googleBtnText: { fontFamily: "Inter_600SemiBold" },
  footer: { flexDirection: "row", justifyContent: "center", gap: 6 },
  footerText: { fontFamily: "Inter_400Regular" },
  footerLink: { fontFamily: "Inter_700Bold" },
  overlayBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  overlayCard: {
    alignItems: "center",
    gap: 12,
    paddingVertical: 32,
    paddingHorizontal: 40,
    borderRadius: 24,
    borderWidth: 1,
    minWidth: 200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.15,
    shadowRadius: 24,
    elevation: 10,
  },
  overlayText: { fontFamily: "Inter_700Bold", fontSize: 15, textAlign: "center" },
  overlaySubText: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" },
});
