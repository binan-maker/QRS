import React, { memo } from "react";
import { View, Text, Modal, Pressable, TextInput } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { RefereeStatus } from "../types";
import { styles } from "../styles";

interface ClaimRefereeModalProps {
  visible: boolean;
  refereeStatus: RefereeStatus;
  referralInput: string;
  referralStatus: string | null;
  referralError: boolean;
  applyingCode: boolean;
  onChangeInput: (val: string) => void;
  onApplyCode: () => void;
  onClose: () => void;
}

export const ClaimRefereeModal = memo(function ClaimRefereeModal({
  visible,
  refereeStatus,
  referralInput,
  referralStatus,
  referralError,
  applyingCode,
  onChangeInput,
  onApplyCode,
  onClose,
}: ClaimRefereeModalProps) {
  const { colors } = useTheme();

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
          style={[styles.modalCard, { backgroundColor: colors.surface, borderColor: colors.surfaceBorder }]}
          onPress={(e) => e.stopPropagation()}
        >
          <View style={styles.modalHeader}>
            <Text style={[styles.modalTitle, { color: colors.text }]}>
              Enter Invite Code
            </Text>
            <Pressable
              onPress={onClose}
              hitSlop={12}
              style={[styles.modalCloseBtn, { backgroundColor: colors.surfaceLight }]}
            >
              <Ionicons name="close" size={18} color={colors.text} />
            </Pressable>
          </View>

          {refereeStatus === "already_referred" ? (
            <View style={styles.modalBlockedState}>
              <View style={[styles.modalStateIconWrap, { backgroundColor: "#10B98118" }]}>
                <Ionicons name="checkmark-circle" size={34} color="#10B981" />
              </View>
              <Text style={[styles.modalStateTitle, { color: colors.text }]}>Already linked</Text>
              <Text style={[styles.modalStateDesc, { color: colors.textSecondary }]}>
                A referral code is already linked to your account.
              </Text>
              <Pressable onPress={onClose} style={[styles.modalDismissBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.modalDismissBtnText}>Got it</Text>
              </Pressable>
            </View>
          ) : refereeStatus === "expired" ? (
            <View style={styles.modalBlockedState}>
              <View style={[styles.modalStateIconWrap, { backgroundColor: "#F59E0B18" }]}>
                <Ionicons name="alert-circle" size={34} color="#F59E0B" />
              </View>
              <Text style={[styles.modalStateTitle, { color: colors.text }]}>Claim window closed</Text>
              <Text style={[styles.modalStateDesc, { color: colors.textSecondary }]}>
                Referral codes must be entered before scanning your first QR code.
              </Text>
              <Pressable onPress={onClose} style={[styles.modalDismissBtn, { backgroundColor: colors.primary }]}>
                <Text style={styles.modalDismissBtnText}>Understood</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.modalEligibleBody}>
              <Text style={[styles.modalDesc, { color: colors.textSecondary }]}>
                Enter your friend&apos;s 7-character invite code before your first scan to link accounts.
              </Text>

              <TextInput
                value={referralInput.toUpperCase()}
                onChangeText={(val) => onChangeInput(val.replace(/[^a-zA-Z0-9]/g, "").slice(0, 7))}
                placeholder="e.g. KRZRYN4"
                placeholderTextColor={colors.textMuted}
                autoCapitalize="characters"
                autoCorrect={false}
                maxLength={7}
                style={[
                  styles.modalInput,
                  {
                    backgroundColor: colors.inputBackground || colors.surfaceLight,
                    borderColor: colors.surfaceBorder,
                    color: colors.text,
                  },
                ]}
              />

              {referralStatus && (
                <View
                  style={[
                    styles.modalStatusBox,
                    {
                      backgroundColor: referralError ? "#EF444414" : "#10B98114",
                      borderColor: referralError ? "#EF444440" : "#10B98140",
                    },
                  ]}
                >
                  <Ionicons
                    name={referralError ? "alert-circle" : "checkmark-circle"}
                    size={16}
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

              <Pressable
                onPress={onApplyCode}
                disabled={!referralInput.trim() || applyingCode}
                style={({ pressed }) => [
                  styles.modalSubmitBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: !referralInput.trim() || applyingCode ? 0.5 : pressed ? 0.9 : 1,
                  },
                ]}
              >
                <Text style={styles.modalSubmitBtnText}>
                  {applyingCode ? "Verifying..." : "Apply Code"}
                </Text>
              </Pressable>
            </View>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
});
