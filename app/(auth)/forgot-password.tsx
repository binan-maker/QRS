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
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "@/lib/haptics";
import { LinearGradient } from "expo-linear-gradient";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import AuthFormInput from "@/features/auth/components/AuthFormInput";

export default function ForgotPasswordScreen() {
  const { colors } = useTheme();
  const { sendPasswordReset } = useAuth();
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [emailError, setEmailError] = useState("");
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

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
        <LinearGradient
          colors={colors.isDark ? ["#020913", "#050B18"] : ["#EEF4FF", "#F4F8FF"]}
          style={StyleSheet.absoluteFill}
        />
        <View style={[styles.centeredContainer, { paddingBottom: insets.bottom + 40, paddingTop: insets.top + 40, paddingHorizontal: 28 }]}>
          <LinearGradient
            colors={[colors.safe + "25", colors.safe + "0A"]}
            style={[styles.successOrb, { borderColor: colors.safe + "30" }]}
          >
            <Ionicons name="checkmark-circle" size={52} color={colors.safe} />
          </LinearGradient>

          <Text style={[styles.title, { color: colors.text }]}>Email Sent!</Text>
          <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
            A reset link has been sent to{"\n"}
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{email}</Text>
            {"\n\n"}Check your inbox and follow the link to set a new password.
          </Text>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }], width: "100%" }]}
          >
            <LinearGradient
              colors={colors.isDark ? ["#00E5FF", "#0090CC", "#006FFF"] : ["#006FFF", "#0047CC"]}
              style={styles.primaryBtn}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.primaryBtnText}>Back to Sign In</Text>
              <Ionicons name="arrow-forward" size={18} color="#fff" />
            </LinearGradient>
          </Pressable>

          <Pressable onPress={() => { setSent(false); setEmail(""); }} style={styles.linkBtn}>
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>Try a different email</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <LinearGradient
        colors={colors.isDark ? ["#020913", "#050B18", "#07111F"] : ["#EEF4FF", "#F4F8FF", "#EAF0FF"]}
        style={StyleSheet.absoluteFill}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      />
      <View style={[styles.glowOrb, {
        backgroundColor: colors.isDark ? "rgba(0,229,255,0.05)" : "rgba(0,111,255,0.05)",
        top: -100, right: -100, width: 300, height: 300,
      }]} />

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        keyboardVerticalOffset={90}
      >
        <ScrollView
          contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + 40, paddingTop: insets.top + 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Pressable
            onPress={() => router.back()}
            style={[styles.backBtn, { backgroundColor: colors.surface + "CC", borderColor: colors.surfaceBorder }]}
          >
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </Pressable>

          <View style={styles.heroSection}>
            <View style={styles.iconWrap}>
              <LinearGradient
                colors={colors.isDark ? ["#006FFF", "#0047CC"] : ["#006FFF", "#0047CC"]}
                style={styles.iconGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <Ionicons name="key" size={34} color="#fff" />
              </LinearGradient>
              <View style={[styles.logoRing, { borderColor: colors.primary + "30" }]} />
              <View style={[styles.logoRing2, { borderColor: colors.primary + "12" }]} />
            </View>
            <Text style={[styles.title, { color: colors.text }]}>Reset Password</Text>
            <Text style={[styles.subtitle, { color: colors.textSecondary }]}>
              Enter your email and we'll send you a link to set a new password.
            </Text>
          </View>

          <View style={[styles.card, {
            backgroundColor: colors.isDark ? "rgba(12,21,38,0.85)" : "rgba(255,255,255,0.92)",
            borderColor: colors.surfaceBorder,
          }]}>
            {error ? (
              <View style={[styles.errorBanner, { backgroundColor: colors.dangerDim, borderColor: colors.danger + "40" }]}>
                <Ionicons name="alert-circle" size={16} color={colors.danger} />
                <Text style={[styles.errorText, { color: colors.danger }]}>{error}</Text>
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

            <View style={{ height: 16 }} />

            <Pressable
              onPress={handleReset}
              disabled={loading}
              style={({ pressed }) => [{ opacity: pressed || loading ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
            >
              <LinearGradient
                colors={colors.isDark ? ["#00E5FF", "#0090CC", "#006FFF"] : ["#006FFF", "#0047CC"]}
                style={styles.primaryBtn}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                {loading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.primaryBtnText}>Send Reset Link</Text>
                    <Ionicons name="send" size={16} color="#fff" />
                  </>
                )}
              </LinearGradient>
            </Pressable>
          </View>

          <Pressable onPress={() => router.back()} style={styles.linkBtn}>
            <Ionicons name="arrow-back" size={15} color={colors.textSecondary} />
            <Text style={[styles.linkText, { color: colors.textSecondary }]}>Back to Sign In</Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flexGrow: 1, paddingHorizontal: 22 },
  centeredContainer: { flex: 1, alignItems: "center", justifyContent: "center", gap: 16 },
  glowOrb: { position: "absolute", borderRadius: 200 },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1, marginBottom: 8, alignSelf: "flex-start",
  },
  heroSection: { alignItems: "center", paddingTop: 24, paddingBottom: 32, gap: 10 },
  iconWrap: { alignItems: "center", justifyContent: "center", marginBottom: 10 },
  iconGradient: {
    width: 88, height: 88, borderRadius: 30,
    alignItems: "center", justifyContent: "center",
  },
  logoRing: {
    position: "absolute", width: 110, height: 110, borderRadius: 36, borderWidth: 1.5,
  },
  logoRing2: {
    position: "absolute", width: 130, height: 130, borderRadius: 42, borderWidth: 1,
  },
  successOrb: {
    width: 110, height: 110, borderRadius: 38,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1.5, marginBottom: 8,
  },
  title: { fontSize: 30, fontFamily: "Inter_700Bold", textAlign: "center", letterSpacing: -0.5 },
  subtitle: { fontSize: 15, fontFamily: "Inter_400Regular", textAlign: "center", lineHeight: 22 },
  card: {
    borderRadius: 28, borderWidth: 1, padding: 24,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12, shadowRadius: 24, elevation: 8,
  },
  errorBanner: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    padding: 14, borderRadius: 16, marginBottom: 16, borderWidth: 1,
  },
  errorText: { fontFamily: "Inter_500Medium", fontSize: 14, flex: 1 },
  primaryBtn: {
    paddingVertical: 17, borderRadius: 18, alignItems: "center",
    flexDirection: "row", justifyContent: "center", gap: 8,
  },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Inter_700Bold" },
  linkBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 6, marginTop: 20, paddingVertical: 8 },
  linkText: { fontFamily: "Inter_500Medium", fontSize: 14 },
});
