import {
  View, Text, StyleSheet, Modal, Pressable,
  TextInput, ActivityIndicator, Alert,
} from "react-native";
import { useState } from "react";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { useTheme } from "@/contexts/ThemeContext";
import { useAuth } from "@/contexts/AuthContext";
import { deleteUserAccount } from "@/lib/firestore-service";
import { firebaseAuth } from "@/lib/firebase";
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
}

const CONFIRM_PHRASE = "DELETE MY ACCOUNT";

export default function DeleteAccountModal({ visible, onClose }: DeleteAccountModalProps) {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const isConfirmMatch = confirmText.trim().toUpperCase() === CONFIRM_PHRASE;

  function handleClose() {
    setConfirmText("");
    setPassword("");
    setStep(1);
    onClose();
  }

  async function handleDeleteAccount() {
    if (!user || !isConfirmMatch) return;
    setDeleting(true);
    try {
      const currentUser = firebaseAuth.currentUser;
      if (currentUser) {
        if (password.trim() && currentUser.email) {
          try {
            const credential = EmailAuthProvider.credential(currentUser.email, password);
            await reauthenticateWithCredential(currentUser, credential);
          } catch {}
        }
        await deleteUserAccount(user.id);
        await deleteUser(currentUser);
      }
      await signOut();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      handleClose();
    } catch (e: any) {
      if (e.code === "auth/requires-recent-login") {
        setStep(2);
      } else if (e.code === "auth/wrong-password" || e.code === "auth/invalid-credential") {
        Alert.alert("Wrong Password", "The password you entered is incorrect. Please try again.");
      } else {
        Alert.alert("Error", e.message || "Could not delete account. Please try again.");
      }
    } finally {
      setDeleting(false);
    }
  }

  if (!user) return null;

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <Pressable style={styles.overlay} onPress={handleClose}>
        <Pressable style={[styles.box, { backgroundColor: colors.surface, borderColor: colors.danger + "50" }]} onPress={() => {}}>
          <View style={styles.header}>
            <View style={styles.titleRow}>
              <Ionicons name="warning" size={20} color={colors.danger} />
              <Text style={[styles.title, { color: colors.text }]}>
                {step === 1 ? "Confirm Deletion" : "Re-authentication Required"}
              </Text>
            </View>
            <Pressable onPress={handleClose} style={[styles.closeBtn, { backgroundColor: colors.surfaceLight }]}>
              <Ionicons name="close" size={22} color={colors.textMuted} />
            </Pressable>
          </View>

          {step === 1 ? (
            <>
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                You are about to permanently delete the account associated with:
              </Text>
              <View style={[styles.emailPill, { backgroundColor: colors.dangerDim, borderColor: colors.danger + "30" }]}>
                <Ionicons name="mail-outline" size={15} color={colors.danger} />
                <Text style={[styles.emailPillText, { color: colors.danger }]}>{user.email}</Text>
              </View>
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                This will erase all your data from QR Guard's servers. There is no recovery.
              </Text>
              <Text style={[styles.instruction, { color: colors.textSecondary }]}>
                To confirm, type exactly: <Text style={[styles.phrase, { color: colors.danger }]}>{CONFIRM_PHRASE}</Text>
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
              <Pressable onPress={handleClose} style={styles.cancelBtn}>
                <Text style={[styles.cancelBtnText, { color: colors.primary }]}>Cancel — Keep My Account</Text>
              </Pressable>
            </>
          ) : (
            <>
              <Text style={[styles.body, { color: colors.textSecondary }]}>
                For your security, Firebase requires you to re-enter your password before deleting your account.
              </Text>
              <Text style={[styles.instruction, { color: colors.textSecondary }]}>Password for {user.email}</Text>
              <View style={styles.passwordRow}>
                <TextInput
                  style={[styles.input, { flex: 1, backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder, color: colors.text }]}
                  placeholder="Enter your password"
                  placeholderTextColor={colors.textMuted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry={!showPassword}
                  autoCapitalize="none"
                  autoCorrect={false}
                />
                <Pressable onPress={() => setShowPassword(!showPassword)} style={[styles.eyeBtn, { backgroundColor: colors.surfaceLight, borderColor: colors.surfaceBorder }]}>
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
                  { backgroundColor: colors.danger, opacity: !password.trim() || deleting ? 0.4 : pressed ? 0.85 : 1 },
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
              <Pressable onPress={handleClose} style={styles.cancelBtn}>
                <Text style={[styles.cancelBtnText, { color: colors.primary }]}>Cancel — Keep My Account</Text>
              </Pressable>
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  box: {
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 24, paddingBottom: 40, borderTopWidth: 1.5,
  },
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
  instruction: { fontSize: 13, fontFamily: "Inter_500Medium", marginBottom: 8 },
  phrase: { fontFamily: "Inter_700Bold" },
  input: {
    borderRadius: 12, borderWidth: 1.5,
    padding: 14, fontSize: 15, fontFamily: "Inter_600SemiBold",
    marginBottom: 16, letterSpacing: 1,
  },
  passwordRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  eyeBtn: { width: 46, height: 50, alignItems: "center", justifyContent: "center", borderRadius: 12, borderWidth: 1.5 },
  deleteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    paddingVertical: 16, borderRadius: 14, marginBottom: 10,
  },
  deleteBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  cancelBtn: { alignItems: "center", paddingVertical: 12 },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold" },
});
