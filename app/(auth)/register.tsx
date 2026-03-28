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

export default function RegisterScreen() {
  const { signUp, signInWithGoogle, googleRequest, user } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
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
      setGoogleLoading(false);
    }
  }

  if (verificationSent) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.centeredContainer, { paddingBottom: insets.bottom + 40, paddingTop: insets.top + 40, paddingHorizontal: px }]}>
          <View style={[styles.successOrb, { backgroundColor: colors.safeDim, borderColor: colors.safe + "30" }]}>
            <Ionicons name="mail-open-outline" size={sp(38)} color={colors.safe} />
          </View>
          <Text style={[styles.pageTitle, { color: colors.text, fontSize: sp(22) }]}>Check your inbox</Text>
          <Text style={[styles.verifyText, { color: colors.textSecondary, fontSize: sp(14), lineHeight: sp(22) }]}>
            We sent a verification link to{"\n"}
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{registeredEmail}</Text>
            {"\n\n"}Tap the link to activate your account, then sign in.
          </Text>
          <Pressable
            onPress={() => router.replace("/(auth)/login")}
            style={({ pressed }) => [
              styles.primaryBtn,
              {
                backgroundColor: colors.primary,
                paddingVertical: sp(13),
                width: "100%",
                opacity: pressed ? 0.85 : 1,
                transform: [{ scale: pressed ? 0.98 : 1 }],
              },
            ]}
          >
            <Text style={[styles.primaryBtnText, { fontSize: sp(14) }]}>Go to Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

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
                Create an account
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
                <View style={[styles.errorBanner, { backgroundColor: colors.dangerDim, borderColor: colors.danger + "40", marginBottom: sp(12) }]}>
                  <Ionicons name="alert-circle" size={14} color={colors.danger} />
                  <Text style={[styles.errorText, { color: colors.danger, fontSize: sp(12) }]}>{error}</Text>
                </View>
              ) : null}

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
                {googleLoading ? (
                  <ActivityIndicator color={colors.text} size="small" />
                ) : (
                  <>
                    <GoogleIcon size={sp(18)} />
                    <Text style={[styles.googleBtnText, { color: colors.text, fontSize: sp(13) }]}>Continue with Google</Text>
                  </>
                )}
              </Pressable>

              <View style={[styles.dividerRow, { marginVertical: sp(14) }]}>
                <View style={[styles.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
                <Text style={[styles.dividerText, { color: colors.textMuted, fontSize: sp(11) }]}>or with email</Text>
                <View style={[styles.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
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
                  placeholder="Password (min. 6 characters)"
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
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={[styles.primaryBtnText, { fontSize: sp(14) }]}>Create Account</Text>
                  )}
                </Pressable>
              </View>
            </View>

            <View style={[styles.footer, { marginTop: sp(20) }]}>
              <Text style={[styles.footerText, { color: colors.textSecondary, fontSize: sp(13) }]}>Already have an account?</Text>
              <Link href="/(auth)/login" asChild>
                <Pressable hitSlop={8}>
                  <Text style={[styles.footerLink, { color: colors.primary, fontSize: sp(13) }]}>Sign in</Text>
                </Pressable>
              </Link>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={googleLoading} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlayBg}>
          <View style={[styles.overlayCard, {
            backgroundColor: colors.isDark ? "#0f1929" : "#ffffff",
            borderColor: colors.isDark ? "rgba(255,255,255,0.08)" : "rgba(0,0,0,0.06)",
          }]}>
            <View style={[styles.overlayIconRing, { borderColor: colors.primary + "28", backgroundColor: colors.primary + "10" }]}>
              <GoogleIcon size={28} />
            </View>
            <View style={styles.overlaySpinnerRow}>
              <ActivityIndicator color={colors.primary} size="small" />
              <Text style={[styles.overlayText, { color: colors.text }]}>Connecting with Google</Text>
            </View>
            <Text style={[styles.overlaySubText, { color: colors.textMuted }]}>Securely completing sign in…</Text>
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
  centeredContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  successOrb: {
    width: 90,
    height: 90,
    borderRadius: 30,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1.5,
    marginBottom: 8,
  },
  verifyText: {
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    maxWidth: 300,
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
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 8,
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  errorText: { fontFamily: "Inter_500Medium", flex: 1, lineHeight: 17 },
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
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontFamily: "Inter_400Regular" },
  primaryBtn: {
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
  footer: { flexDirection: "row", justifyContent: "center", gap: 6 },
  footerText: { fontFamily: "Inter_400Regular" },
  footerLink: { fontFamily: "Inter_700Bold" },
  overlayBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.35)", alignItems: "center", justifyContent: "center" },
  overlayCard: {
    alignItems: "center",
    gap: 14,
    paddingVertical: 28,
    paddingHorizontal: 32,
    borderRadius: 20,
    borderWidth: 1,
    minWidth: 220,
    maxWidth: 280,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 20,
    elevation: 8,
  },
  overlayIconRing: {
    width: 60,
    height: 60,
    borderRadius: 18,
    borderWidth: 1.5,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 2,
  },
  overlaySpinnerRow: { flexDirection: "row", alignItems: "center", gap: 9 },
  overlayText: { fontFamily: "Inter_600SemiBold", fontSize: 14, textAlign: "center" },
  overlaySubText: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" },
});
