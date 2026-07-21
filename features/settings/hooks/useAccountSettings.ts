import { useState, useCallback, useRef } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "@/shared/utils/haptics";
import { router } from "expo-router";
import { authAdapter } from "@/lib/auth";
import { deleteUserAccount } from "@/lib/firestore-service";

interface UseAccountSettingsOptions {
  userId: string | undefined;
  signOut: () => Promise<void>;
}

function isNetworkError(e: any): boolean {
  const msg = (e?.message || "").toLowerCase();
  return (
    msg.includes("network") ||
    msg.includes("offline") ||
    msg.includes("timeout") ||
    e?.code === "auth/network-request-failed"
  );
}

export function useAccountSettings({ userId, signOut }: UseAccountSettingsOptions) {
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // Prevent duplicate in-flight delete requests from the Settings AccountSection.
  const deleteInFlightRef = useRef(false);

  const resetAccount = useCallback(() => {
    setDeleteConfirmText("");
    deleteInFlightRef.current = false;
  }, []);

  const handleSignOut = useCallback(async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out", style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace("/(tabs)/" as any);
          } catch (e: any) {
            Alert.alert("Sign Out Failed", e?.message || "Could not sign out. Please try again.");
          }
        },
      },
    ]);
  }, [signOut]);

  const handleClearData = useCallback(async () => {
    Alert.alert("Clear All Data", "This will remove all locally stored data including scan history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear", style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("local_scan_history");
          if (userId) await AsyncStorage.removeItem(`local_scan_history_${userId}`);
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Cleared", "Local data has been cleared.");
        },
      },
    ]);
  }, [userId]);

  // ── Account deletion ────────────────────────────────────────────────────────
  //
  // Deletion order (prevents partial deletion):
  //   1. authAdapter.deleteUser — requires recent auth, fails before any data is touched
  //   2. deleteUserAccount      — Firestore isDeleted flag + background cleanup
  //   3. signOut                — clears local session
  //
  // If step 1 fails with auth/requires-recent-login the user is told to sign
  // out and back in — the full DeleteAccountModal (used in account-management.tsx)
  // handles the multi-step re-auth flow more gracefully.
  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirmText.toLowerCase() !== "delete") {
      Alert.alert("Confirmation Required", 'Please type "delete" to confirm account deletion.');
      return;
    }
    if (deleteInFlightRef.current) return;

    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all associated data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever", style: "destructive",
          onPress: async () => {
            if (deleteInFlightRef.current) return;
            deleteInFlightRef.current = true;
            try {
              if (!userId) throw new Error("No user session found.");

              const currentUser = authAdapter.getCurrentUser();
              if (!currentUser) throw new Error("No authenticated user found.");

              // Step 1: delete Firebase Auth account (fail fast before touching data)
              try {
                await authAdapter.deleteUser(currentUser);
              } catch (authErr: any) {
                deleteInFlightRef.current = false;
                if (authErr?.code === "auth/requires-recent-login") {
                  Alert.alert(
                    "Re-authentication Required",
                    "For your security, please sign out and sign back in before deleting your account. Your data has not been deleted."
                  );
                } else if (isNetworkError(authErr)) {
                  Alert.alert("No Connection", "Your account could not be deleted. Please check your internet connection and try again.");
                } else {
                  Alert.alert("Could Not Delete Account", authErr?.message || "Account deletion failed. Please try again.");
                }
                return;
              }

              // Step 2: Firestore cleanup (fire-and-forget sub-tasks inside)
              try {
                await deleteUserAccount(userId);
              } catch {
                // Auth account already deleted — proceed to sign out so the user
                // isn't left in a broken signed-in state.
              }

              // Step 3: sign out
              try {
                await signOut();
              } catch {
                // Non-fatal after auth deletion.
              }

              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.replace("/(tabs)/" as any);

            } catch (e: any) {
              deleteInFlightRef.current = false;
              if (isNetworkError(e)) {
                Alert.alert("No Connection", "Your account could not be deleted. Please check your internet connection and try again.");
              } else {
                Alert.alert("Error", e?.message || "Could not delete account. Please try again.");
              }
            } finally {
              deleteInFlightRef.current = false;
            }
          },
        },
      ]
    );
  }, [deleteConfirmText, userId, signOut]);

  return {
    deleteConfirmText, setDeleteConfirmText,
    resetAccount,
    handleSignOut,
    handleClearData,
    handleDeleteAccount,
  };
}
