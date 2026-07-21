import {
  View, Text, StyleSheet, Pressable,
  TextInput, ActivityIndicator, Alert,
} from "react-native";
import { useState, useRef, useEffect } from "react";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "@/shared/utils/haptics";
import { useTheme } from "@/shared/contexts/ThemeContext";
import { useAuth } from "@/shared/contexts/AuthContext";
import { deleteUserAccount } from "@/lib/firestore-service";
import { authAdapter } from "@/lib/auth";
import BottomSheet from "@/shared/components/ui/BottomSheet";

interface DeleteAccountModalProps {
  visible: boolean;
  onClose: () => void;
}

const CONFIRM_PHRASE = "DELETE MY ACCOUNT";

// ── Helpers ──────────────────────────────────────────────────────────────────

function isNetworkError(e: any): boolean {
  const msg = (e?.message || "").toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("offline") ||
    msg.includes("timeout") ||
    e?.code === "auth/network-request-failed"
  );
}

function isGoogleProvider(): boolean {
  return authAdapter.getProviderIds().includes("google.com");
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function DeleteAccountModal({ visible, onClose }: DeleteAccountModalProps) {
  const { colors } = useTheme();
  const { user, signOut } = useAuth();

  const [confirmText,   setConfirmText]   = useState("");
  const [password,      setPassword]      = useState("");
  const [showPassword,  setShowPassword]  = useState(false);
  const [deleting,      setDeleting]      = useState(false);
  // step 1 = confirm phrase  /  step 2 = re-auth (email/password or Google notice)
  const [step, setStep] = useState<1 | 2>(1);

  const isConfirmMatch = confirmText.trim().toUpperCase() === CONFIRM_PHRASE;

  // Prevent duplicate taps or re-entry while a deletion is in progress.
  const deleteInFlightRef = useRef(false);
  // Prevent async state updates after the sheet unmounts.
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  // Reset the form whenever the sheet becomes visible.
  useEffect(() => {
    if (visible) {
      setConfirmText("");
      setPassword("");
      setShowPassword(false);
      setStep(1);
      deleteInFlightRef.current = false;
    }
  }, [visible]);

  function handleClose() {
    if (deleting) return; // don't allow close mid-deletion
    setConfirmText("");
    setPassword("");
    setStep(1);
    onClose();
  }

  // ── Core deletion logic ───────────────────────────────────────────────────
  //
  // Order (prevents partial deletion):
  //   1. Optional password re-authentication — fail fast if wrong
  //   2. authAdapter.deleteUser  — requires recent auth; fails before any data is touched
  //   3. deleteUserAccount       — marks Firestore isDeleted, kicks off background cleanup
  //   4. signOut                 — clears local session
  //
  // If step 2 fails (requires-recent-login) we advance to step 2 UI and leave
  // Firestore untouched.  If step 3 fails the auth account is already gone so
  // the user effectively cannot sign back in — we still navigate away cleanly.
  async function handleDeleteAccount() {
    if (!user) return;
    if (!isConfirmMatch && step === 1) return;
    if (deleteInFlightRef.current) return;
    deleteInFlightRef.current = true;

    if (mountedRef.current) setDeleting(true);

    try {
      const currentUser = authAdapter.getCurrentUser();
      if (!currentUser) throw new Error("No authenticated user found.");

      // ── Step 1 optional: reauthenticate with password ─────────────────────
      // Only attempt if the user actually provided a password in step 2.
      // Any reauthentication failure is surfaced immediately — we never swallow
      // it and proceed with a stale session.
      if (step === 2 && password.trim() && currentUser.email) {
        try {
          await authAdapter.reauthenticate(currentUser, currentUser.email, password.trim());
        } catch (reAuthErr: any) {
          if (mountedRef.current) setDeleting(false);
          deleteInFlightRef.current = false;
          if (reAuthErr?.code === "auth/wrong-password" || reAuthErr?.code === "auth/invalid-credential") {
            Alert.alert("Wrong Password", "The password you entered is incorrect. Please try again.");
          } else if (isNetworkError(reAuthErr)) {
            Alert.alert("No Connection", "Could not verify your identity. Please check your internet connection and try again.");
          } else {
            Alert.alert("Authentication Failed", reAuthErr?.message || "Could not verify your identity. Please try again.");
          }
          return;
        }
      }

      // ── Step 2: delete the Firebase Auth account ──────────────────────────
      // Must happen before any Firestore writes so that a requires-recent-login
      // error leaves all data intact.
      try {
        await authAdapter.deleteUser(currentUser);
      } catch (authErr: any) {
        if (mountedRef.current) setDeleting(false);
        deleteInFlightRef.current = false;
        if (authErr?.code === "auth/requires-recent-login") {
          // Advance to re-auth UI — Firestore is still untouched.
          if (mountedRef.current) setStep(2);
          return;
        }
        if (isNetworkError(authErr)) {
          Alert.alert("No Connection", "Your account could not be deleted. Please check your internet connection and try again.");
          return;
        }
        Alert.alert("Could Not Delete Account", authErr?.message || "Account deletion failed. Please try again later.");
        return;
      }

      // ── Step 3: Firestore / Storage cleanup ───────────────────────────────
      // Non-blocking failures are acceptable here: the auth account is gone so
      // the user cannot sign back in.  The background cleanup in deleteUserAccount
      // is intentionally fire-and-forget.
      try {
        await deleteUserAccount(user.id);
      } catch {
        // Firestore cleanup failed but auth account is already deleted — proceed
        // with sign-out so the user is not left in a broken signed-in state.
      }

      // ── Step 4: sign out and navigate ─────────────────────────────────────
      try {
        await signOut();
      } catch {
        // signOut failure after auth account deletion is non-fatal; Firebase
        // will eventually clear the stale token.
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate before resetting form state to avoid setting state after unmount.
      router.replace("/(tabs)/" as any);

      // Reset form only if still mounted (e.g. the sheet didn't unmount with navigation).
      if (mountedRef.current) {
        setConfirmText("");
        setPassword("");
        setStep(1);
        onClose();
      }

    } catch (e: any) {
      // Catch-all for unexpected errors not handled above.
      if (mountedRef.current) {
        setDeleting(false);
        deleteInFlightRef.current = false;
      }
      if (isNetworkError(e)) {
        Alert.alert("No Connection", "Your account could not be deleted. Please check your internet connection and try again.");
      } else {
        Alert.alert("Error", e?.message || "Could not delete account. Please try again.");
      }
    } finally {
      // Ensure deleting is reset on every code path, including unexpected ones.
      if (mountedRef.current) {
        setDeleting(false);
        deleteInFlightRef.current = false;
      }
    }
  }

  if (!user) return null;

  const isGoogleUser = isGoogleProvider();

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
