import { useState, useEffect } from "react";
import { Alert } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Haptics from "@/lib/haptics";
import { setHapticsEnabled } from "@/lib/haptics";
import { router } from "expo-router";
import { useAuth } from "@/contexts/AuthContext";
import { authAdapter } from "@/lib/auth";
import {
  getUserFollowing,
  getUserComments,
  softDeleteComment,
  submitFeedback,
  deleteUserAccount,
  deleteAllUserComments,
  getUserScansPaginated,
  deleteUserScan,
  deleteAllUserScans,
} from "@/lib/firestore-service";

export type Section = "main" | "account" | "guide" | "feedback" | "following" | "comments" | "history";

const HAPTIC_KEY = "haptic_enabled";

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
  const [myHistory, setMyHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");
  const [hapticsEnabled, setHapticsEnabledState] = useState(true);

  useEffect(() => {
    AsyncStorage.getItem(HAPTIC_KEY).then((v) => {
      const enabled = v !== "false";
      setHapticsEnabledState(enabled);
      setHapticsEnabled(enabled);
    });
  }, []);

  async function toggleHaptics() {
    const next = !hapticsEnabled;
    setHapticsEnabledState(next);
    setHapticsEnabled(next);
    await AsyncStorage.setItem(HAPTIC_KEY, String(next));
  }

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            await signOut();
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            router.replace("/(tabs)/scanner" as any);
          } catch (e: any) {
            Alert.alert("Sign Out Failed", e?.message || "Could not sign out. Please try again.");
          }
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

  async function loadMyHistory() {
    if (!user) return;
    setHistoryLoading(true);
    try {
      const stored = await AsyncStorage.getItem(`local_scan_history_${user.id}`);
      const local: any[] = stored
        ? JSON.parse(stored).map((s: any) => ({ ...s, source: "local" as const }))
        : [];
      const { items } = await getUserScansPaginated(user.id, 100);
      const cloud = items
        .filter((s: any) => !s.isDeleted)
        .map((s: any) => ({ ...s, source: "cloud" as const }));
      const merged = [...local];
      for (const c of cloud) {
        if (!merged.find((i) => i.qrCodeId && i.qrCodeId === c.qrCodeId)) {
          merged.push(c);
        }
      }
      merged.sort(
        (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
      );
      setMyHistory(merged);
    } catch {}
    setHistoryLoading(false);
  }

  async function handleDeleteComment(commentId: string, qrCodeId: string) {
    Alert.alert("Delete Comment", "Are you sure you want to delete this comment?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: async () => {
          setMyComments((prev) => prev.filter((c) => c.id !== commentId));
          try {
            if (user) await softDeleteComment(qrCodeId, commentId, user.id);
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
          } catch {
            Alert.alert("Error", "Could not delete comment.");
          }
        },
      },
    ]);
  }

  async function handleDeleteAllComments() {
    Alert.alert(
      "Delete All Comments",
      "This will permanently delete all your comments. Under Indian DPDP Act and GDPR, your data will be removed within 7 days. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            const prev = [...myComments];
            setMyComments([]);
            try {
              if (user) await deleteAllUserComments(user.id);
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              setMyComments(prev);
              Alert.alert("Error", "Could not delete all comments.");
            }
          },
        },
      ]
    );
  }

  async function handleDeleteHistoryItem(item: any) {
    setMyHistory((prev) => prev.filter((h) => h.id !== item.id));
    try {
      if (user) {
        if (item.source === "cloud") {
          await deleteUserScan(user.id, item.id);
        } else {
          const stored = await AsyncStorage.getItem(`local_scan_history_${user.id}`);
          if (stored) {
            const arr = JSON.parse(stored).filter((s: any) => s.id !== item.id);
            await AsyncStorage.setItem(`local_scan_history_${user.id}`, JSON.stringify(arr));
          }
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      setMyHistory((prev) =>
        [item, ...prev].sort(
          (a, b) => new Date(b.scannedAt).getTime() - new Date(a.scannedAt).getTime()
        )
      );
    }
  }

  async function handleDeleteAllHistory() {
    Alert.alert(
      "Delete All History",
      "This will remove all your scan history from this device and the cloud. Security data is anonymised and retained for threat analysis under our privacy policy. This cannot be undone.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete All",
          style: "destructive",
          onPress: async () => {
            const prev = [...myHistory];
            setMyHistory([]);
            try {
              if (user) {
                await AsyncStorage.removeItem(`local_scan_history_${user.id}`);
                await deleteAllUserScans(user.id);
              }
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
            } catch {
              setMyHistory(prev);
              Alert.alert("Error", "Could not delete history.");
            }
          },
        },
      ]
    );
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
              if (user) {
                await deleteUserAccount(user.id);
                const currentUser = authAdapter.getCurrentUser();
                if (currentUser) {
                  await authAdapter.deleteUser(currentUser);
                }
              }
              await signOut();
              Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
              router.replace("/(tabs)/scanner" as any);
            } catch (e: any) {
              console.error("[DeleteAccount] Error:", e?.message, e?.code);
              if (e?.code === "auth/requires-recent-login") {
                Alert.alert(
                  "Re-authentication Required",
                  "For your security, please sign out and sign back in before deleting your account. This is required for sensitive operations."
                );
              } else {
                Alert.alert("Error", e?.message || "Could not delete account. Please try again.");
              }
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
    if (s === "history") loadMyHistory();
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
    myHistory,
    historyLoading,
    deleteConfirmText,
    setDeleteConfirmText,
    hapticsEnabled,
    toggleHaptics,
    handleSignOut,
    handleClearData,
    handleSubmitFeedback,
    handleDeleteComment,
    handleDeleteAllComments,
    handleDeleteHistoryItem,
    handleDeleteAllHistory,
    handleDeleteAccount,
  };
}
