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

  const scale = Math.min(Math.max(width / 390, 0.82), 1.15);
  const sp = (v: number) => Math.round(v * scale);
  const isSmallScreen = height < 680;
  const isNarrow = width < 360;
  const px = isNarrow ? 14 : sp(22);

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

  const logoSize = sp(Math.min(76, 88));
  const logoRadius = Math.round(logoSize * 0.33);
  const iconSize = sp(28);
  const titleSize = sp(Math.min(30, 34));
  const subtitleSize = sp(Math.min(14, 16));
  const btnTextSize = sp(Math.min(15, 17));
  const cardPadding = sp(Math.min(22, 28));
  const heroPadTop = isSmallScreen ? 10 : sp(18);
  const heroPadBottom = isSmallScreen ? 14 : sp(26);

  const isUserNotFound = errorCode === "auth/user-not-found";
  const bannerBg = unverifiedEmail ? colors.warningDim : isUserNotFound ? colors.primaryDim : colors.dangerDim;
  const bannerBorder = unverifiedEmail ? colors.warning + "40" : isUserNotFound ? colors.primary + "40" : colors.danger + "40";
  const bannerColor = unverifiedEmail ? colors.warning : isUserNotFound ? colors.primary : colors.danger;
  const bannerIcon = unverifiedEmail ? "mail-unread-outline" : isUserNotFound ? "person-add-outline" : "alert-circle";

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.glowOrb, { backgroundColor: colors.primaryDim, top: -80, right: -80, width: 260, height: 260 }]} />
      <View style={[styles.glowOrb, { backgroundColor: colors.primaryDim, bottom: 40, left: -100, width: 280, height: 280 }]} />

      {/* Status bar solid cover — prevents transparency on overscroll */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, backgroundColor: colors.background, zIndex: 10 }} />

      <Pressable
        onPress={() => router.canDismiss() ? router.dismiss() : router.replace("/(tabs)")}
        style={[styles.closeBtn, { top: insets.top + 10, backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}
        hitSlop={10}
      >
        <Ionicons name="close" size={20} color={colors.textSecondary} />
      </Pressable>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === "ios" ? "padding" : "height"} keyboardVerticalOffset={0}>
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32, paddingTop: insets.top + 14, paddingHorizontal: px }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          style={{ backgroundColor: colors.background }}
        >
          <View style={[styles.heroSection, { paddingTop: heroPadTop, paddingBottom: heroPadBottom }]}>
            <View style={[styles.logoWrap, { marginBottom: isSmallScreen ? 4 : 8 }]}>
              <View style={[styles.logoBox, { width: logoSize, height: logoSize, borderRadius: logoRadius, backgroundColor: colors.primary }]}>
                <Ionicons name="shield-checkmark" size={iconSize} color="#fff" />
              </View>
              {!isSmallScreen && (
                <>
                  <View style={[styles.logoRing, { borderColor: colors.primary + "30", width: logoSize + 22, height: logoSize + 22, borderRadius: logoRadius + 6 }]} />
                  <View style={[styles.logoRing2, { borderColor: colors.primary + "15", width: logoSize + 42, height: logoSize + 42, borderRadius: logoRadius + 12 }]} />
                </>
              )}
            </View>
            <Text style={[styles.appLabel, { color: colors.primary, fontSize: sp(11) }]}>QR GUARD</Text>
            <Text style={[styles.title, { color: colors.text, fontSize: titleSize }]}>Welcome back</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: subtitleSize }]}>
              Sign in to unlock full QR scanning features
            </Text>
          </View>

          <View style={[styles.card, {
            backgroundColor: colors.isDark ? "rgba(16,25,41,0.92)" : "rgba(255,255,255,0.95)",
            borderColor: colors.surfaceBorder,
            padding: cardPadding,
          }]}>
            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: bannerBg, borderColor: bannerBorder, marginBottom: sp(14) }]}>
                <View style={styles.errorRow}>
                  <Ionicons name={bannerIcon} size={16} color={bannerColor} />
                  <Text style={[styles.errorText, { color: bannerColor, fontSize: sp(13) }]}>{error}</Text>
                </View>
                {isUserNotFound && (
                  <Pressable onPress={() => router.replace("/(auth)/register")} hitSlop={6} style={styles.errorLinkBtn}>
                    <Ionicons name="arrow-forward-circle-outline" size={14} color={colors.primary} />
                    <Text style={[styles.errorLink, { color: colors.primary, fontSize: sp(12) }]}>
                      Create an account
                    </Text>
                  </Pressable>
                )}
              </View>
            ) : null}

            <View style={[styles.fieldsSection, { gap: sp(10) }]}>
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
                    <Text style={[styles.forgotText, { color: colors.primary, fontSize: sp(12) }]}>Forgot Password?</Text>
                  </Pressable>
                </Link>
              </View>

              <Pressable
                onPress={handleLogin}
                disabled={loading}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: colors.primary, paddingVertical: sp(15), opacity: pressed || loading ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
              >
                {loading ? <ActivityIndicator color="#fff" /> : (
                  <>
                    <Text style={[styles.primaryBtnText, { fontSize: btnTextSize }]}>Sign In</Text>
                    <Ionicons name="arrow-forward" size={sp(16)} color="#fff" />
                  </>
                )}
              </Pressable>
            </View>

            <View style={[styles.dividerRow, { marginVertical: sp(16) }]}>
              <View style={[styles.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted, fontSize: sp(12) }]}>or</Text>
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
                  paddingVertical: sp(13),
                },
              ]}
            >
              {googleLoading ? <ActivityIndicator color={colors.text} size="small" /> : (
                <>
                  <GoogleIcon size={sp(19)} />
                  <Text style={[styles.googleBtnText, { color: colors.text, fontSize: sp(14) }]}>Continue with Google</Text>
                </>
              )}
            </Pressable>
          </View>

          <View style={[styles.footer, { marginTop: sp(20) }]}>
            <Text style={[styles.footerText, { color: colors.textSecondary, fontSize: sp(13) }]}>Don't have an account?</Text>
            <Link href="/(auth)/register" asChild>
              <Pressable>
                <Text style={[styles.footerLink, { color: colors.primary, fontSize: sp(13) }]}>Sign Up</Text>
              </Pressable>
            </Link>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>

      <Modal visible={googleLoading} transparent animationType="fade" statusBarTranslucent>
        <View style={styles.overlayBg}>
          <View style={[styles.overlayCard, { backgroundColor: colors.isDark ? "rgba(16,25,41,0.97)" : "rgba(255,255,255,0.97)", borderColor: colors.surfaceBorder }]}>
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
  container: { flexGrow: 1 },
  glowOrb: { position: "absolute", borderRadius: 200 },
  closeBtn: {
    position: "absolute", right: 16, zIndex: 20,
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  heroSection: { alignItems: "center", gap: 7 },
  logoWrap: { alignItems: "center", justifyContent: "center" },
  logoBox: { alignItems: "center", justifyContent: "center" },
  logoRing: { position: "absolute", borderWidth: 1.5 },
  logoRing2: { position: "absolute", borderWidth: 1 },
  appLabel: { fontFamily: "Inter_700Bold", letterSpacing: 3, textTransform: "uppercase" },
  title: { fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.5 },
  subtitle: { fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 21, maxWidth: 300 },
  card: {
    borderRadius: 24, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 6,
  },
  errorBanner: {
    padding: 12, borderRadius: 14, borderWidth: 1, gap: 8,
  },
  errorRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  errorText: { fontFamily: "Inter_500Medium", flex: 1, lineHeight: 19 },
  errorLinkBtn: { flexDirection: "row", alignItems: "center", gap: 6, paddingLeft: 24 },
  errorLink: { fontFamily: "Inter_600SemiBold" },
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
  overlayBg: { flex: 1, backgroundColor: "rgba(0,0,0,0.55)", alignItems: "center", justifyContent: "center" },
  overlayCard: {
    alignItems: "center", gap: 14, paddingVertical: 36, paddingHorizontal: 40,
    borderRadius: 24, borderWidth: 1, minWidth: 220,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.18, shadowRadius: 24, elevation: 12,
  },
  overlayText: { fontFamily: "Inter_700Bold", fontSize: 16, textAlign: "center" },
  overlaySubText: { fontFamily: "Inter_400Regular", fontSize: 13, textAlign: "center" },
});
