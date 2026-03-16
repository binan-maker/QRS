import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Pressable,
  Platform,
  Alert,
  TextInput,
  ActivityIndicator,
  Modal,
} from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useState } from "react";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { useAuth } from "@/contexts/AuthContext";
import { deleteUserAccount } from "@/lib/firestore-service";
import { firebaseAuth } from "@/lib/firebase";
import { deleteUser, EmailAuthProvider, reauthenticateWithCredential } from "firebase/auth";

export default function AccountManagementScreen() {
  const { user, signOut } = useAuth();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const [deleteModal, setDeleteModal] = useState(false);
  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);

  const CONFIRM_PHRASE = "DELETE MY ACCOUNT";
  const isConfirmMatch = confirmText.trim().toUpperCase() === CONFIRM_PHRASE;

  function openDeleteModal() {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setDeleteModal(true);
    setStep(1);
    setConfirmText("");
    setPassword("");
  }

  function closeDeleteModal() {
    setDeleteModal(false);
    setConfirmText("");
    setPassword("");
    setStep(1);
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
          } catch {
          }
        }
        await deleteUserAccount(user.id);
        await deleteUser(currentUser);
      }
      await signOut();
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      closeDeleteModal();
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

  if (!user) {
    return (
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.navBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
          </Pressable>
          <Text style={styles.navTitle}>Account Management</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={styles.center}>
          <Ionicons name="person-outline" size={52} color={Colors.dark.textMuted} />
          <Text style={styles.emptyTitle}>Not signed in</Text>
          <Text style={styles.emptySub}>Sign in to manage your account</Text>
          <Pressable onPress={() => router.push("/(auth)/login")} style={styles.signInBtn}>
            <Text style={styles.signInBtnText}>Sign In</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <>
      <View style={[styles.container, { paddingTop: topInset }]}>
        <View style={styles.navBar}>
          <Pressable onPress={() => router.back()} style={styles.backBtn}>
            <Ionicons name="chevron-back" size={24} color={Colors.dark.text} />
          </Pressable>
          <Text style={styles.navTitle}>Account Management</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 40 }]}
        >
          <View style={styles.profileCard}>
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>
                {user.displayName?.charAt(0)?.toUpperCase() || "?"}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={styles.profileName}>{user.displayName}</Text>
              <Text style={styles.profileEmail}>{user.email}</Text>
            </View>
            <View style={styles.verifiedBadge}>
              <Ionicons name="checkmark-circle" size={20} color={Colors.dark.safe} />
              <Text style={styles.verifiedText}>Verified</Text>
            </View>
          </View>

          <View style={styles.infoSection}>
            <Text style={styles.infoLabel}>ACCOUNT DETAILS</Text>
            <View style={styles.infoCard}>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={18} color={Colors.dark.textMuted} />
                <Text style={styles.infoKey}>Display Name</Text>
                <Text style={styles.infoVal} numberOfLines={1}>{user.displayName}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={18} color={Colors.dark.textMuted} />
                <Text style={styles.infoKey}>Email Address</Text>
                <Text style={styles.infoVal} numberOfLines={1}>{user.email}</Text>
              </View>
              <View style={styles.infoDivider} />
              <View style={styles.infoRow}>
                <Ionicons name="shield-checkmark-outline" size={18} color={Colors.dark.textMuted} />
                <Text style={styles.infoKey}>Account ID</Text>
                <Text style={[styles.infoVal, { fontSize: 11, fontFamily: "Inter_400Regular" }]} numberOfLines={1}>
                  {user.id}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.dangerSection}>
            <Text style={styles.dangerLabel}>DANGER ZONE</Text>

            <View style={styles.dangerCard}>
              <View style={styles.dangerHeader}>
                <View style={styles.dangerIconWrap}>
                  <Ionicons name="warning-outline" size={20} color={Colors.dark.danger} />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.dangerTitle}>Delete Account</Text>
                  <Text style={styles.dangerSub}>This action is permanent and cannot be undone</Text>
                </View>
              </View>

              <View style={styles.dangerConsequences}>
                <Text style={styles.dangerConseqTitle}>What will be deleted:</Text>
                {[
                  "Your profile and display name",
                  "All QR codes you generated",
                  "Your scan history and favourites",
                  "All your comments and reports",
                  "Your followers and following relationships",
                  "All notifications and messages",
                ].map((item, i) => (
                  <View key={i} style={styles.conRow}>
                    <Ionicons name="close-circle" size={14} color={Colors.dark.danger} />
                    <Text style={styles.conText}>{item}</Text>
                  </View>
                ))}
              </View>

              <Pressable
                onPress={openDeleteModal}
                style={({ pressed }) => [styles.deleteBtn, { opacity: pressed ? 0.85 : 1 }]}
              >
                <Ionicons name="person-remove-outline" size={18} color="#fff" />
                <Text style={styles.deleteBtnText}>Delete My Account</Text>
              </Pressable>
            </View>
          </View>
        </ScrollView>
      </View>

      <Modal visible={deleteModal} transparent animationType="slide" onRequestClose={closeDeleteModal}>
        <Pressable style={styles.modalOverlay} onPress={closeDeleteModal}>
          <Pressable style={styles.modalBox} onPress={() => {}}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleRow}>
                <Ionicons name="warning" size={20} color={Colors.dark.danger} />
                <Text style={styles.modalTitle}>
                  {step === 1 ? "Confirm Deletion" : "Re-authentication Required"}
                </Text>
              </View>
              <Pressable onPress={closeDeleteModal} style={styles.modalClose}>
                <Ionicons name="close" size={22} color={Colors.dark.textMuted} />
              </Pressable>
            </View>

            {step === 1 ? (
              <>
                <Text style={styles.modalBody}>
                  You are about to permanently delete the account associated with:
                </Text>
                <View style={styles.emailPill}>
                  <Ionicons name="mail-outline" size={15} color={Colors.dark.danger} />
                  <Text style={styles.emailPillText}>{user.email}</Text>
                </View>
                <Text style={styles.modalBody}>
                  This will erase all your data from QR Guard's servers. There is no recovery.
                </Text>
                <Text style={styles.confirmInstruction}>
                  To confirm, type exactly: <Text style={styles.confirmPhrase}>{CONFIRM_PHRASE}</Text>
                </Text>
                <TextInput
                  style={[styles.confirmInput, isConfirmMatch && styles.confirmInputValid]}
                  placeholder={CONFIRM_PHRASE}
                  placeholderTextColor={Colors.dark.textMuted}
                  value={confirmText}
                  onChangeText={setConfirmText}
                  autoCapitalize="characters"
                  autoCorrect={false}
                />
                <Pressable
                  onPress={handleDeleteAccount}
                  disabled={!isConfirmMatch || deleting}
                  style={({ pressed }) => [
                    styles.modalDeleteBtn,
                    { opacity: !isConfirmMatch || deleting ? 0.4 : pressed ? 0.85 : 1 },
                  ]}
                >
                  {deleting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={18} color="#fff" />
                      <Text style={styles.modalDeleteBtnText}>Permanently Delete Account</Text>
                    </>
                  )}
                </Pressable>
                <Pressable onPress={closeDeleteModal} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancel — Keep My Account</Text>
                </Pressable>
              </>
            ) : (
              <>
                <Text style={styles.modalBody}>
                  For your security, Firebase requires you to re-enter your password before deleting your account.
                </Text>
                <Text style={styles.confirmInstruction}>Password for {user.email}</Text>
                <View style={styles.passwordRow}>
                  <TextInput
                    style={[styles.confirmInput, { flex: 1 }]}
                    placeholder="Enter your password"
                    placeholderTextColor={Colors.dark.textMuted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  <Pressable onPress={() => setShowPassword(!showPassword)} style={styles.eyeBtn}>
                    <Ionicons
                      name={showPassword ? "eye-off-outline" : "eye-outline"}
                      size={20}
                      color={Colors.dark.textMuted}
                    />
                  </Pressable>
                </View>
                <Pressable
                  onPress={handleDeleteAccount}
                  disabled={!password.trim() || deleting}
                  style={({ pressed }) => [
                    styles.modalDeleteBtn,
                    { opacity: !password.trim() || deleting ? 0.4 : pressed ? 0.85 : 1 },
                  ]}
                >
                  {deleting ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <>
                      <Ionicons name="trash-outline" size={18} color="#fff" />
                      <Text style={styles.modalDeleteBtnText}>Confirm & Delete Account</Text>
                    </>
                  )}
                </Pressable>
                <Pressable onPress={closeDeleteModal} style={styles.cancelBtn}>
                  <Text style={styles.cancelBtnText}>Cancel — Keep My Account</Text>
                </Pressable>
              </>
            )}
          </Pressable>
        </Pressable>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.dark.background },
  navBar: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.dark.surfaceBorder,
  },
  navTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.dark.text, flex: 1, textAlign: "center" },
  backBtn: {
    width: 40, height: 40, borderRadius: 20,
    backgroundColor: Colors.dark.surface, alignItems: "center", justifyContent: "center",
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder,
  },
  scrollContent: { padding: 20 },
  center: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40, gap: 12 },
  emptyTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  emptySub: { fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, textAlign: "center" },
  signInBtn: {
    backgroundColor: Colors.dark.primary, paddingHorizontal: 32, paddingVertical: 14, borderRadius: 14, marginTop: 8,
  },
  signInBtnText: { fontSize: 15, fontFamily: "Inter_700Bold", color: "#000" },

  profileCard: {
    flexDirection: "row", alignItems: "center", gap: 14,
    backgroundColor: Colors.dark.surface, borderRadius: 18, padding: 18,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder, marginBottom: 20,
  },
  avatar: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: Colors.dark.primaryDim, borderWidth: 2, borderColor: Colors.dark.primary + "60",
    alignItems: "center", justifyContent: "center",
  },
  avatarText: { fontSize: 22, fontFamily: "Inter_700Bold", color: Colors.dark.primary },
  profileName: { fontSize: 16, fontFamily: "Inter_600SemiBold", color: Colors.dark.text },
  profileEmail: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary, marginTop: 2 },
  verifiedBadge: { alignItems: "center", gap: 3 },
  verifiedText: { fontSize: 10, fontFamily: "Inter_500Medium", color: Colors.dark.safe },

  infoSection: { marginBottom: 24 },
  infoLabel: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted,
    letterSpacing: 1, marginBottom: 10, paddingLeft: 4,
  },
  infoCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 16,
    borderWidth: 1, borderColor: Colors.dark.surfaceBorder, overflow: "hidden",
  },
  infoRow: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14 },
  infoKey: { fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.dark.textSecondary, width: 110 },
  infoVal: { flex: 1, fontSize: 13, fontFamily: "Inter_600SemiBold", color: Colors.dark.text, textAlign: "right" },
  infoDivider: { height: 1, backgroundColor: Colors.dark.surfaceBorder, marginLeft: 46 },

  dangerSection: { marginBottom: 20 },
  dangerLabel: {
    fontSize: 11, fontFamily: "Inter_600SemiBold", color: Colors.dark.danger,
    letterSpacing: 1, marginBottom: 10, paddingLeft: 4,
  },
  dangerCard: {
    backgroundColor: Colors.dark.surface, borderRadius: 16,
    borderWidth: 1.5, borderColor: Colors.dark.danger + "40", overflow: "hidden",
  },
  dangerHeader: {
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    padding: 18, borderBottomWidth: 1, borderBottomColor: Colors.dark.danger + "20",
    backgroundColor: Colors.dark.dangerDim,
  },
  dangerIconWrap: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: Colors.dark.danger + "20", alignItems: "center", justifyContent: "center",
  },
  dangerTitle: { fontSize: 16, fontFamily: "Inter_700Bold", color: Colors.dark.danger, marginBottom: 2 },
  dangerSub: { fontSize: 12, fontFamily: "Inter_400Regular", color: Colors.dark.danger + "AA" },
  dangerConsequences: { padding: 18, gap: 8 },
  dangerConseqTitle: { fontSize: 12, fontFamily: "Inter_600SemiBold", color: Colors.dark.textMuted, marginBottom: 4 },
  conRow: { flexDirection: "row", alignItems: "center", gap: 10 },
  conText: { fontSize: 13, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary },
  deleteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.dark.danger, margin: 18, marginTop: 0,
    paddingVertical: 16, borderRadius: 14,
  },
  deleteBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },

  modalOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.75)", justifyContent: "flex-end" },
  modalBox: {
    backgroundColor: Colors.dark.surface,
    borderTopLeftRadius: 26, borderTopRightRadius: 26,
    padding: 24, paddingBottom: 40,
    borderTopWidth: 1.5, borderColor: Colors.dark.danger + "50",
  },
  modalHeader: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginBottom: 14,
  },
  modalTitleRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  modalTitle: { fontSize: 18, fontFamily: "Inter_700Bold", color: Colors.dark.text },
  modalClose: {
    width: 34, height: 34, borderRadius: 17,
    backgroundColor: Colors.dark.surfaceLight, alignItems: "center", justifyContent: "center",
  },
  modalBody: {
    fontSize: 14, fontFamily: "Inter_400Regular", color: Colors.dark.textSecondary,
    lineHeight: 21, marginBottom: 12,
  },
  emailPill: {
    flexDirection: "row", alignItems: "center", gap: 8,
    backgroundColor: Colors.dark.dangerDim, borderRadius: 10,
    padding: 12, marginBottom: 14,
    borderWidth: 1, borderColor: Colors.dark.danger + "30",
  },
  emailPillText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.danger },
  confirmInstruction: {
    fontSize: 13, fontFamily: "Inter_500Medium", color: Colors.dark.textSecondary, marginBottom: 8,
  },
  confirmPhrase: { fontFamily: "Inter_700Bold", color: Colors.dark.danger },
  confirmInput: {
    backgroundColor: Colors.dark.surfaceLight, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.dark.surfaceBorder,
    padding: 14, fontSize: 15, fontFamily: "Inter_600SemiBold",
    color: Colors.dark.text, marginBottom: 16, letterSpacing: 1,
  },
  confirmInputValid: { borderColor: Colors.dark.danger, backgroundColor: Colors.dark.dangerDim },
  passwordRow: { flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 16 },
  eyeBtn: {
    width: 46, height: 50, alignItems: "center", justifyContent: "center",
    backgroundColor: Colors.dark.surfaceLight, borderRadius: 12,
    borderWidth: 1.5, borderColor: Colors.dark.surfaceBorder,
  },
  modalDeleteBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 10,
    backgroundColor: Colors.dark.danger, paddingVertical: 16, borderRadius: 14, marginBottom: 10,
  },
  modalDeleteBtnText: { fontSize: 16, fontFamily: "Inter_700Bold", color: "#fff" },
  cancelBtn: { alignItems: "center", paddingVertical: 12 },
  cancelBtnText: { fontSize: 14, fontFamily: "Inter_600SemiBold", color: Colors.dark.primary },
});
