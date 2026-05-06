import { useState, useEffect, useCallback, useRef } from "react";
import { Alert } from "react-native";
import { useFocusEffect, router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "@/lib/haptics";
import { useAuth } from "@/contexts/AuthContext";
import { authAdapter } from "@/lib/auth";
import { db } from "@/lib/db";
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
import { getUserBio } from "@/lib/services/user-service";
import {
  getCachedUserStats,
  setCachedUserStats,
  invalidateUserCache,
  getCachedProfileExtras,
  setCachedProfileExtras,
} from "@/lib/cache/qr-cache";

const STATS_STALE_MS = 3 * 60 * 1000;
const EXTRAS_STALE_MS = 5 * 60 * 1000;

interface ProfileExtras {
  bio: string;
  friendsCount: number;
  fetchedAt: number;
}

export function useProfile() {
  const { user, signOut, updateLocalDisplayName } = useAuth();

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
  const lastStatsFetchRef = useRef<number>(0);
  const lastExtrasFetchRef = useRef<number>(0);
  const inFlightStatsRef = useRef(false);
  const inFlightExtrasRef = useRef(false);

  const [bio, setBio] = useState("");
  const [friendsCount, setFriendsCount] = useState(0);

  const [currentUsername, setCurrentUsername] = useState<string | null>(user?.username || null);

  useEffect(() => {
    setNewName(user?.displayName || "");
    setPhotoURL(user?.photoURL || null);
    setCurrentUsername(user?.username || null);
    setStats({ followingCount: 0, scanCount: 0, commentCount: 0, totalLikesReceived: 0 });
    setEditingName(false);
    setEditingUsername(false);
    setUsernameError("");
    setUsernameAvailable(null);
    setBio("");
    setFriendsCount(0);
    lastStatsFetchRef.current = 0;
    lastExtrasFetchRef.current = 0;
  }, [user?.id]);
  const [usernameLastChangedAt, setUsernameLastChangedAt] = useState<Date | null>(null);
  const [editingUsername, setEditingUsername] = useState(false);
  const [newUsernameInput, setNewUsernameInput] = useState("");
  const [usernameAvailable, setUsernameAvailable] = useState<boolean | null>(null);
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  const loadStats = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    if (inFlightStatsRef.current) return;
    if (!forceRefresh && Date.now() - lastStatsFetchRef.current < STATS_STALE_MS) return;
    inFlightStatsRef.current = true;
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
          inFlightStatsRef.current = false;
          lastStatsFetchRef.current = Date.now();
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
      lastStatsFetchRef.current = Date.now();
      await setCachedUserStats(user.id, {
        stats: s,
        photoURL: photo,
        username: unameData.username,
        usernameLastChangedAt: unameData.usernameLastChangedAt,
      });
    } catch {}
    setStatsLoading(false);
    inFlightStatsRef.current = false;
  }, [user?.id]);

  const loadProfileExtras = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    if (inFlightExtrasRef.current) return;
    if (!forceRefresh && Date.now() - lastExtrasFetchRef.current < EXTRAS_STALE_MS) return;
    inFlightExtrasRef.current = true;
    try {
      if (!forceRefresh) {
        const cached = await getCachedProfileExtras<ProfileExtras>(user.id);
        if (cached) {
          setBio(cached.bio || "");
          setFriendsCount(cached.friendsCount || 0);
          lastExtrasFetchRef.current = cached.fetchedAt;
        }
      }
      const [bioRes, doc] = await Promise.all([
        getUserBio(user.id).catch(() => ""),
        db.get(["users", user.id]).catch(() => null),
      ]);
      const nextBio = bioRes || "";
      const nextFriends = (doc as any)?.friendsCount ?? 0;
      setBio(nextBio);
      setFriendsCount(nextFriends);
      const fetchedAt = Date.now();
      lastExtrasFetchRef.current = fetchedAt;
      setCachedProfileExtras<ProfileExtras>(user.id, {
        bio: nextBio, friendsCount: nextFriends, fetchedAt,
      }).catch(() => {});
    } catch {}
    inFlightExtrasRef.current = false;
  }, [user?.id]);

  // Load only when the profile tab is focused — never on simple mount.
  useFocusEffect(
    useCallback(() => {
      loadStats();
      loadProfileExtras();
    }, [loadStats, loadProfileExtras])
  );

  // Hydrate from caches as soon as the user changes so first paint is instant.
  useEffect(() => {
    if (!user) return;
    getCachedProfileExtras<ProfileExtras>(user.id).then((cached) => {
      if (!cached) return;
      setBio(cached.bio || "");
      setFriendsCount(cached.friendsCount || 0);
    }).catch(() => {});
  }, [user?.id]);

  // The generated-QR list uses an onSnapshot listener. Only mount it while
  // the profile tab is focused so we don't pay for live updates while the
  // user is on other tabs.
  useFocusEffect(
    useCallback(() => {
      if (!user) {
        setMyQrCodes([]);
        setMyQrLoading(false);
        return;
      }
      setMyQrLoading(myQrCodes.length === 0);
      if (qrUnsubscribeRef.current) { qrUnsubscribeRef.current(); qrUnsubscribeRef.current = null; }
      const unsub = subscribeToUserGeneratedQrs(user.id, (items) => {
        setMyQrCodes(items);
        setMyQrLoading(false);
      });
      qrUnsubscribeRef.current = unsub;
      return () => {
        if (qrUnsubscribeRef.current) {
          qrUnsubscribeRef.current();
          qrUnsubscribeRef.current = null;
        }
      };
    }, [user?.id])
  );

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
    const currentUser = authAdapter.getCurrentUser();
    if (!newName.trim() || !currentUser) return;
    setSavingName(true);
    const trimmedName = newName.trim();
    updateLocalDisplayName(trimmedName);
    setEditingName(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    try {
      await authAdapter.updateDisplayName(currentUser, trimmedName);
      if (user?.id) {
        db.update(["users", user.id], { displayName: trimmedName }).catch(() => {});
        invalidateUserCache(user.id);
      }
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
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.5 });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert("Permission needed", "Gallery access is required."); return; }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.5 });
      }
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];
      setUploadingPhoto(true);
      
      // Get the file URI and convert to blob for upload
      const response = await fetch(asset.uri);
      const blob = await response.blob();
      
      // Upload to Firebase Storage and get URL
      const { uploadProfilePhoto } = await import("@/lib/services/storage-service");
      const newPhotoUrl = await uploadProfilePhoto(blob, user!.id, photoURL);

      // Persist the new URL to Firestore so comments and other features pick it up
      await updateUserPhotoURL(user!.id, newPhotoUrl);

      setPhotoURL(newPhotoUrl);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      Alert.alert("Error", `Could not update photo: ${error.message}`);
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
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
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
  }

  // Safely coerce usernameLastChangedAt to a Date — it may come back from
  // the cache as a plain string (JSON-serialized Date loses the prototype).
  const lastChangedDate: Date | null = usernameLastChangedAt instanceof Date
    ? usernameLastChangedAt
    : typeof usernameLastChangedAt === "string" && usernameLastChangedAt
      ? new Date(usernameLastChangedAt)
      : null;

  const daysUntilEdit = lastChangedDate
    ? Math.max(0, Math.ceil(15 - (Date.now() - lastChangedDate.getTime()) / 86400000))
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
    bio,
    friendsCount,
    handleSaveName,
    handleSaveUsername,
    handleCancelUsername,
    handlePickPhoto,
    handleSignOut,
  };
}
