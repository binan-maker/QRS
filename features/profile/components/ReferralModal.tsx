import React, { useState, useCallback } from "react";
import {
  Modal,
  View,
  Text,
  TextInput,
  Pressable,
  StyleSheet,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "@/shared/utils/haptics";
import type { AppColors } from "@/shared/constants/colors";
import { applyReferralCodeForUser, type RewardWallet } from "@/services/rewards";

interface ReferralModalProps {
  visible: boolean;
  onClose: () => void;
  userId: string;
  wallet: RewardWallet | null;
  onApplied: () => void;
  colors: AppColors;
}

export default function ReferralModal({
  visible,
  onClose,
  userId,
  wallet,
  onApplied,
  colors,
}: ReferralModalProps) {
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; isError: boolean } | null>(null);
  const [success, setSuccess] = useState(false);

  const isAlreadyScanned =
    (wallet?.lifetimeEligibleScans || 0) > 0 || (wallet?.dailyEligibleScans || 0) > 0;
  const isAlreadyReferred = Boolean(wallet?.referredByCode || wallet?.referredByUserId);
  const isEligible = !isAlreadyScanned && !isAlreadyReferred;

  const handleApply = useCallback(async () => {
    const trimmed = code.trim();
    if (!trimmed) {
      setMessage({ text: "Please enter a 7-character code.", isError: true });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      const res = await applyReferralCodeForUser(userId, trimmed);
      if (res.ok) {
        setSuccess(true);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        onApplied();
      } else {
        setMessage({ text: res.message, isError: true });
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      }
    } catch {
      setMessage({ text: "Could not apply referral code. Please try again.", isError: true });
    } finally {
      setLoading(false);
    }
  }, [code, userId, onApplied]);

  const handleClose = () => {
    setCode("");
    setMessage(null);
    setSuccess(false);
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.overlay}
      >
        <Pressable style={styles.backdrop} onPress={handleClose} />

        <View
          style={[
            styles.dialog,
            {
              backgroundColor: colors.surface,
              borderColor: colors.surfaceBorder,
            },
          ]}
        >
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <View style={[styles.iconWrap, { backgroundColor: `${colors.primary}18` }]}>
                <Ionicons name="gift" size={20} color={colors.primary} />
              </View>
              <Text style={[styles.title, { color: colors.text }]}>Referral code</Text>
            </View>
            <Pressable onPress={handleClose} hitSlop={8} style={styles.closeBtn}>
              <Ionicons name="close" size={22} color={colors.textSecondary} />
            </Pressable>
          </View>

          {/* Body */}
          {success ? (
            <View style={styles.successBody}>
              <View style={[styles.successCircle, { backgroundColor: `${colors.safe}20` }]}>
                <Ionicons name="checkmark-circle" size={48} color={colors.safe} />
              </View>
              <Text style={[styles.successTitle, { color: colors.text }]}>Referral code applied!</Text>
              <Text style={[styles.successSub, { color: colors.textSecondary }]}>
                Your Silver Welcome Scratch Card is now linked. Scan your first QR code to scratch and reveal your reward!
              </Text>
              <Pressable
                onPress={handleClose}
                style={[styles.applyBtn, { backgroundColor: colors.primary, marginTop: 16 }]}
              >
                <Text style={styles.applyBtnText}>Done</Text>
              </Pressable>
            </View>
          ) : !isEligible ? (
            <View style={styles.ineligibleBody}>
              <View style={[styles.ineligibleCircle, { backgroundColor: `${colors.warning}20` }]}>
                <Ionicons name="lock-closed" size={36} color={colors.warning} />
              </View>
              <Text style={[styles.ineligibleTitle, { color: colors.text }]}>
                {isAlreadyReferred
                  ? "Referral already applied"
                  : "No longer eligible for bonus"}
              </Text>
              <Text style={[styles.ineligibleSub, { color: colors.textSecondary }]}>
                {isAlreadyReferred
                  ? `Your account is already linked to referral code "${wallet?.referredByCode}". Each user can only claim one referral code.`
                  : "Referral codes can only be entered before making your very first scan. Because you have already scanned a QR code, this option is now closed."}
              </Text>
              <Pressable
                onPress={handleClose}
                style={[styles.applyBtn, { backgroundColor: colors.surfaceLight, marginTop: 16 }]}
              >
                <Text style={[styles.applyBtnText, { color: colors.text }]}>Close</Text>
              </Pressable>
            </View>
          ) : (
            <View style={styles.formBody}>
              <Text style={[styles.instruction, { color: colors.textSecondary }]}>
                Enter your friend&apos;s 7-character referral code before making your very first scan to claim your Silver Welcome Scratch Card.
              </Text>

              <View style={styles.inputContainer}>
                <TextInput
                  value={code}
                  onChangeText={(val) => {
                    setCode(val.trim());
                    setMessage(null);
                  }}
                  placeholder="e.g. yn5i82v"
                  placeholderTextColor={colors.textMuted}
                  maxLength={12}
                  autoCapitalize="none"
                  autoCorrect={false}
                  style={[
                    styles.input,
                    {
                      backgroundColor: colors.surfaceLight,
                      borderColor: message?.isError ? colors.danger : colors.surfaceBorder,
                      color: colors.text,
                    },
                  ]}
                />
                <Text style={[styles.charHint, { color: colors.textMuted }]}>
                  {code.length}/7
                </Text>
              </View>

              {message && (
                <Text
                  style={[
                    styles.msgText,
                    { color: message.isError ? colors.danger : colors.safe },
                  ]}
                >
                  {message.text}
                </Text>
              )}

              <Text style={[styles.noticeText, { color: colors.textMuted }]}>
                ⚠️ Note: This input will be permanently disabled as soon as you scan your first QR code.
              </Text>

              <Pressable
                onPress={handleApply}
                disabled={loading || !code.trim()}
                style={({ pressed }) => [
                  styles.applyBtn,
                  {
                    backgroundColor: colors.primary,
                    opacity: loading || !code.trim() ? 0.5 : pressed ? 0.85 : 1,
                  },
                ]}
              >
                {loading ? (
                  <ActivityIndicator color="#FFFFFF" size="small" />
                ) : (
                  <Text style={styles.applyBtnText}>Apply</Text>
                )}
              </Pressable>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 20,
    backgroundColor: "rgba(0,0,0,0.65)",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  dialog: {
    width: "100%",
    maxWidth: 380,
    borderRadius: 24,
    borderWidth: 1,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.35,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 16,
  },
  headerLeft: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconWrap: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    fontSize: 18,
    fontWeight: "800",
    letterSpacing: -0.3,
  },
  closeBtn: {
    padding: 4,
  },
  formBody: {
    gap: 14,
  },
  instruction: {
    fontSize: 13,
    lineHeight: 19,
  },
  inputContainer: {
    position: "relative",
  },
  input: {
    height: 52,
    borderRadius: 14,
    borderWidth: 1.5,
    paddingHorizontal: 16,
    paddingRight: 50,
    fontSize: 17,
    fontWeight: "700",
    letterSpacing: 1.2,
  },
  charHint: {
    position: "absolute",
    right: 14,
    top: 17,
    fontSize: 12,
    fontWeight: "600",
  },
  msgText: {
    fontSize: 12,
    fontWeight: "600",
  },
  noticeText: {
    fontSize: 11,
    lineHeight: 15,
  },
  applyBtn: {
    height: 48,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    marginTop: 4,
  },
  applyBtnText: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
  },
  successBody: {
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  successCircle: {
    width: 72,
    height: 72,
    borderRadius: 36,
    alignItems: "center",
    justifyContent: "center",
  },
  successTitle: {
    fontSize: 18,
    fontWeight: "800",
    marginTop: 6,
  },
  successSub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
  ineligibleBody: {
    alignItems: "center",
    paddingVertical: 12,
    gap: 10,
  },
  ineligibleCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: "center",
    justifyContent: "center",
  },
  ineligibleTitle: {
    fontSize: 17,
    fontWeight: "800",
    marginTop: 4,
  },
  ineligibleSub: {
    fontSize: 13,
    textAlign: "center",
    lineHeight: 19,
  },
});
