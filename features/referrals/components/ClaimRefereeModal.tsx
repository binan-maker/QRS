import React from "react";
import { View, Text, Modal, Pressable, TextInput } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { RefereeStatus } from "../types";
import { styles } from "../styles";

interface ClaimRefereeModalProps {
  visible: boolean;
  user: any;
  refereeStatus: RefereeStatus;
  referralInput: string;
  referralStatus: string | null;
  referralError: boolean;
  applyingCode: boolean;
  onChangeInput: (val: string) => void;
  onApplyCode: () => void;
  onClose: () => void;
}

export function ClaimRefereeModal({
  visible,
  user,
  refereeStatus,
  referralInput,
  referralStatus,
  referralError,
  applyingCode,
  onChangeInput,
  onApplyCode,
  onClose,
}: ClaimRefereeModalProps) {
  const { colors, isDark } = useTheme();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <Pressable style={styles.modalBackdrop} onPress={onClose}>
        <Pressable
          style={[
            styles.modalCard,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
            },
          ]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Enter Invite Code
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={[
                styles.modalCloseBtn,
                { backgroundColor: colors.surfaceLight },
              ]}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>

          {/* Guarded Case 1: Already Referred */}
          {refereeStatus === "already_referred" ? (
            <View style={styles.modalBlockedState}>
              <View style={[styles.modalStateIconWrap, { backgroundColor: "#10B98118" }]}>
                <Ionicons name="checkmark-circle" size={36} color="#10B981" />
              </View>
              <Text style={[styles.modalStateTitle, { color: colors.text }]}>
                Already referred!
              </Text>
              <Text style={[styles.modalStateDesc, { color: colors.textSecondary }]}>
                A referral code has already been linked to your account.
              </Text>
              <Pressable
                onPress={onClose}
                style={[styles.modalDismissBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.modalDismissBtnText}>Got it</Text>
              </Pressable>
            </View>
          ) : refereeStatus === "expired" ? (
            /* Guarded Case 2: Expired after 1st scan */
            <View style={styles.modalBlockedState}>
              <View style={[styles.modalStateIconWrap, { backgroundColor: "#F59E0B18" }]}>
                <Ionicons name="alert-circle" size={36} color="#F59E0B" />
              </View>
              <Text style={[styles.modalStateTitle, { color: colors.text }]}>
                Code claim window closed
              </Text>
              <Text style={[styles.modalStateDesc, { color: colors.textSecondary }]}>
                Referral bonus codes must be entered before scanning your first QR code.
              </Text>
              <Pressable
                onPress={onClose}
                style={[styles.modalDismissBtn, { backgroundColor: colors.primary }]}
              >
                <Text style={styles.modalDismissBtnText}>Understood</Text>
              </Pressable>
            </View>
          ) : (
            /* Eligible Case */
            <View style={styles.modalEligibleBody}>
              <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                Enter a friend&apos;s 7-character invite code before your first scan to unlock your welcome reward.
              </Text>

              <TextInput
                value={referralInput.toUpperCase()}
                onChangeText={(val) => {
                  onChangeInput(val.replace(/[^a-zA-Z0-9]/g, "").slice(0, 7));
                }}
                placeholder="e.g. KRZRYN4"
                placeholderTextColor={colors.textMuted}
                maxLength={7}
                autoCapitalize="characters"
                autoCorrect={false}
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.inputBackground || colors.surfaceLight,
                    color: colors.text,
                    borderColor: colors.surfaceBorder,
                  },
                ]}
              />

              {referralStatus && (
                <View
                  style={[
                    styles.modalStatusBox,
                    {
                      backgroundColor: referralError
                        ? isDark
                          ? "rgba(239, 68, 68, 0.15)"
                          : "#FEF2F2"
                        : isDark
                        ? "rgba(16, 185, 129, 0.15)"
                        : "#ECFDF5",
                      borderColor: referralError
                        ? isDark
                          ? "rgba(239, 68, 68, 0.3)"
                          : "#FECACA"
                        : isDark
                        ? "rgba(16, 185, 129, 0.3)"
                        : "#A7F3D0",
                    },
                  ]}
                >
                  <Ionicons
                    name={referralError ? "alert-circle" : "checkmark-circle"}
                    size={15}
                    color={referralError ? "#EF4444" : "#10B981"}
                  />
                  <Text
                    style={[
                      styles.modalStatusText,
                      { color: referralError ? "#EF4444" : "#10B981" },
                    ]}
                  >
                    {referralStatus}
                  </Text>
                </View>
              )}

              {!user && referralStatus && !referralError ? (
                <View style={{ gap: 10, marginTop: 14 }}>
                  <Pressable
                    onPress={() => {
                      onClose();
                      router.push("/(auth)/register");
                    }}
                    style={({ pressed }) => [
                      styles.modalSubmitBtn,
                      {
                        backgroundColor: "#10B981",
                        opacity: pressed ? 0.85 : 1,
                        marginTop: 0,
                      },
                    ]}
                  >
                    <Text style={styles.modalSubmitBtnText}>Create Account to Claim</Text>
                  </Pressable>
                  <Pressable
                    onPress={() => {
                      onClose();
                      router.push("/(auth)/login");
                    }}
                    style={({ pressed }) => [
                      styles.modalSecondaryBtn,
                      { opacity: pressed ? 0.75 : 1 },
                    ]}
                  >
                    <Text style={[styles.modalSecondaryBtnText, { color: colors.primary }]}>
                      Already have an account? Sign In
                    </Text>
                  </Pressable>
                </View>
              ) : (
                <Pressable
                  onPress={onApplyCode}
                  disabled={!referralInput.trim() || applyingCode}
                  style={({ pressed }) => [
                    styles.modalSubmitBtn,
                    {
                      backgroundColor: colors.primary,
                      opacity:
                        !referralInput.trim() || applyingCode ? 0.45 : pressed ? 0.85 : 1,
                    },
                  ]}
                >
                  <Text style={styles.modalSubmitBtnText}>
                    {applyingCode ? "Verifying..." : "Apply Code"}
                  </Text>
                </Pressable>
              )}
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}
