import { useState, useEffect } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import {
  getUserFollowing,
  getUserComments,
  softDeleteComment,
  submitFeedback,
  deleteUserAccount,
} from "@/lib/firestore-service";

export type Section = "main" | "account" | "guide" | "feedback" | "following" | "comments";

export function useSettings() {
  const { user, token, signOut } = useAuth();
  const [section, setSection] = useState<Section>("main");
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackEmail, setFeedbackEmail] = useState(user?.email || "");
  const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
  const [feedbackDone, setFeedbackDone] = useState(false);
  const [followingList, setFollowingList] = useState<any[]>([]);
  const [followingLoading, setFollowingLoading] = useState(false);
  const [myComments, setMyComments] = useState<any[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await signOut();
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        },
      },
    ]);
  }

  async function handleClearData() {
    Alert.alert("Clear All Data", "This will remove all locally stored data including scan history.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Clear",
        style: "destructive",
        onPress: async () => {
          await AsyncStorage.removeItem("local_scan_history");
          if (user?.id) {
            await AsyncStorage.removeItem(`local_scan_history_${user.id}`);
          }
          Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          Alert.alert("Cleared", "Local data has been cleared.");
        },
      },
    ]);
  }

  async function handleSubmitFeedback() {
    if (!feedbackText.trim()) return;
    setFeedbackSubmitting(true);
    try {
      await submitFeedback(user?.id || null, feedbackEmail.trim() || null, feedbackText.trim());
      setFeedbackDone(true);
      setFeedbackText("");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Could not submit feedback. Please try again.");
    } finally {
      setFeedbackSubmitting(false);
    }
  }

  async function loadFollowing() {
    if (!user) return;
    setFollowingLoading(true);
    try {
      const list = await getUserFollowing(user.id);
      setFollowingList(list);
    } catch {}
    setFollowingLoading(false);
  }

  async function loadMyComments() {
    if (!user) return;
    setCommentsLoading(true);
    try {
      const list = await getUserComments(user.id);
      setMyComments(list);
    } catch {}
    setCommentsLoading(false);
  }

  async function handleDeleteComment(commentId: string) {
    Alert.alert("Delete Comment", "Are you sure you want to delete this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          try {
            await softDeleteComment(commentId);
            setMyComments((prev) => prev.filter((c) => c.id !== commentId));
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert("Error", "Could not delete comment.");
          }
        },
      },
    ]);
  }

  async function handleDeleteAccount() {
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
          text: "Delete Forever",
          style: "destructive",
          onPress: async () => {
            try {
              if (user) await deleteUserAccount(user.id, token || "");
              await signOut();
            } catch (e: any) {
              Alert.alert("Error", e.message || "Could not delete account.");
            }
          },
        },
      ]
    );
  }

  function handleSectionChange(s: Section) {
    setSection(s);
    if (s === "following") loadFollowing();
    if (s === "comments") loadMyComments();
  }

  return {
    user,
    section,
    setSection: handleSectionChange,
    feedbackText,
    setFeedbackText,
    feedbackEmail,
    setFeedbackEmail,
    feedbackSubmitting,
    feedbackDone,
    setFeedbackDone,
    followingList,
    followingLoading,
    myComments,
    commentsLoading,
    deleteConfirmText,
    setDeleteConfirmText,
    handleSignOut,
    handleClearData,
    handleSubmitFeedback,
    handleDeleteComment,
    handleDeleteAccount,
  };
}
