import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import {
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  BackHandler,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useAuthScale } from "@/features/auth/hooks/useAuthScale";
import { useFadeSlide } from "@/features/auth/hooks/useFadeSlide";
import { makeAuthStyles } from "@/features/auth/styles";
import AuthBrandBlock from "@/features/auth/components/AuthBrandBlock";
import { navigateToHome } from "@/shared/utils/device/navigation";
import {
  sanitizeUsername,
  validateUsername,
} from "@/shared/utils/username-rules";
import {
  checkUsernameAvailable,
  claimInitialUsername,
} from "@/services/user/username";

function generateCleanSuggestions(seed: string): string[] {
  const clean = seed
    .toLowerCase()
    .replace(/[^a-z0-9\s_]/g, "")
    .trim();
  const tokens = clean.split(/[\s_]+/).filter(Boolean);

  const first = (tokens[0] || "user").slice(0, 10);
  const second = (tokens[1] || "").slice(0, 8);

  const candidates: string[] = [];

  if (first && second) {
    candidates.push(sanitizeUsername(`${first}_${second}`).slice(0, 20));
    candidates.push(sanitizeUsername(`${first}${second}`).slice(0, 20));
  } else if (first) {
    candidates.push(sanitizeUsername(first).slice(0, 20));
  }

  candidates.push(sanitizeUsername(`${first}_binro`).slice(0, 20));
  candidates.push(sanitizeUsername(`${first}_eco`).slice(0, 20));

  return Array.from(new Set(candidates))
    .filter((h) => h.length >= 3 && h.length <= 20)
    .slice(0, 4);
}

export default function UsernameOnboardingScreen() {
  const { user, signOut, updateLocalUsername } = useAuth();
  const { colors } = useTheme();
  const insets = useSafeAreaInsets();
  const { sp, px } = useAuthScale();
  const S = makeAuthStyles(colors);

  const brandStyle = useFadeSlide(0, -16);
  const cardStyle = useFadeSlide(60, 24);
  const footerStyle = useFadeSlide(160, 16);

  const [handleInput, setHandleInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const [checking, setChecking] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [generalError, setGeneralError] = useState("");
  const [status, setStatus] = useState<{
    available: boolean;
    error?: string | null;
    checked: boolean;
  }>({ available: false, checked: false });

  const inputRef = useRef<TextInput>(null);

  // ── Hardware Back Button Interception ───────────────────────────────────────
  // Locks the user on the username checkpoint until a handle is claimed.
  useEffect(() => {
    const backSub = BackHandler.addEventListener("hardwareBackPress", () => true);
    return () => backSub.remove();
  }, []);

  // ── Session Guard ───────────────────────────────────────────────────────────
  useEffect(() => {
    // If user already has a valid username, proceed to home
    if (user?.username && user.username.trim() !== "") {
      navigateToHome();
    }
  }, [user?.username]);

  // Derive quick suggestion chips from user display name or email
  const seedName = useMemo(() => {
    return user?.displayName || user?.email?.split("@")[0] || "eco";
  }, [user]);

  const suggestions = useMemo(() => {
    return generateCleanSuggestions(seedName);
  }, [seedName]);

  // ── Real-Time Handle Availability (Debounced 250ms) ────────────────────────
  useEffect(() => {
    const trimmed = sanitizeUsername(handleInput);
    if (!trimmed) {
      setStatus({ available: false, checked: false, error: null });
      setChecking(false);
      return;
    }

    const val = validateUsername(trimmed);
    if (!val.valid) {
      setStatus({
        available: false,
        error: "3–20 chars, lowercase letters, numbers or _",
        checked: true,
      });
      setChecking(false);
      return;
    }

    setChecking(true);
    setGeneralError("");

    const timer = setTimeout(async () => {
      try {
        const available = await checkUsernameAvailable(trimmed);
        if (available) {
          setStatus({ available: true, checked: true });
        } else {
          setStatus({
            available: false,
            error: `@${trimmed} is already taken`,
            checked: true,
          });
        }
      } catch {
        setStatus({
          available: false,
          error: "Unable to verify handle availability",
          checked: true,
        });
      } finally {
        setChecking(false);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [handleInput]);

  const handleSelectSuggestion = useCallback((sug: string) => {
    Haptics.selectionAsync();
    setHandleInput(sug);
    setGeneralError("");
  }, []);

  const handleClaim = async () => {
    const clean = sanitizeUsername(handleInput);
    const val = validateUsername(clean);
    if (!val.valid) {
      setGeneralError(val.error || "Please choose a valid handle.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!status.available) {
      setGeneralError(status.error || "Please choose an available handle.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    if (!user?.id) {
      setGeneralError("Authentication error. Please sign in again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      return;
    }

    setSubmitting(true);
    setGeneralError("");

    try {
      const claimed = await claimInitialUsername(user.id, clean);
      updateLocalUsername(claimed);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      navigateToHome();
    } catch (err: any) {
      setGeneralError(err.message || "Failed to claim handle. Please try again.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      setStatus({
        available: false,
        error: err.message,
        checked: true,
      });
    } finally {
      setSubmitting(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await signOut();
      router.replace("/(auth)/login");
    } catch {}
  };

  // Determine input border and accent color based on state
  let inputBorderColor = colors.border;
  if (status.error) {
    inputBorderColor = "#ef4444";
  } else if (status.available) {
    inputBorderColor = "#22c55e";
  } else if (isFocused) {
    inputBorderColor = colors.primary;
  }

  const isClaimDisabled =
    !status.available || checking || submitting || !handleInput.trim();

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={[
            S.scrollContent,
            {
              paddingTop: Math.max(insets.top + 20, 36),
              paddingBottom: Math.max(insets.bottom + 20, 28),
              paddingHorizontal: px,
            },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View style={S.inner}>
            {/* ── Brand Header Block ── */}
            <View style={brandStyle}>
              <AuthBrandBlock
                title="Claim your handle"
                subtitle="Choose your unique @handle to track your recycling impact and join leaderboards."
              />
            </View>

            {/* ── Main Form Card ── */}
            <View
              style={[
                S.card,
                cardStyle,
                {
                  backgroundColor: colors.surface,
                  borderColor: colors.border,
                  padding: px,
                  gap: 16,
                },
              ]}
            >
              {generalError ? (
                <View
                  style={[
                    S.errorBanner,
                    {
                      backgroundColor: colors.isDark ? "#2A1414" : "#FEE2E2",
                      borderColor: colors.isDark ? "#7F1D1D" : "#FCA5A5",
                    },
                  ]}
                >
                  <View style={S.errorRow}>
                    <Ionicons
                      name="alert-circle"
                      size={sp(16)}
                      color={colors.isDark ? "#F87171" : "#DC2626"}
                    />
                    <Text
                      style={[
                        S.errorText,
                        {
                          color: colors.isDark ? "#FCA5A5" : "#991B1B",
                          fontSize: sp(12),
                        },
                      ]}
                    >
                      {generalError}
                    </Text>
                  </View>
                </View>
              ) : null}

              {/* ── Handle Input Field ── */}
              <View style={styles.inputGroup}>
                <Text style={[styles.fieldLabel, { color: colors.textSecondary, fontSize: sp(12) }]}>
                  YOUR HANDLE
                </Text>

                <View
                  style={[
                    styles.inputContainer,
                    {
                      backgroundColor: colors.background,
                      borderColor: inputBorderColor,
                      height: 54,
                    },
                  ]}
                >
                  <Text style={[styles.atSymbol, { color: colors.primary, fontSize: sp(17) }]}>
                    @
                  </Text>
                  <TextInput
                    ref={inputRef}
                    style={[
                      styles.input,
                      {
                        color: colors.text,
                        fontSize: sp(16),
                      },
                    ]}
                    value={handleInput}
                    onChangeText={(txt) => {
                      setHandleInput(sanitizeUsername(txt));
                    }}
                    onFocus={() => setIsFocused(true)}
                    onBlur={() => setIsFocused(false)}
                    placeholder="yourhandle"
                    placeholderTextColor={colors.textMuted || "#64748b"}
                    autoCapitalize="none"
                    autoCorrect={false}
                    autoComplete="off"
                    returnKeyType="done"
                    onSubmitEditing={handleClaim}
                    maxLength={20}
                  />

                  {/* Status Indicator Icon / Spinner */}
                  <View style={styles.trailingIcon}>
                    {checking ? (
                      <ActivityIndicator size="small" color={colors.primary} />
                    ) : status.available ? (
                      <Ionicons name="checkmark-circle" size={sp(20)} color="#22c55e" />
                    ) : status.error ? (
                      <Ionicons name="alert-circle" size={sp(20)} color="#ef4444" />
                    ) : null}
                  </View>
                </View>

                {/* Helper / Status Text */}
                <View style={styles.statusRow}>
                  {status.available ? (
                    <Text style={[styles.statusAvailable, { fontSize: sp(12) }]}>
                      Available
                    </Text>
                  ) : status.error ? (
                    <Text style={[styles.statusError, { fontSize: sp(12) }]}>
                      {status.error}
                    </Text>
                  ) : (
                    <Text style={[styles.statusHint, { color: colors.textMuted, fontSize: sp(11.5) }]}>
                      3–20 characters, lowercase letters, numbers, or _
                    </Text>
                  )}
                </View>
              </View>

              {/* ── Quick Suggestions ── */}
              {suggestions.length > 0 && (
                <View style={styles.suggestionsContainer}>
                  <Text style={[styles.suggestionsLabel, { color: colors.textMuted, fontSize: sp(11.5) }]}>
                    Suggestions
                  </Text>
                  <View style={styles.chipsRow}>
                    {suggestions.map((sug) => {
                      const isSelected = handleInput === sug;
                      return (
                        <Pressable
                          key={sug}
                          onPress={() => handleSelectSuggestion(sug)}
                          style={({ pressed }) => [
                            styles.chip,
                            {
                              backgroundColor: isSelected
                                ? colors.primary + "18"
                                : colors.background,
                              borderColor: isSelected
                                ? colors.primary
                                : colors.border,
                              opacity: pressed ? 0.75 : 1,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.chipText,
                              {
                                color: isSelected ? colors.primary : colors.text,
                                fontSize: sp(12.5),
                              },
                            ]}
                          >
                            @{sug}
                          </Text>
                        </Pressable>
                      );
                    })}
                  </View>
                </View>
              )}

              {/* ── Primary Action Button ── */}
              <Pressable
                onPress={handleClaim}
                disabled={isClaimDisabled}
                style={({ pressed }) => [
                  S.primaryBtn,
                  {
                    backgroundColor: colors.primary,
                    height: 52,
                    opacity: isClaimDisabled ? 0.45 : pressed ? 0.88 : 1,
                    marginTop: 6,
                  },
                ]}
              >
                {submitting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Text style={[S.primaryBtnText, { fontSize: sp(15) }]}>
                      Continue
                    </Text>
                    <Ionicons name="arrow-forward" size={sp(16)} color="#fff" />
                  </>
                )}
              </Pressable>
            </View>

            {/* ── Safe Exit / Sign Out ── */}
            <View style={[S.footer, footerStyle, { marginTop: 20 }]}>
              <Text style={[S.footerText, { color: colors.textSecondary, fontSize: sp(13) }]}>
                Wrong account?
              </Text>
              <Pressable onPress={handleSignOut}>
                <Text style={[S.footerLink, { color: colors.primary, fontSize: sp(13) }]}>
                  Log in with another
                </Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  inputGroup: {
    gap: 7,
  },
  fieldLabel: {
    fontFamily: "Inter_600SemiBold",
    letterSpacing: 0.6,
  },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 14,
  },
  atSymbol: {
    fontFamily: "Inter_700Bold",
    marginRight: 4,
  },
  input: {
    flex: 1,
    height: "100%",
    fontFamily: "Inter_500Medium",
    paddingVertical: 0,
  },
  trailingIcon: {
    width: 24,
    height: 24,
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  statusRow: {
    minHeight: 18,
    justifyContent: "center",
    marginTop: 2,
  },
  statusHint: {
    fontFamily: "Inter_400Regular",
  },
  statusAvailable: {
    fontFamily: "Inter_600SemiBold",
    color: "#22c55e",
  },
  statusError: {
    fontFamily: "Inter_500Medium",
    color: "#ef4444",
  },
  suggestionsContainer: {
    gap: 8,
    marginTop: 2,
  },
  suggestionsLabel: {
    fontFamily: "Inter_500Medium",
    letterSpacing: 0.2,
  },
  chipsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  chip: {
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: {
    fontFamily: "Inter_600SemiBold",
  },
});
