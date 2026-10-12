import { View, Text, TextInput, Pressable, StyleSheet, ActivityIndicator } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import type { RegisterReferralState } from "@/features/auth/hooks/useRegisterReferral";

export default function RegisterReferralSection({
  referralCode,
  isReferralExpanded,
  setIsReferralExpanded,
  isReferralEditing,
  setIsReferralEditing,
  tempReferralInput,
  setTempReferralInput,
  referralValidating,
  referralError,
  setReferralError,
  editReferralInput,
  setEditReferralInput,
  editValidating,
  editError,
  setEditError,
  handleApplyReferral,
  handleApplyEditReferral,
  handleRemoveReferral,
}: RegisterReferralState) {
  const { colors, isDark } = useTheme();

  return (
    <>
      {/* ── Referral Applied Badge / Change Card ── */}
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
        /* ── Expandable Referral Accordion ── */
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

      {/* ── Referral Edit Row ── */}
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
    </>
  );
}

const styles = StyleSheet.create({
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
