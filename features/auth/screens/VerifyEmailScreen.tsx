import { useState, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "@/lib/haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { useAuthScale } from "@/features/auth/hooks/useAuthScale";
import { makeAuthStyles } from "@/features/auth/styles";

export default function VerifyEmailScreen() {
  const { user, signOut, resendVerification, refreshUser } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { sp, px } = useAuthScale();
  const S = makeAuthStyles(colors);

  const { fromLogin } = useLocalSearchParams<{ fromLogin?: string }>();
  const cameFromLogin = fromLogin === "true";

  const [resending, setResending] = useState(false);
  const [resendSuccess, setResendSuccess] = useState(false);
  const [resendError, setResendError] = useState("");
  const [checkingVerification, setCheckingVerification] = useState(false);
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (user?.emailVerified) router.replace("/(tabs)");
  }, [user?.emailVerified]);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((c) => c - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  async function handleResend() {
    if (resending || cooldown > 0) return;
    setResendError(""); setResendSuccess(false); setResending(true);
    try {
      await resendVerification();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setResendSuccess(true);
      setCooldown(60);
    } catch (e: any) {
      setResendError(e.message || "Failed to resend. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally { setResending(false); }
  }

  async function handleCheckVerified() {
    setCheckingVerification(true);
    try {
      await refreshUser();
      if (user?.emailVerified) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace("/(tabs)");
      } else {
        setResendError("Email not yet verified. Please check your inbox and tap the link.");
      }
    } catch {
      setResendError("Could not check verification status. Please try again.");
    } finally { setCheckingVerification(false); }
  }

  async function handleSignOut() {
    await signOut();
    router.replace("/(auth)/login");
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <View style={[S.centeredContainer, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 40, paddingHorizontal: px }]}>
        <View style={[S.successOrb, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
          <Ionicons name="mail-open-outline" size={sp(38)} color={colors.primary} />
        </View>

        <Text style={[styles.title, { color: colors.text, fontSize: sp(22) }]}>
          Verify your email
        </Text>

        <Text style={[styles.subtitle, { color: colors.textSecondary, fontSize: sp(14), lineHeight: sp(22) }]}>
          {cameFromLogin
            ? `Your account isn't verified yet. Tap "Resend email" below to get a fresh link sent to`
            : "We sent a verification link to"}
          {"\n"}
          <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>
            {user?.email ?? "your email address"}
          </Text>
          {"\n\n"}
          {cameFromLogin
            ? `Click the link in that email, then tap "I've verified my email" to sign in.`
            : "Tap the link in that email to activate your account, then come back and tap the button below."}
        </Text>

        {(resendSuccess || resendError) ? (
          <View style={[styles.banner, { backgroundColor: resendSuccess ? colors.safeDim : colors.dangerDim, borderColor: resendSuccess ? colors.safe + "40" : colors.danger + "40", marginBottom: sp(16) }]}>
            <Ionicons
              name={resendSuccess ? "checkmark-circle-outline" : "alert-circle-outline"}
              size={14}
              color={resendSuccess ? colors.safe : colors.danger}
            />
            <Text style={[styles.bannerText, { color: resendSuccess ? colors.safe : colors.danger, fontSize: sp(13) }]}>
              {resendSuccess ? "Verification email sent. Check your inbox." : resendError}
            </Text>
          </View>
        ) : null}

        <Pressable
          onPress={handleCheckVerified}
          disabled={checkingVerification}
          style={({ pressed }) => [S.primaryBtn, { backgroundColor: colors.primary, paddingVertical: sp(13), width: "100%", maxWidth: 380, opacity: pressed || checkingVerification ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        >
          {checkingVerification ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <>
              <Ionicons name="checkmark-done-outline" size={sp(16)} color="#fff" />
              <Text style={[S.primaryBtnText, { fontSize: sp(14) }]}>I've verified my email</Text>
            </>
          )}
        </Pressable>

        <Pressable
          onPress={handleResend}
          disabled={resending || cooldown > 0}
          style={({ pressed }) => [styles.outlineBtn, { borderColor: colors.surfaceBorder, paddingVertical: sp(13), opacity: pressed || resending || cooldown > 0 ? 0.7 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
        >
          {resending ? (
            <ActivityIndicator color={colors.primary} />
          ) : (
            <>
              <Ionicons name="refresh-outline" size={sp(15)} color={colors.primary} />
              <Text style={[styles.outlineBtnText, { color: colors.primary, fontSize: sp(14) }]}>
                {cooldown > 0 ? `Resend in ${cooldown}s` : "Resend email"}
              </Text>
            </>
          )}
        </Pressable>

        <Pressable onPress={handleSignOut} hitSlop={8} style={[S.linkBtn, { marginTop: sp(8) }]}>
          <Text style={[S.linkText, { color: colors.textMuted, fontSize: sp(13) }]}>
            Use a different account
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  title:          { fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "center" },
  subtitle:       { fontFamily: "Inter_400Regular", textAlign: "center", maxWidth: 320 },
  banner:         { flexDirection: "row", alignItems: "flex-start", gap: 8, padding: 12, borderRadius: 12, borderWidth: 1, width: "100%", maxWidth: 380 },
  bannerText:     { fontFamily: "Inter_500Medium", flex: 1, lineHeight: 18 },
  outlineBtn:     { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, borderRadius: 14, borderWidth: 1, width: "100%", maxWidth: 380 },
  outlineBtnText: { fontFamily: "Inter_600SemiBold" },
});
