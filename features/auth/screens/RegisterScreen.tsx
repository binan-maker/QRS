import { useState, useEffect } from "react";
import {
  View, Text, Pressable, StyleSheet, ActivityIndicator,
  KeyboardAvoidingView, Platform, ScrollView, TextInput,
} from "react-native";
import Animated from "react-native-reanimated";
import { Link, router, useLocalSearchParams } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import GoogleIcon from "@/shared/components/ui/GoogleIcon";
import GoogleAuthLoading from "@/shared/components/ui/GoogleAuthLoading";
import AuthFormInput from "@/features/auth/components/AuthFormInput";
import AuthBrandBlock from "@/features/auth/components/AuthBrandBlock";
import { useAuthScale } from "@/features/auth/hooks/useAuthScale";
import { makeAuthStyles } from "@/features/auth/styles";
import { validateEmail } from "@/validators";
import { useFadeSlide } from "@/features/auth/hooks/useFadeSlide";
import {
  verifyReferralCode,
  applyReferralCodeForUser,
  getPendingReferralCode,
  savePendingReferralCode,
  clearPendingReferralCode,
} from "@/services/rewards";

export default function RegisterScreen() {
  const { signUp, signInWithGoogle, googleRequest, user } = useAuth();
  const { colors, isDark } = useTheme();
  const insets = useSafeAreaInsets();
  const { sp, px, height } = useAuthScale();
  const S = makeAuthStyles(colors);

  const brandStyle  = useFadeSlide(0, -16);
  const cardStyle   = useFadeSlide(80, 28);
  const footerStyle = useFadeSlide(200, 16);

  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [fieldErrors, setFieldErrors] = useState({ name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [verificationSent, setVerificationSent] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");

  // Referral code state
  const params = useLocalSearchParams<{ ref?: string; referral?: string; code?: string }>();
  const [referralCode, setReferralCode] = useState("");
  const [isReferralExpanded, setIsReferralExpanded] = useState(false);
  const [isReferralEditing, setIsReferralEditing] = useState(false);
  const [tempReferralInput, setTempReferralInput] = useState("");
  const [referralValidating, setReferralValidating] = useState(false);
  const [referralError, setReferralError] = useState("");
  const [editReferralInput, setEditReferralInput] = useState("");
  const [editValidating, setEditValidating] = useState(false);
  const [editError, setEditError] = useState("");

  useEffect(() => {
    const paramRef = params?.ref || params?.referral || params?.code;
    if (paramRef && typeof paramRef === "string") {
      const clean = paramRef.trim().replace(/[^a-zA-Z0-9]/g, "").slice(0, 7).toLowerCase();
      if (clean.length === 7) {
        verifyReferralCode(clean)
          .then((res) => {
            if (res.valid) {
              setReferralCode(clean);
              setTempReferralInput(clean);
              setEditReferralInput(clean);
              savePendingReferralCode(clean).catch(() => {});
            }
          })
          .catch(() => {});
        return;
      }
    }

    getPendingReferralCode()
      .then((saved) => {
        if (saved) {
          const clean = saved.trim().toLowerCase();
          setReferralCode(clean);
          setTempReferralInput(clean);
          setEditReferralInput(clean);
        }
      })
      .catch(() => {});
  }, [params?.ref, params?.referral, params?.code]);

  useEffect(() => {
    if (user && !googleLoading) {
      if (referralCode && user.id) {
        applyReferralCodeForUser(user.id, referralCode).catch(() => {});
      }
      router.replace("/(tabs)");
    }
  }, [user, googleLoading, referralCode]);

  useEffect(() => {
    if (user && googleLoading) {
      if (referralCode && user.id) {
        applyReferralCodeForUser(user.id, referralCode).catch(() => {});
      }
      setGoogleLoading(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissAll();
    }
  }, [user, googleLoading, referralCode]);

  async function handleApplyReferral(rawInput: string) {
    const clean = rawInput.trim().replace(/[^a-zA-Z0-9]/g, "").slice(0, 7).toLowerCase();
    if (clean.length !== 7) {
      setReferralError("Referral code must be 7 characters.");
      return;
    }

    setReferralValidating(true);
    setReferralError("");

    try {
      const result = await verifyReferralCode(clean);
      if (result.valid) {
        setReferralCode(clean);
        setEditReferralInput(clean);
        setIsReferralExpanded(false);
        setReferralError("");
        await savePendingReferralCode(clean);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setReferralError(result.error || "Invalid referral code.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setReferralError("Invalid referral code.");
    } finally {
      setReferralValidating(false);
    }
  }

  async function handleApplyEditReferral(rawInput: string) {
    const clean = rawInput.trim().replace(/[^a-zA-Z0-9]/g, "").slice(0, 7).toLowerCase();

    if (!clean) {
      setReferralCode("");
      setTempReferralInput("");
      setEditReferralInput("");
      setIsReferralEditing(false);
      setEditError("");
      await clearPendingReferralCode();
      return;
    }

    if (clean.length !== 7) {
      setEditError("Referral code must be 7 characters.");
      return;
    }

    setEditValidating(true);
    setEditError("");

    try {
      const result = await verifyReferralCode(clean);
      if (result.valid) {
        setReferralCode(clean);
        setEditReferralInput(clean);
        setIsReferralEditing(false);
        setEditError("");
        await savePendingReferralCode(clean);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      } else {
        setEditError(result.error || "Invalid referral code.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setEditError("Invalid referral code.");
    } finally {
      setEditValidating(false);
    }
  }

  async function handleRemoveReferral() {
    setReferralCode("");
    setTempReferralInput("");
    setEditReferralInput("");
    setIsReferralEditing(false);
    setReferralError("");
    setEditError("");
    await clearPendingReferralCode();
  }

  async function handleRegister() {
    const newFieldErrors = { name: "", email: "", password: "" };
    let hasFieldError = false;
    if (!displayName.trim()) { newFieldErrors.name = "Name is required."; hasFieldError = true; }
    if (!email.trim()) {
      newFieldErrors.email = "Email address is required."; hasFieldError = true;
    } else {
      const emailCheck = validateEmail(email.trim());
      if (!emailCheck.valid) {
        newFieldErrors.email = emailCheck.error || "Please use a real email address.";
        hasFieldError = true;
      }
    }
    if (!password.trim()) { newFieldErrors.password = "Password is required."; hasFieldError = true; }
    else if (password.length < 8) { newFieldErrors.password = "Password must be at least 8 characters."; hasFieldError = true; }
    else if (!/(?=.*[0-9])/.test(password)) { newFieldErrors.password = "Password must contain at least one number."; hasFieldError = true; }
    if (hasFieldError) { setFieldErrors(newFieldErrors); setError(""); return; }
    setError(""); setErrorCode(""); setFieldErrors({ name: "", email: "", password: "" }); setLoading(true);

    if (referralCode.trim()) {
      await savePendingReferralCode(referralCode.trim());
    }

    try {
      await signUp(email.trim(), displayName.trim(), password);
    } catch (e: any) {
      if (e.code === "auth/verification-sent") {
        setRegisteredEmail(email.trim());
        setVerificationSent(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        router.replace({
          pathname: "/(auth)/verify-email",
          params: { email: email.trim() },
        });
        return;
      } else {
        setErrorCode(e.code ?? "");
        setError(e.message || "Sign up failed. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } finally { setLoading(false); }
  }

  async function handleGoogleSignIn() {
    setError(""); setGoogleLoading(true);
    if (referralCode.trim()) {
      await savePendingReferralCode(referralCode.trim());
    }
    try {
      await signInWithGoogle();
      // On success: user state updates → useEffect above resets googleLoading
      // and navigates away. Do NOT call setGoogleLoading(false) here.
    } catch (e: any) {
      if (e.code === "auth/cancelled-by-user") {
        // User tapped Cancel, or first-tap iOS animation race — reset quietly.
      } else {
        setError(e.message || "Google sign-in failed. Please try again.");
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
      setGoogleLoading(false);
    }
  }

  if (verificationSent) {
    return (
      <View style={{ flex: 1, backgroundColor: colors.background }}>
        <View style={[S.centeredContainer, { paddingBottom: insets.bottom + 40, paddingTop: insets.top + 40, paddingHorizontal: px }]}>
          <View style={[S.successOrb, { backgroundColor: colors.safeDim, borderColor: colors.safe + "30" }]}>
            <Ionicons name="mail-open-outline" size={sp(38)} color={colors.safe} />
          </View>
          <Text style={{ color: colors.text, fontSize: sp(22), fontFamily: "Inter_700Bold", letterSpacing: -0.5, textAlign: "center" }}>
            Check your inbox
          </Text>
          <Text style={[S.verifyText, { color: colors.textSecondary, fontSize: sp(14), lineHeight: sp(22) }]}>
            We sent a verification link to{"\n"}
            <Text style={{ color: colors.primary, fontFamily: "Inter_600SemiBold" }}>{registeredEmail}</Text>
            {"\n\n"}Tap the link to activate your account, then sign in.
          </Text>
          <Pressable
            onPress={() => router.replace("/(auth)/login")}
            style={({ pressed }) => [S.primaryBtn, { backgroundColor: colors.primary, paddingVertical: sp(13), width: "100%", opacity: pressed ? 0.85 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
          >
            <Text style={[S.primaryBtnText, { fontSize: sp(14) }]}>Go to Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  const isDupEmail = errorCode === "auth/email-already-in-use";

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
              <AuthBrandBlock title="Create an account" />
            </Animated.View>

            <Animated.View style={[S.card, { backgroundColor: colors.isDark ? "rgba(16,25,41,0.94)" : "#fff", borderColor: colors.surfaceBorder, padding: sp(20) }, cardStyle]}>
              {error ? (
                <View style={[S.errorBanner, { backgroundColor: isDupEmail ? colors.warningDim : colors.dangerDim, borderColor: isDupEmail ? colors.warning + "40" : colors.danger + "40", flexDirection: "column", marginBottom: sp(12) }]}>
                  <View style={S.errorRow}>
                    <Ionicons name="alert-circle" size={14} color={isDupEmail ? colors.warning : colors.danger} />
                    <Text style={[S.errorText, { color: isDupEmail ? colors.warning : colors.danger, fontSize: sp(12) }]}>{error}</Text>
                  </View>
                  {isDupEmail && (
                    <View style={styles.errorActions}>
                      <Pressable onPress={() => router.replace("/(auth)/login")} hitSlop={6} style={[styles.errorActionBtn, { backgroundColor: colors.primary }]}>
                        <Text style={[styles.errorActionText, { fontSize: sp(11) }]}>Sign In</Text>
                      </Pressable>
                      <Pressable onPress={() => router.replace("/(auth)/forgot-password")} hitSlop={6} style={[styles.errorActionBtn, { backgroundColor: colors.surfaceLight, borderWidth: 1, borderColor: colors.surfaceBorder }]}>
                        <Text style={[styles.errorActionText, { color: colors.textSecondary, fontSize: sp(11) }]}>Forgot Password?</Text>
                      </Pressable>
                    </View>
                  )}
                </View>
              ) : null}

              <Pressable
                onPress={handleGoogleSignIn}
                disabled={googleLoading || (!googleRequest && Platform.OS === "web")}
                style={({ pressed }) => [S.googleBtn, { backgroundColor: colors.isDark ? "rgba(255,255,255,0.05)" : colors.surfaceLight, borderColor: colors.surfaceBorder, opacity: pressed ? 0.8 : 1, transform: [{ scale: pressed ? 0.98 : 1 }], paddingVertical: sp(12) }]}
              >
                <GoogleIcon size={sp(18)} />
                <Text style={[S.googleBtnText, { color: colors.text, fontSize: sp(13) }]}>Continue with Google</Text>
              </Pressable>

              <View style={[S.dividerRow, { marginVertical: sp(14) }]}>
                <View style={[S.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
                <Text style={[S.dividerText, { color: colors.textMuted, fontSize: sp(11) }]}>or with email</Text>
                <View style={[S.dividerLine, { backgroundColor: colors.surfaceBorder }]} />
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
                  placeholder="Password (min. 8 chars + number)"
                  value={password}
                  onChangeText={(v) => { setPassword(v); if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: "" })); }}
                  secureTextEntry={!showPassword}
                  showToggle
                  toggleVisible={showPassword}
                  onToggleVisible={() => setShowPassword(!showPassword)}
                  error={fieldErrors.password}
                />

                {/* ── Referral Section (Identical to Web Experience) ── */}
                {referralCode ? (
                  <View
                    style={[
                      styles.referralAppliedCard,
                      {
                        backgroundColor: isDark ? "rgba(0,82,204,0.12)" : "rgba(0,82,204,0.06)",
                        borderColor: isDark ? "rgba(96,165,250,0.25)" : "rgba(0,82,204,0.18)",
                      },
                    ]}
                  >
                    <View style={styles.referralAppliedMeta}>
                      <View style={styles.referralCodeGroup}>
                        <Text style={[styles.referralCodeLabel, { color: colors.textSecondary }]}>
                          Referral Code:
                        </Text>
                        <Text style={[styles.referralCodeValue, { color: colors.primary }]}>
                          {referralCode.toUpperCase()}
                        </Text>
                      </View>
                      <View style={styles.referralAppliedGreenBadge}>
                        <Ionicons name="checkmark" size={11} color="#059669" />
                        <Text style={styles.referralAppliedBadgeText}>Applied</Text>
                      </View>
                    </View>
                    <Pressable
                      onPress={() => {
                        setIsReferralEditing(!isReferralEditing);
                        setEditError("");
                        setEditReferralInput(referralCode.toUpperCase());
                      }}
                      hitSlop={6}
                      style={({ pressed }) => [
                        styles.referralChangeBtn,
                        {
                          backgroundColor: colors.surface,
                          borderColor: isDark ? "rgba(255,255,255,0.16)" : "rgba(0,82,204,0.24)",
                          opacity: pressed ? 0.75 : 1,
                        },
                      ]}
                    >
                      <Text style={[styles.referralChangeBtnText, { color: colors.primary }]}>
                        {isReferralEditing ? "Cancel" : "Change"}
                      </Text>
                    </Pressable>
                  </View>
                ) : (
                  <View style={styles.referralAccordionWrapper}>
                    <Pressable
                      onPress={() => {
                        setIsReferralExpanded(!isReferralExpanded);
                        setReferralError("");
                      }}
                      style={styles.referralExpandTrigger}
                      hitSlop={6}
                    >
                      <Ionicons name="pricetag-outline" size={13} color={colors.primary} />
                      <Text style={[styles.referralExpandTriggerText, { color: colors.textSecondary }]}>
                        Have a referral code? (Optional)
                      </Text>
                      <Ionicons
                        name={isReferralExpanded ? "chevron-up" : "chevron-down"}
                        size={12}
                        color={colors.textMuted}
                      />
                    </Pressable>

                    {isReferralExpanded && (
                      <View style={styles.referralInputGroup}>
                        <View
                          style={[
                            styles.referralInputPill,
                            {
                              backgroundColor: isDark ? "#0F0F0F" : "#EEF4FF",
                              borderColor: referralError ? colors.danger : colors.surfaceBorder,
                            },
                          ]}
                        >
                          <TextInput
                            placeholder="Enter referal code"
                            placeholderTextColor={colors.textMuted}
                            value={tempReferralInput.toUpperCase()}
                            maxLength={7}
                            autoCapitalize="characters"
                            autoCorrect={false}
                            onChangeText={(val) => {
                              const sanitized = val.replace(/[^a-zA-Z0-9]/g, "").slice(0, 7);
                              setTempReferralInput(sanitized);
                              if (referralError) setReferralError("");
                            }}
                            style={[styles.referralInputField, { color: colors.text }]}
                            editable={!referralValidating}
                          />
                          <Pressable
                            onPress={() => handleApplyReferral(tempReferralInput)}
                            disabled={tempReferralInput.trim().length !== 7 || referralValidating}
                            style={({ pressed }) => [
                              styles.referralApplyModernBtn,
                              {
                                backgroundColor: colors.primary,
                                opacity:
                                  tempReferralInput.trim().length !== 7 || referralValidating
                                    ? 0.45
                                    : pressed
                                    ? 0.85
                                    : 1,
                              },
                            ]}
                          >
                            {referralValidating ? (
                              <ActivityIndicator size="small" color="#fff" />
                            ) : (
                              <Text style={styles.referralApplyModernBtnText}>Apply</Text>
                            )}
                          </Pressable>
                        </View>
                        {referralError ? (
                          <View style={styles.referralInlineError}>
                            <Ionicons name="alert-circle" size={13} color={colors.danger} />
                            <Text style={[styles.referralInlineErrorText, { color: colors.danger }]}>
                              {referralError}
                            </Text>
                          </View>
                        ) : null}
                      </View>
                    )}
                  </View>
                )}

                {isReferralEditing && referralCode ? (
                  <View style={styles.referralEditWrapper}>
                    <View style={styles.referralEditInline}>
                      <View
                        style={[
                          styles.referralInputPill,
                          {
                            flex: 1,
                            backgroundColor: isDark ? "#0F0F0F" : "#EEF4FF",
                            borderColor: editError ? colors.danger : colors.surfaceBorder,
                          },
                        ]}
                      >
                        <TextInput
                          placeholder="Enter referal code"
                          placeholderTextColor={colors.textMuted}
                          value={editReferralInput.toUpperCase()}
                          maxLength={7}
                          autoCapitalize="characters"
                          autoCorrect={false}
                          onChangeText={(val) => {
                            const sanitized = val.replace(/[^a-zA-Z0-9]/g, "").slice(0, 7);
                            setEditReferralInput(sanitized);
                            if (editError) setEditError("");
                          }}
                          style={[styles.referralInputField, { color: colors.text }]}
                          editable={!editValidating}
                        />
                        <Pressable
                          onPress={() => handleApplyEditReferral(editReferralInput)}
                          disabled={editReferralInput.trim().length !== 7 || editValidating}
                          style={({ pressed }) => [
                            styles.referralApplyModernBtn,
                            {
                              backgroundColor: colors.primary,
                              opacity:
                                editReferralInput.trim().length !== 7 || editValidating
                                  ? 0.45
                                  : pressed
                                  ? 0.85
                                  : 1,
                            },
                          ]}
                        >
                          {editValidating ? (
                            <ActivityIndicator size="small" color="#fff" />
                          ) : (
                            <Text style={styles.referralApplyModernBtnText}>Apply</Text>
                          )}
                        </Pressable>
                      </View>
                      <Pressable
                        onPress={handleRemoveReferral}
                        style={({ pressed }) => [
                          styles.referralRemoveBtn,
                          {
                            backgroundColor: isDark ? "rgba(220,38,38,0.15)" : "rgba(220,38,38,0.08)",
                            opacity: pressed ? 0.75 : 1,
                          },
                        ]}
                      >
                        <Text style={[styles.referralRemoveBtnText, { color: colors.danger }]}>
                          Remove
                        </Text>
                      </Pressable>
                    </View>
                    {editError ? (
                      <View style={styles.referralInlineError}>
                        <Ionicons name="alert-circle" size={13} color={colors.danger} />
                        <Text style={[styles.referralInlineErrorText, { color: colors.danger }]}>
                          {editError}
                        </Text>
                      </View>
                    ) : null}
                  </View>
                ) : null}

                <Pressable
                  onPress={handleRegister}
                  disabled={loading}
                  style={({ pressed }) => [S.primaryBtn, { backgroundColor: colors.primary, paddingVertical: sp(13), marginTop: sp(4), opacity: pressed || loading ? 0.88 : 1, transform: [{ scale: pressed ? 0.98 : 1 }] }]}
                >
                  {loading
                    ? <ActivityIndicator color="#fff" />
                    : <Text style={[S.primaryBtnText, { fontSize: sp(14) }]}>Create Account</Text>}
                </Pressable>
              </View>
            </Animated.View>

            <Animated.View style={[S.footer, { marginTop: sp(20) }, footerStyle]}>
              <Text style={[S.footerText, { color: colors.textSecondary, fontSize: sp(13) }]}>Already have an account?</Text>
              <Link href="/(auth)/login" asChild>
                <Pressable hitSlop={8}>
                  <Text style={[S.footerLink, { color: colors.primary, fontSize: sp(13) }]}>Sign in</Text>
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
  errorActions:    { flexDirection: "row", gap: 8, marginTop: 2, paddingLeft: 22 },
  errorActionBtn:  { paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  errorActionText: { fontFamily: "Inter_600SemiBold", color: "#fff" },

  // Referral Applied Card (1:1 with Web)
  referralAppliedCard: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginTop: 2,
    marginBottom: 4,
  },
  referralAppliedMeta: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    flexWrap: "wrap",
    flex: 1,
  },
  referralCodeGroup: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  referralCodeLabel: {
    fontFamily: "Inter_500Medium",
    fontSize: 12,
  },
  referralCodeValue: {
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 0.5,
  },
  referralAppliedGreenBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 9999,
    backgroundColor: "rgba(16, 185, 129, 0.15)",
    borderWidth: 1,
    borderColor: "rgba(16, 185, 129, 0.3)",
  },
  referralAppliedBadgeText: {
    color: "#059669",
    fontFamily: "Inter_700Bold",
    fontSize: 10,
  },
  referralChangeBtn: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  referralChangeBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11,
  },

  // Referral Accordion Trigger
  referralAccordionWrapper: {
    marginVertical: 2,
  },
  referralExpandTrigger: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 4,
    paddingHorizontal: 2,
    alignSelf: "flex-start",
  },
  referralExpandTriggerText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
  },

  // Referral Input Pill
  referralInputGroup: {
    marginTop: 4,
    gap: 4,
  },
  referralInputPill: {
    flexDirection: "row",
    alignItems: "center",
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 3,
    height: 44,
  },
  referralInputField: {
    flex: 1,
    fontFamily: "Inter_700Bold",
    fontSize: 13,
    letterSpacing: 0.8,
    paddingVertical: 0,
  },
  referralApplyModernBtn: {
    borderRadius: 8,
    paddingHorizontal: 14,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  referralApplyModernBtnText: {
    color: "#FFFFFF",
    fontFamily: "Inter_700Bold",
    fontSize: 11.5,
  },
  referralInlineError: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 4,
    marginTop: 2,
  },
  referralInlineErrorText: {
    fontFamily: "Inter_500Medium",
    fontSize: 11,
  },

  // Referral Edit Inline Row
  referralEditWrapper: {
    marginVertical: 2,
  },
  referralEditInline: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  referralRemoveBtn: {
    borderWidth: 1,
    borderColor: "rgba(220, 38, 38, 0.25)",
    borderRadius: 10,
    paddingHorizontal: 12,
    height: 44,
    alignItems: "center",
    justifyContent: "center",
  },
  referralRemoveBtnText: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 11.5,
  },
});

