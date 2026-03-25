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
  const { width, height } = useWindowDimensions();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [unverifiedEmail, setUnverifiedEmail] = useState(false);

  const scale = Math.min(Math.max(width / 390, 0.82), 1.15);
  const isSmallScreen = height < 680;
  const isNarrow = width < 360;
  const px = isNarrow ? 16 : Math.round(22 * scale);

  useEffect(() => {
  if (user) {
    router.replace("/(tabs)");
  }
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

  const logoSize = Math.round(Math.min(76 * scale, 88));
  const logoRadius = Math.round(logoSize * 0.33);
  const iconSize = Math.round(28 * scale);
  const titleSize = Math.round(Math.min(30 * scale, 34));
  const subtitleSize = Math.round(Math.min(14 * scale, 16));
  const btnTextSize = Math.round(Math.min(15 * scale, 17));
  const cardPadding = Math.round(Math.min(22 * scale, 28));
  const heroPadTop = isSmallScreen ? 12 : Math.round(20 * scale);
  const heroPadBottom = isSmallScreen ? 16 : Math.round(28 * scale);

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={colors.isDark
          ? ["#020913", "#050B18", "#07111F"]
          : ["#EEF4FF", "#F4F8FF", "#EAF0FF"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <View style={[styles.glowOrb, {
        backgroundColor: colors.isDark ? "rgba(0,229,255,0.06)" : "rgba(0,111,255,0.06)",
        top: -80, right: -80, width: 260, height: 260,
      }]} />
      <View style={[styles.glowOrb, {
        backgroundColor: colors.isDark ? "rgba(176,96,255,0.05)" : "rgba(124,58,237,0.04)",
        bottom: 40, left: -100, width: 280, height: 280,
      }]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32, paddingTop: insets.top + 16, paddingHorizontal: px }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={[styles.heroSection, { paddingTop: heroPadTop, paddingBottom: heroPadBottom }]}>
            <View style={[styles.logoWrap, { marginBottom: isSmallScreen ? 6 : 10 }]}>
              <LinearGradient
                colors={colors.isDark ? ["#00E5FF", "#006FFF", "#B060FF"] : ["#006FFF", "#0047CC", "#7C3AED"]}
                style={[styles.logoGradient, { width: logoSize, height: logoSize, borderRadius: logoRadius }]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="shield-checkmark" size={iconSize} color="#fff" />
              </LinearGradient>
              {!isSmallScreen && (
                <>
                  <View style={[styles.logoRing, { borderColor: colors.primary + "30", width: logoSize + 22, height: logoSize + 22, borderRadius: logoRadius + 6 }]} />
                  <View style={[styles.logoRing2, { borderColor: colors.primary + "15", width: logoSize + 42, height: logoSize + 42, borderRadius: logoRadius + 12 }]} />
                </>
              )}
            </View>
            <Text style={[styles.appLabel, { color: colors.primary, fontSize: Math.round(11 * scale) }]}>QR GUARD</Text>
            <Text style={[styles.title, { color: colors.text, fontSize: titleSize }]}>Welcome back</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: subtitleSize }]}>
              Sign in to unlock full QR scanning features
            </Text>
          </View>

          <View style={[styles.card, {
            backgroundColor: colors.isDark ? "rgba(12,21,38,0.85)" : "rgba(255,255,255,0.92)",
            borderColor: colors.surfaceBorder,
            padding: cardPadding,
          }]}>
            {error ? (
              <View style={[styles.errorBanner, {
                backgroundColor: unverifiedEmail ? colors.warningDim : colors.dangerDim,
                borderColor: unverifiedEmail ? colors.warning + "40" : colors.danger + "40",
                marginBottom: 14,
              }]}>
                <Ionicons
                  name={unverifiedEmail ? "mail-unread-outline" : "alert-circle"}
                  size={15}
                  color={unverifiedEmail ? colors.warning : colors.danger}
                />
                <Text style={[styles.errorText, { color: unverifiedEmail ? colors.warning : colors.danger, fontSize: Math.round(13 * scale) }]}>{error}</Text>
              </View>
            ) : null}

            <View style={[styles.fieldsSection, { gap: Math.round(10 * scale) }]}>
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
                    <Text style={[styles.forgotText, { color: colors.primary, fontSize: Math.round(12 * scale) }]}>Forgot Password?</Text>
                  </Pressable>
                </Link>
              </View>

              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={({ pressed }) => [{ opacity: pressed || loading ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
              >
                <LinearGradient
                  colors={colors.isDark ? ["#00E5FF", "#0090CC", "#006FFF"] : ["#006FFF", "#0047CC"]}
                  style={[styles.primaryBtn, { paddingVertical: Math.round(15 * scale) }]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                >
                  {loading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Text style={[styles.primaryBtnText, { fontSize: btnTextSize }]}>Sign In</Text>
                      <Ionicons name="arrow-forward" size={Math.round(16 * scale)} color="#fff" />
                    </>
                  )}
                </LinearGradient>
              </Pressable>
            </View>

            <View style={[styles.dividerRow, { marginVertical: Math.round(16 * scale) }]}>
              <View style={[styles.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted, fontSize: Math.round(12 * scale) }]}>or</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
            </View>

            <Pressable
              onPress={handleGoogleSignIn}
              disabled={googleLoading || (!googleRequest && Platform.OS === "web")}
              style={({ pressed }) => [
                styles.googleBtn,
                {
                  backgroundColor: colors.surfaceLight,
                  borderColor: colors.surfaceBorder,
                  opacity: pressed || googleLoading ? 0.7 : 1,
                  transform: [{ scale: pressed ? 0.98 : 1 }],
                  paddingVertical: Math.round(13 * scale),
                },
              ]}
            >
              {googleLoading ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <>
                  <GoogleIcon size={Math.round(19 * scale)} />
                  <Text style={[styles.googleBtnText, { color: colors.text, fontSize: Math.round(14 * scale) }]}>Continue with Google</Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={[styles.footer, { marginTop: Math.round(20 * scale) }]}>
            <Text style={[styles.footerText, { color: colors.textSecondary, fontSize: Math.round(13 * scale) }]}>Don't have an account?</Text>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text style={[styles.footerLink, { color: colors.primary, fontSize: Math.round(13 * scale) }]}>Sign Up</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1 },
  glowOrb: { position: "absolute", borderRadius: 200 },
  heroSection: { alignItems: "center", gap: 8 },
  logoWrap: { alignItems: "center", justifyContent: "center" },
  logoGradient: { alignItems: "center", justifyContent: "center" },
  logoRing: { position: "absolute", borderWidth: 1.5 },
  logoRing2: { position: "absolute", borderWidth: 1 },
  appLabel: { fontFamily: "Inter_700Bold", letterSpacing: 3, textTransform: "uppercase" },
  title: { fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.5 },
  subtitle: { fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21, maxWidth: 300 },
  card: {
    borderRadius: 24, borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1,
    shadowRadius: 20,
    elevation: 6,
  },
  errorBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    padding: 12, borderRadius: 14, borderWidth: 1,
  },
  errorText: { fontFamily: "Inter_500Medium", flex: 1 },
  fieldsSection: {},
  forgotBtn: { alignSelf: "flex-end", marginTop: 8, paddingVertical: 2 },
  forgotText: { fontFamily: "Inter_600SemiBold" },
  primaryBtn: {
    borderRadius: 16, alignItems: "center",
    flexDirection: "row", justifyContent: "center", gap: 8, marginTop: 4,
  },
  primaryBtnText: { color: "#fff", fontFamily: "Inter_700Bold" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 12 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontFamily: "Inter_400Regular" },
  googleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    borderWidth: 1, paddingHorizontal: 20, borderRadius: 16,
  },
  googleBtnText: { fontFamily: "Inter_600SemiBold" },
  footer: { flexDirection: "row", justifyContent: "center", gap: 6 },
  footerText: { fontFamily: "Inter_400Regular" },
  footerLink: { fontFamily: "Inter_700Bold" },
});
