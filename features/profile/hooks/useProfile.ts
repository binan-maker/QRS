import { useState, useEffect, useCallback, useRef } from "react";
import { Alert } from "react-native";
import { useFocusEffect } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "expo-haptics";
import { useAuth } from "@/contexts/AuthContext";
import { firebaseAuth } from "@/lib/firebase";
import { updateProfile } from "firebase/auth";
import {
  getUserStats,
  updateUserPhotoURL,
  getUserPhotoURL,
  subscribeToUserGeneratedQrs,
  getUsernameData,
  updateUsername,
  checkUsernameAvailable,
  type UserStats,
  type GeneratedQrItem,
} from "@/lib/firestore-service";
import {
  getCachedUserStats,
  setCachedUserStats,
  invalidateUserCache,
} from "@/lib/cache/qr-cache";

export function useProfile() {
  const { user, signOut } = useAuth();

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || "");
  const [savingName, setSavingName] = useState(false);
  const [stats, setStats] = useState<UserStats>({ followingCount: 0, scanCount: 0, commentCount: 0, totalLikesReceived: 0 });
  const [statsLoading, setStatsLoading] = useState(false);
  const [photoURL, setPhotoURL] = useState<string | null>(user?.photoURL || null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [myQrCodes, setMyQrCodes] = useState<GeneratedQrItem[]>([]);
  const [myQrLoading, setMyQrLoading] = useState(true);
  const qrUnsubscribeRef = useRef<(() => void) | null>(null);

  const [currentUsername, setCurrentUsername] = useState<string | null>(user?.username || null);
  const [usernameLastChangedAt, setUsernameLastChangedAt] = useState<Date | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsernameInput, setNewUsernameInput] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  const loadStats = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    setStatsLoading(true);
    try {
      if (!forceRefresh) {
        const cached = await getCachedUserStats<{
          stats: UserStats;
          photoURL: string | null;
          username: string | null;
          usernameLastChangedAt: Date | null;
        }>(user.id);
        if (cached) {
          setStats(cached.stats);
          if (cached.photoURL) setPhotoURL(cached.photoURL);
          if (cached.username) setCurrentUsername(cached.username);
          setUsernameLastChangedAt(cached.usernameLastChangedAt);
          setStatsLoading(false);
          return;
        }
      }
      const [s, photo, unameData] = await Promise.all([
        getUserStats(user.id),
        getUserPhotoURL(user.id),
        getUsernameData(user.id),
      ]);
      setStats(s);
      if (photo) setPhotoURL(photo);
      if (unameData.username) setCurrentUsername(unameData.username);
      setUsernameLastChangedAt(unameData.usernameLastChangedAt);
      await setCachedUserStats(user.id, {
        stats: s,
        photoURL: photo,
        username: unameData.username,
        usernameLastChangedAt: unameData.usernameLastChangedAt,
      });
    } catch {}
    setStatsLoading(false);
  }, [user?.id]);

  useEffect(() => { loadStats(); }, [loadStats]);

  useFocusEffect(useCallback(() => { loadStats(); }, [loadStats]));

  useEffect(() => {
    if (!user) { setMyQrCodes([]); setMyQrLoading(false); return; }
    setMyQrLoading(true);
    if (qrUnsubscribeRef.current) { qrUnsubscribeRef.current(); qrUnsubscribeRef.current = null; }
    const unsub = subscribeToUserGeneratedQrs(user.id, (items) => {
      setMyQrCodes(items);
      setMyQrLoading(false);
    });
    qrUnsubscribeRef.current = unsub;
    return () => { if (qrUnsubscribeRef.current) { qrUnsubscribeRef.current(); qrUnsubscribeRef.current = null; } };
  }, [user?.id]);

  useEffect(() => {
    if (!editingUsername || !newUsernameInput) { setUsernameAvailable(null); return; }
    if (!/^[a-z][a-z0-9_]{2,19}$/.test(newUsernameInput)) { setUsernameAvailable(null); return; }
    if (newUsernameInput === currentUsername) { setUsernameAvailable(null); return; }
    setCheckingUsername(true);
    const timer = setTimeout(async () => {
      const available = await checkUsernameAvailable(newUsernameInput);
      setUsernameAvailable(available);
      setCheckingUsername(false);
    }, 600);
    return () => clearTimeout(timer);
  }, [newUsernameInput, editingUsername, currentUsername]);

  async function handleSaveName() {
    if (!newName.trim() || !firebaseAuth.currentUser) return;
    setSavingName(true);
    try {
      await updateProfile(firebaseAuth.currentUser, { displayName: newName.trim() });
      setEditingName(false);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Could not update name. Try again.");
    } finally {
      setSavingName(false);
    }
  }

  async function handleSaveUsername() {
    if (!user || !newUsernameInput.trim()) return;
    setUsernameError("");
    setSavingUsername(true);
    try {
      await updateUsername(user.id, newUsernameInput.trim());
      setCurrentUsername(newUsernameInput.trim());
      setUsernameLastChangedAt(new Date());
      setEditingUsername(false);
      invalidateUserCache(user.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (e: any) {
      setUsernameError(e.message || "Could not update username.");
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
    } finally {
      setSavingUsername(false);
    }
  }

  async function handlePickPhoto(source: "camera" | "gallery") {
    setPhotoModalOpen(false);
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert("Permission needed", "Camera access is required."); return; }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert("Permission needed", "Gallery access is required."); return; }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.5, base64: true });
      }
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploadingPhoto(true);
      const base64Uri = `data:image/jpeg;base64,${asset.base64}`;
      setPhotoURL(base64Uri);
      if (user) await updateUserPhotoURL(user.id, base64Uri);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      Alert.alert("Error", "Could not update photo.");
    } finally {
      setUploadingPhoto(false);
    }
  }

  function handleCancelUsername() {
    setEditingUsername(false);
    setUsernameError("");
    setUsernameAvailable(null);
  }

  async function handleSignOut() {
    Alert.alert("Sign Out", "Are you sure?", [
      { text: "Cancel", style: "cancel" },
      { text: "Sign Out", style: "destructive", onPress: async () => {
        await signOut();
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }},
    ]);
  }

  const daysUntilEdit = usernameLastChangedAt
    ? Math.max(0, Math.ceil(15 - (Date.now() - usernameLastChangedAt.getTime()) / 86400000))
    : 0;

  const initials = user?.displayName
    ? user.displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
    : "?";

  return {
    user,
    signOut,
    editingName,
    setEditingName,
    newName,
    setNewName,
    savingName,
    stats,
    statsLoading,
    photoURL,
    photoModalOpen,
    setPhotoModalOpen,
    uploadingPhoto,
    myQrCodes,
    myQrLoading,
    currentUsername,
    usernameLastChangedAt,
    editingUsername,
    setEditingUsername,
    newUsernameInput,
    setNewUsernameInput,
    usernameAvailable,
    checkingUsername,
    savingUsername,
    usernameError,
    setUsernameError,
    daysUntilEdit,
    initials,
    handleSaveName,
    handleSaveUsername,
    handleCancelUsername,
    handlePickPhoto,
    handleSignOut,
  };
}
