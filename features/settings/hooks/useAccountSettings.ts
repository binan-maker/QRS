import { useState, useCallback } from "react";
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

export function useAccountSettings({ userId, signOut }: UseAccountSettingsOptions) {
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  const resetAccount = useCallback(() => {
    setDeleteConfirmText("");
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

  const handleDeleteAccount = useCallback(async () => {
    if (deleteConfirmText.toLowerCase() !== "delete") {
      Alert.alert("Confirmation Required", 'Please type "delete" to confirm account deletion.');
      return;
    }
    Alert.alert(
      "Delete Account",
      "This will permanently delete your account and all associated data. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete Forever", style: "destructive",
          onPress: async () => {
            try {
              if (userId) {
                await deleteUserAccount(userId);
                const currentUser = authAdapter.getCurrentUser();
                if (currentUser) await authAdapter.deleteUser(currentUser);
              }
              await signOut();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.replace("/(tabs)/" as any);
            } catch (e: any) {
              if (e?.code === "auth/requires-recent-login") {
                Alert.alert(
                  "Re-authentication Required",
                  "For your security, please sign out and sign back in before deleting your account."
                );
              } else {
                Alert.alert("Error", e?.message || "Could not delete account. Please try again.");
              }
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
