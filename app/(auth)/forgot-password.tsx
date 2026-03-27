import { useState } from "react";
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
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import AuthFormInput from "@/features/auth/components/AuthFormInput";

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { sendPasswordReset } = useAuth();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const scale = Math.min(Math.max(width / 390, 0.82), 1.0);
  const isSmallScreen = height < 680;
  const isNarrow = width < 360;
  const px = isNarrow ? 16 : Math.round(22 * scale);

  async function handleReset() {
    setError(""); setEmailError("");
    if (!email.trim()) { setEmailError("Email address is required."); return; }
    setLoading(true);
    try {
      await sendPasswordReset(email.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setSent(true);
    } catch (e: any) {
      setError(e.message || "Failed to send reset email.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setLoading(false); }
  }

  const titleSize = Math.round(Math.min(27 * scale, 32));
  const subtitleSize = Math.round(Math.min(14 * scale, 16));
  const btnTextSize = Math.round(Math.min(15 * scale, 17));
  const logoSize = Math.round(Math.min(76 * scale, 88));
  const logoRadius = Math.round(logoSize * 0.33);
  const iconSize = Math.round(28 * scale);
  const cardPadding = Math.round(Math.min(22 * scale, 28));

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[styles.centeredContainer, { paddingBottom: insets.bottom + 40, paddingTop: insets.top + 40, paddingHorizontal: px }]}>
          <View style={[styles.successOrb, { backgroundColor: colors.safeDim, borderColor: colors.safe + "30" }]}>
            <Ionicons name="checkmark-circle" size={Math.round(48 * scale)} color={colors.safe} />
          </View>

          <Text style={[styles.title, { color: colors.text, fontSize: titleSize }]}>Email Sent!</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: subtitleSize, lineHeight: Math.round(subtitleSize * 1.6) }]}>
            A reset link has been sent to{"\n"}
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{email}</Text>
            {"\n\n"}Check your inbox and follow the link to set a new password.
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary, paddingVertical: Math.round(15 * scale), width: "100%", opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
            ]}
          >
            <Text style={[styles.primaryBtnText, { fontSize: btnTextSize }]}>Back to Sign In</Text>
            <Ionicons name="arrow-forward" size={Math.round(16 * scale)} color="#fff" />
          </Pressable>

          <Pressable onPress={() => { setSent(false); setEmail(""); }} style={styles.linkBtn}>
            <Text style={[styles.linkText, { color: colors.textSecondary, fontSize: Math.round(13 * scale) }]}>Try a different email</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[styles.glowOrb, {
        backgroundColor: colors.primaryDim,
        top: -100, right: -100, width: 280, height: 280,
      }]} />

      {/* Status bar solid cover */}
      <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: insets.top, backgroundColor: colors.background, zIndex: 10 }} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={0}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 32, paddingTop: insets.top + 14, paddingHorizontal: px }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          style={{ backgroundColor: colors.background }}
        >
          <View style={[styles.heroSection, { paddingTop: isSmallScreen ? 12 : Math.round(24 * scale), paddingBottom: isSmallScreen ? 16 : Math.round(28 * scale) }]}>
            <View style={[styles.iconWrap, { marginBottom: isSmallScreen ? 6 : 10 }]}>
              <View style={[styles.iconBox, { width: logoSize, height: logoSize, borderRadius: logoRadius, backgroundColor: colors.primary }]}>
                <Ionicons name="key" size={iconSize} color="#fff" />
              </View>
              {!isSmallScreen && (
                <>
                  <View style={[styles.logoRing, { borderColor: colors.primary + "30", width: logoSize + 22, height: logoSize + 22, borderRadius: logoRadius + 6 }]} />
                  <View style={[styles.logoRing2, { borderColor: colors.primary + "12", width: logoSize + 42, height: logoSize + 42, borderRadius: logoRadius + 12 }]} />
                </>
              )}
            </View>
            <Text style={[styles.title, { color: colors.text, fontSize: titleSize }]}>Reset Password</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: subtitleSize }]}>
              Enter your email and we'll send you a link to set a new password.
            </Text>
          </View>

          <View style={[styles.card, {
            backgroundColor: colors.isDark ? "rgba(12,21,38,0.85)" : "rgba(255,255,255,0.92)",
            borderColor: colors.surfaceBorder,
            padding: cardPadding,
          }]}>
            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.dangerDim, borderColor: colors.danger + "40", marginBottom: 14 }]}>
                <Ionicons name="alert-circle" size={15} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger, fontSize: Math.round(13 * scale) }]}>{error}</Text>
              </View>
            ) : null}

            <AuthFormInput
              icon="mail-outline"
              placeholder="Email address"
              value={email}
              onChangeText={(v) => { setEmail(v); if (emailError) setEmailError(""); }}
              keyboardType="email-address"
              autoCapitalize="none"
              autoCorrect={false}
              error={emailError}
            />

            <View style={{ height: Math.round(14 * scale) }} />

            <Pressable
              onPress={handleReset}
              disabled={loading}
              style={({ pressed }) => [
                styles.primaryBtn,
                { backgroundColor: colors.primary, paddingVertical: Math.round(15 * scale), opacity: pressed || loading ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] },
              ]}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Text style={[styles.primaryBtnText, { fontSize: btnTextSize }]}>Send Reset Link</Text>
                  <Ionicons name="send" size={Math.round(14 * scale)} color="#fff" />
                </>
              )}
            </Pressable>
          </View>

          <Pressable onPress={() => router.back()} style={[styles.linkBtn, { marginTop: Math.round(18 * scale) }]}>
            <Ionicons name="arrow-back" size={Math.round(14 * scale)} color={colors.textSecondary} />
            <Text style={[styles.linkText, { color: colors.textSecondary, fontSize: Math.round(13 * scale) }]}>Back to Sign In</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1 },
  centeredContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  glowOrb: { position: "absolute", borderRadius: 200 },
  heroSection: { alignItems: "center", gap: 10 },
  iconWrap: { alignItems: "center", justifyContent: "center" },
  iconBox: { alignItems: "center", justifyContent: "center" },
  logoRing: { position: "absolute", borderWidth: 1.5 },
  logoRing2: { position: "absolute", borderWidth: 1 },
  successOrb: {
    width: 104, height: 104, borderRadius: 36,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, marginBottom: 8,
  },
  title: { fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.5 },
  subtitle: { fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 300 },
  card: {
    borderRadius: 24, borderWidth: 1,
    shadowColor: "#000", shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.1, shadowRadius: 20, elevation: 6,
  },
  errorBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    padding: 12, borderRadius: 14, borderWidth: 1,
  },
  errorText: { fontFamily: "Inter_500Medium", flex: 1 },
  primaryBtn: {
    borderRadius: 16, alignItems: "center",
    flexDirection: "row", justifyContent: "center", gap: 8,
  },
  primaryBtnText: { color: "#fff", fontFamily: "Inter_700Bold" },
  linkBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, paddingVertical: 8 },
  linkText: { fontFamily: "Inter_500Medium" },
});
