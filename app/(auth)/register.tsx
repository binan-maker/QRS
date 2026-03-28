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

  const scale = Math.min(Math.max(width / 390, 0.82), 1.0);
  const sp = (v: number) => Math.round(v * scale);
  const isSmallScreen = height < 700;
  const isNarrow = width < 360;
  const px = isNarrow ? 16 : sp(22);

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

  const logoSize = sp(Math.min(60, 68));
  const logoRadius = Math.round(logoSize * 0.33);
  const iconSize = sp(24);
  const titleSize = sp(Math.min(20, 24));
  const subtitleSize = sp(Math.min(12, 14));
  const btnTextSize = sp(Math.min(13, 15));
  const cardPadding = sp(Math.min(16, 20));
  const heroPadTop = isSmallScreen ? 6 : sp(12);
  const heroPadBottom = isSmallScreen ? 8 : sp(14);

  if (verificationSent) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.verifyContainer, { paddingBottom: insets.bottom + 40, paddingTop: insets.top + 60, paddingHorizontal: px }]}>
          <View style={[styles.successIconWrap, { backgroundColor: colors.safeDim, borderColor: colors.safe + "30" }]}>
            <Ionicons name="mail-open-outline" size={sp(36)} color={colors.safe} />
          </View>
          <Text style={[styles.title, { color: colors.text, fontSize: titleSize }]}>Check Your Email</Text>
          <Text style={[styles.verifyText, { color: colors.textSecondary, fontSize: subtitleSize, lineHeight: Math.round(subtitleSize * 1.6) }]}>
            Account created! We've sent a verification email to{"\n"}
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{registeredEmail}</Text>
            {"\n\n"}Click the link to verify your account before signing in.
          </Text>
          <Pressable
            onPress={() => router.replace("/(auth)/login")}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary, paddingVertical: sp(11), width: "100%", opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <Text style={[styles.primaryBtnText, { fontSize: btnTextSize }]}>Go to Sign In</Text>
            <Ionicons name="arrow-forward" size={sp(14)} color="#fff" />
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.glowOrb, {
        backgroundColor: colors.primaryDim,
        top: -60, left: -80, width: 200, height: 200,
      }]} />
      <View style={[styles.glowOrb, {
        backgroundColor: colors.primaryDim,
        bottom: 60, right: -100, width: 220, height: 220,
      }]} />

      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, backgroundColor: colors.background, zIndex: 10 }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 24, paddingTop: insets.top + 10, paddingHorizontal: px }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          style={{ backgroundColor: colors.background }}
        >
          <View style={[styles.heroSection, { paddingTop: heroPadTop, paddingBottom: heroPadBottom }]}>
            <View style={[styles.logoWrap, { marginBottom: isSmallScreen ? 2 : 6 }]}>
              <View style={[styles.logoBox, { width: logoSize, height: logoSize, borderRadius: logoRadius, backgroundColor: colors.primary }]}>
                <Ionicons name="person-add" size={iconSize} color="#fff" />
              </View>
              {!isSmallScreen && (
                <>
                  <View style={[styles.logoRing, { borderColor: colors.primary + "30", width: logoSize + 18, height: logoSize + 18, borderRadius: logoRadius + 5 }]} />
                  <View style={[styles.logoRing2, { borderColor: colors.primary + "15", width: logoSize + 34, height: logoSize + 34, borderRadius: logoRadius + 10 }]} />
                </>
              )}
            </View>
            <Text style={[styles.appLabel, { color: colors.primary, fontSize: sp(10) }]}>QR GUARD</Text>
            <Text style={[styles.title, { color: colors.text, fontSize: titleSize }]}>Create account</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: subtitleSize }]}>
              Join to comment, report, and sync your scan history
            </Text>
          </View>

          <View style={[styles.card, {
            backgroundColor: colors.isDark ? "rgba(12,21,38,0.85)" : "rgba(255,255,255,0.92)",
            borderColor: colors.surfaceBorder,
            padding: cardPadding,
          }]}>
            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.dangerDim, borderColor: colors.danger + "40", marginBottom: sp(8) }]}>
                <Ionicons name="alert-circle" size={13} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger, fontSize: sp(11) }]}>{error}</Text>
              </View>
            ) : null}

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
                  paddingVertical: sp(10),
                },
              ]}
            >
              {googleLoading ? (
                <ActivityIndicator color={colors.text} size="small" />
              ) : (
                <>
                  <GoogleIcon size={sp(17)} />
                  <Text style={[styles.googleBtnText, { color: colors.text, fontSize: sp(12) }]}>Continue with Google</Text>
                </>
              )}
            </Pressable>

            <View style={[styles.dividerRow, { marginVertical: sp(10) }]}>
              <View style={[styles.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
              <Text style={[styles.dividerText, { color: colors.textMuted, fontSize: sp(11) }]}>or create with email</Text>
              <View style={[styles.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
            </View>

            <View style={[styles.fieldsSection, { gap: sp(8) }]}>
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

              <Pressable
                onPress={handleRegister}
                disabled={loading}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  { backgroundColor: colors.primary, paddingVertical: sp(11), opacity: pressed || loading ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={[styles.primaryBtnText, { fontSize: btnTextSize }]}>Create Account</Text>
                    <Ionicons name="arrow-forward" size={sp(14)} color="#fff" />
                  </>
                )}
              </Pressable>
            </View>
          </View>

          <View style={[styles.footer, { marginTop: sp(14) }]}>
            <Text style={[styles.footerText, { color: colors.textSecondary, fontSize: sp(11) }]}>Already have an account?</Text>
            <Link href="/(auth)/login" asChild>
              <Pressable>
                <Text style={[styles.footerLink, { color: colors.primary, fontSize: sp(11) }]}>Sign In</Text>
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
  heroSection: { alignItems: "center", gap: 5 },
  logoWrap: { alignItems: "center", justifyContent: "center" },
  logoBox: { alignItems: "center", justifyContent: "center" },
  logoRing: { position: "absolute", borderWidth: 1.5 },
  logoRing2: { position: "absolute", borderWidth: 1 },
  appLabel: { fontFamily: "Inter_700Bold", letterSpacing: 3, textTransform: "uppercase" },
  title: { fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.3 },
  subtitle: { fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 18, maxWidth: 280 },
  verifyContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 14 },
  verifyText: { fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 280 },
  successIconWrap: {
    width: 84, height: 84, borderRadius: 28,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, marginBottom: 6,
  },
  card: {
    borderRadius: 20, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08, shadowRadius: 16, elevation: 4,
  },
  errorBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    padding: 10, borderRadius: 12, borderWidth: 1,
  },
  errorText: { fontFamily: "Inter_500Medium", flex: 1 },
  googleBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8,
    borderWidth: 1, paddingHorizontal: 16, borderRadius: 14,
  },
  googleBtnText: { fontFamily: "Inter_600SemiBold" },
  dividerRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  dividerLine: { flex: 1, height: 1 },
  dividerText: { fontFamily: "Inter_400Regular" },
  fieldsSection: {},
  primaryBtn: {
    borderRadius: 14, alignItems: "center",
    flexDirection: "row", justifyContent: "center", gap: 6, marginTop: 2,
  },
  primaryBtnText: { color: "#fff", fontFamily: "Inter_700Bold" },
  footer: { flexDirection: "row", justifyContent: "center", gap: 5 },
  footerText: { fontFamily: "Inter_400Regular" },
  footerLink: { fontFamily: "Inter_700Bold" },
  overlayBg: {
    flex: 1, backgroundColor: "rgba(0,0,0,0.55)",
    alignItems: "center", justifyContent: "center",
  },
  overlayCard: {
    alignItems: "center", gap: 12, paddingVertical: 30, paddingHorizontal: 36,
    borderRadius: 20, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.15, shadowRadius: 20, elevation: 10,
    minWidth: 200,
  },
  overlayText: { fontFamily: "Inter_700Bold", fontSize: 14, textAlign: "center" },
  overlaySubText: { fontFamily: "Inter_400Regular", fontSize: 12, textAlign: "center" },
});
