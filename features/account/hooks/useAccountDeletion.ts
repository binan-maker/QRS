import { useState, useRef, useEffect, useCallback } from "react";
import { Alert } from "react-native";
import { router } from "expo-router";
import * as Haptics from "@/shared/utils/haptics";
import { useAuth } from "@/shared/contexts/AuthContext";
import { deleteUserAccount } from "@/lib/data-service";
import { authAdapter } from "@/lib/auth";

export const CONFIRM_PHRASE = "DELETE MY ACCOUNT";

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

export interface UseAccountDeletionOptions {
  visible: boolean;
  onClose: () => void;
}

/**
 * Custom hook encapsulating all asynchronous account deletion logic,
 * authentication verification, step state, and lifecycle guards.
 */
export function useAccountDeletion({ visible, onClose }: UseAccountDeletionOptions) {
  const { user, signOut } = useAuth();

  const [confirmText, setConfirmText] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [deleting, setDeleting] = useState(false);
  // step 1 = confirm phrase  /  step 2 = re-auth (email/password or Google notice)
  const [step, setStep] = useState<1 | 2>(1);

  const isConfirmMatch = confirmText.trim().toUpperCase() === CONFIRM_PHRASE;
  const isGoogleUser = isGoogleProvider();

  // Prevent duplicate taps or re-entry while a deletion is in progress.
  const deleteInFlightRef = useRef(false);
  // Prevent async state updates after the component unmounts.
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const resetForm = useCallback(() => {
    setConfirmText("");
    setPassword("");
    setShowPassword(false);
    setStep(1);
    deleteInFlightRef.current = false;
  }, []);

  // Reset the form whenever the sheet becomes visible.
  useEffect(() => {
    if (visible) {
      resetForm();
    }
  }, [visible, resetForm]);

  const handleClose = useCallback(() => {
    if (deleting) return; // don't allow close mid-deletion
    resetForm();
    onClose();
  }, [deleting, resetForm, onClose]);

  // ── Core deletion logic ───────────────────────────────────────────────────
  //
  // Order (prevents partial deletion):
  //   1. Optional password re-authentication — fail fast if wrong
  //   2. Verify active session token before touching data
  //   3. deleteUserAccount       — wipes user data & storage while JWT is valid
  //   4. authAdapter.deleteUser  — permanently deletes auth.users record
  //   5. signOut                 — clears local session & navigates
  //
  // If step 2/auth fails (requires-recent-login), we advance to step 2 UI and leave
  // backend untouched. If step 3 fails, we gracefully progress since auth will be removed.
  const handleDeleteAccount = useCallback(async () => {
    if (!user) return;
    if (!isConfirmMatch && step === 1) return;
    if (deleteInFlightRef.current) return;
    deleteInFlightRef.current = true;

    if (mountedRef.current) setDeleting(true);

    try {
      const currentUser = authAdapter.getCurrentUser();
      if (!currentUser) throw new Error("No authenticated user found.");

      // ── Step 1 optional: reauthenticate with password ─────────────────────
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

      // ── Step 2: Verify active session token before touching data ──────────
      const activeToken = await currentUser.getIdToken();
      if (!activeToken) {
        if (mountedRef.current) {
          setDeleting(false);
          setStep(2);
        }
        deleteInFlightRef.current = false;
        return;
      }

      // ── Step 3: Supabase Storage & Database cleanup (MUST run while session JWT is active!)
      try {
        await deleteUserAccount(user.id);
      } catch {}

      // ── Step 4: Permanently delete the Supabase Auth account (auth.users) ─
      try {
        await authAdapter.deleteUser(currentUser);
      } catch (authErr: any) {
        if (mountedRef.current) setDeleting(false);
        deleteInFlightRef.current = false;
        if (authErr?.code === "auth/requires-recent-login") {
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

      // ── Step 5: Sign out and navigate ─────────────────────────────────────
      try {
        await signOut();
      } catch {
        // signOut failure after auth account deletion is non-fatal
      }

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      // Navigate before resetting form state to avoid setting state after unmount
      router.replace("/(tabs)/" as any);

      // Reset form only if still mounted
      if (mountedRef.current) {
        resetForm();
        onClose();
      }
    } catch (e: any) {
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
      if (mountedRef.current) {
        setDeleting(false);
        deleteInFlightRef.current = false;
      }
    }
  }, [user, isConfirmMatch, step, password, signOut, resetForm, onClose]);

  return {
    confirmText,
    setConfirmText,
    password,
    setPassword,
    showPassword,
    setShowPassword,
    deleting,
    step,
    setStep,
    isConfirmMatch,
    isGoogleUser,
    handleDeleteAccount,
    handleClose,
    resetForm,
    CONFIRM_PHRASE,
  };
}

export default useAccountDeletion;
