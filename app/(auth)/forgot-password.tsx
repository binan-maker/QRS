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

  const scale = Math.min(Math.max(width / 390, 0.85), 1.0);
  const sp = (v: number) => Math.round(v * scale);
  const isNarrow = width < 360;
  const px = isNarrow ? 20 : sp(28);

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

  if (sent) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[
          styles.centeredContainer,
          {
            paddingBottom: insets.bottom + 40,
            paddingTop: insets.top + 40,
            paddingHorizontal: px,
          },
        ]}>
          <View style={[styles.successOrb, { backgroundColor: colors.safeDim, borderColor: colors.safe + "30" }]}>
            <Ionicons name="checkmark-circle" size={sp(42)} color={colors.safe} />
          </View>
          <Text style={[styles.pageTitle, { color: colors.text, fontSize: sp(22) }]}>Check your inbox</Text>
          <Text style={[styles.bodyText, { color: colors.textSecondary, fontSize: sp(14), lineHeight: sp(22) }]}>
            A reset link was sent to{"\n"}
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{email}</Text>
            {"\n\n"}Follow the link to set a new password.
          </Text>

          <Pressable
            onPress={() => router.back()}
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
            <Text style={[styles.primaryBtnText, { fontSize: sp(14) }]}>Back to Sign In</Text>
          </Pressable>

          <Pressable onPress={() => { setSent(false); setEmail(""); }} hitSlop={8} style={styles.linkBtn}>
            <Text style={[styles.linkText, { color: colors.textSecondary, fontSize: sp(13) }]}>Try a different email</Text>
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
                Reset password
              </Text>
              <Text style={[styles.pageSubtitle, { color: colors.textSecondary, fontSize: sp(13) }]}>
                Enter your email and we'll send you a reset link.
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

              <View style={{ height: sp(12) }} />

              <Pressable
                onPress={handleReset}
                disabled={loading}
                style={({ pressed }) => [
                  styles.primaryBtn,
                  {
                    backgroundColor: colors.primary,
                    paddingVertical: sp(13),
                    opacity: pressed || loading ? 0.88 : 1,
                    transform: [{ scale: pressed ? 0.98 : 1 }],
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.primaryBtnText, { fontSize: sp(14) }]}>Send Reset Link</Text>
                )}
              </Pressable>
            </View>

            <Pressable onPress={() => router.back()} style={[styles.linkBtn, { marginTop: sp(20) }]} hitSlop={8}>
              <Ionicons name="arrow-back" size={sp(13)} color={colors.textSecondary} />
              <Text style={[styles.linkText, { color: colors.textSecondary, fontSize: sp(13) }]}>Back to Sign In</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
    gap: 6,
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
  pageSubtitle: {
    fontFamily: "Inter_400Regular",
    textAlign: "center",
    maxWidth: 280,
    lineHeight: 20,
    marginTop: 2,
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
  bodyText: {
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
  primaryBtn: {
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
  },
  primaryBtnText: { color: "#fff", fontFamily: "Inter_700Bold", letterSpacing: 0.2 },
  linkBtn: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    paddingVertical: 8,
  },
  linkText: { fontFamily: "Inter_500Medium" },
});
