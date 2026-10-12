import {
  View, Text, StyleSheet, Pressable,
  TextInput, ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import BottomSheet from "@/shared/components/ui/BottomSheet";
import { useAccountDeletion, CONFIRM_PHRASE } from "../hooks/useAccountDeletion";

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
}

export default function DeleteAccountModal({ visible, onClose }: DeleteAccountModalProps) {
  const { colors } = useTheme();
  const { user } = useAuth();

  const {
    confirmText,
    setConfirmText,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    deleting,
    step,
    isConfirmMatch,
    isGoogleUser,
    handleDeleteAccount,
    handleClose,
  } = useAccountDeletion({ visible, onClose });

  if (!user) return null;

  return (
    <BottomSheet
      visible={visible}
      onClose={handleClose}
      sheetStyle={{ borderTopWidth: 1.5, borderColor: colors.danger + "50" }}
    >
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Ionicons name="warning" size={20} color={colors.danger} />
          <Text style={[styles.title, { color: colors.text }]}>
            {step === 1 ? "Confirm Deletion" : "Re-authentication Required"}
          </Text>
        </View>
        <Pressable
          onPress={handleClose}
          disabled={deleting}
          style={[styles.closeBtn, { backgroundColor: colors.surfaceLight, opacity: deleting ? 0.4 : 1 }]}
        >
          <Ionicons name="close" size={22} color={colors.textMuted} />
        </Pressable>
      </View>

      {step === 1 ? (
        // ── Step 1: type confirmation phrase ──────────────────────────────────
        <>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            You are about to permanently delete the account associated with:
          </Text>
          <View style={[styles.emailPill, { backgroundColor: colors.dangerDim, borderColor: colors.danger + "30" }]}>
            <Ionicons name="mail-outline" size={15} color={colors.danger} />
            <Text style={[styles.emailPillText, { color: colors.danger }]}>{user.email}</Text>
          </View>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            This will erase all your data from BinRo's servers. There is no recovery.
          </Text>
          <Text style={[styles.instruction, { color: colors.textSecondary }]}>
            To confirm, type exactly:{" "}
            <Text style={[styles.phrase, { color: colors.danger }]}>{CONFIRM_PHRASE}</Text>
          </Text>
          <TextInput
            style={[
              styles.input,
              { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder, color: colors.text },
              isConfirmMatch && { borderColor: colors.danger, backgroundColor: colors.dangerDim },
            ]}
            placeholder={CONFIRM_PHRASE}
            placeholderTextColor={colors.textMuted}
            value={confirmText}
            onChangeText={setConfirmText}
            autoCapitalize="characters"
            autoCorrect={false}
            editable={!deleting}
          />
          <Pressable
            onPress={handleDeleteAccount}
            disabled={!isConfirmMatch || deleting}
            style={({ pressed }) => [
              styles.deleteBtn,
              { backgroundColor: colors.danger, opacity: !isConfirmMatch || deleting ? 0.4 : pressed ? 0.85 : 1 },
            ]}
          >
            {deleting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.deleteBtnText}>Permanently Delete Account</Text>
              </>
            )}
          </Pressable>
          <Pressable onPress={handleClose} disabled={deleting} style={[styles.cancelBtn, { opacity: deleting ? 0.4 : 1 }]}>
            <Text style={[styles.cancelBtnText, { color: colors.primary }]}>Cancel — Keep My Account</Text>
          </Pressable>
        </>
      ) : isGoogleUser ? (
        // ── Step 2 (Google): instruct user to re-sign-in ──────────────────────
        <>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            For your security, Google requires you to sign in again before deleting your account.
          </Text>
          <View style={[styles.infoPill, { backgroundColor: colors.primaryDim, borderColor: colors.primary + "30" }]}>
            <Ionicons name="logo-google" size={16} color={colors.primary} />
            <Text style={[styles.infoPillText, { color: colors.primary }]}>
              Sign out, then sign back in with Google, and try again.
            </Text>
          </View>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            Your data has not been deleted. Once you sign back in, return here to complete account deletion.
          </Text>
          <Pressable
            onPress={handleClose}
            style={({ pressed }) => [styles.deleteBtn, { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.deleteBtnText}>OK, I'll Sign In Again</Text>
          </Pressable>
        </>
      ) : (
        // ── Step 2 (password): re-auth with password ──────────────────────────
        <>
          <Text style={[styles.body, { color: colors.textSecondary }]}>
            For your security, please re-enter your password before deleting your account.
          </Text>
          <Text style={[styles.instruction, { color: colors.textSecondary }]}>
            Password for {user.email}
          </Text>
          <View style={styles.passwordRow}>
            <TextInput
              style={[styles.input, { flex: 1, marginBottom: 0, backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder, color: colors.text }]}
              placeholder="Enter your password"
              placeholderTextColor={colors.textMuted}
              value={password}
              onChangeText={setPassword}
              secureTextEntry={!showPassword}
              autoCapitalize="none"
              autoCorrect={false}
              editable={!deleting}
            />
            <Pressable
              onPress={() => setShowPassword((v) => !v)}
              style={[styles.eyeBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}
            >
              <Ionicons
                name={showPassword ? "eye-off-outline" : "eye-outline"}
                size={20}
                color={colors.textMuted}
              />
            </Pressable>
          </View>
          <Pressable
            onPress={handleDeleteAccount}
            disabled={!password.trim() || deleting}
            style={({ pressed }) => [
              styles.deleteBtn,
              { backgroundColor: colors.danger, marginTop: 16, opacity: !password.trim() || deleting ? 0.4 : pressed ? 0.85 : 1 },
            ]}
          >
            {deleting ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <>
                <Ionicons name="trash-outline" size={18} color="#fff" />
                <Text style={styles.deleteBtnText}>Confirm & Delete Account</Text>
              </>
            )}
          </Pressable>
          <Pressable
            onPress={handleClose}
            disabled={deleting}
            style={[styles.cancelBtn, { opacity: deleting ? 0.4 : 1 }]}
          >
            <Text style={[styles.cancelBtnText, { color: colors.primary }]}>Cancel — Keep My Account</Text>
          </Pressable>
        </>
      )}
    </BottomSheet>
  );
}

const styles = StyleSheet.create({
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14 },
  titleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  title: { fontSize: 18, fontFamily: "Inter_700Bold" },
  closeBtn: { width: 34, height: 34, borderRadius: 17, alignItems: "center", justifyContent: "center" },
  body: { fontSize: 14, fontFamily: "Inter_400Regular", lineHeight: 21, marginBottom: 12 },
  emailPill: {
    flexDirection: "row", alignItems: "center", gap: 8,
    borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1,
  },
  emailPillText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
  infoPill: {
    flexDirection: "row", alignItems: "flex-start", gap: 10,
    borderRadius: 10, padding: 12, marginBottom: 14, borderWidth: 1,
  },
  infoPillText: { fontSize: 13, fontFamily: "Inter_500Medium", flex: 1, lineHeight: 19 },
  instruction: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8 },
  phrase: { fontFamily: "Inter_700Bold" },
  input: {
    borderRadius: 12, borderWidth: 1.5,
    padding: 14, fontSize: 15, fontFamily: "Inter_600SemiBold",
    marginBottom: 16, letterSpacing: 1,
  },
  passwordRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 0 },
  eyeBtn: { width: 46, height: 50, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1.5 },
  deleteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    paddingVertical: 16, borderRadius: 14, marginBottom: 10,
  },
  deleteBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#FFFFFF" },
  cancelBtn: { alignItems: "center", paddingVertical: 12, marginBottom: 4 },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
