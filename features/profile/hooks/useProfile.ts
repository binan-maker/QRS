import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Alert } from "react-native";
import { useFocusEffect, router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "@/lib/haptics";
import { useAuth } from "@/contexts/AuthContext";
import { useAvatar } from "@/contexts/AvatarContext";
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
  const { setAvatar, syncAvatar, clearAvatar } = useAvatar();

  const [editingName, setEditingName] = useState(false);
  const [newName, setNewName] = useState(user?.displayName || "");
  const [savingName, setSavingName] = useState(false);
  const [stats, setStats] = useState<UserStats>({ followingCount: 0, scanCount: 0, commentCount: 0, totalLikesReceived: 0 });
  const [statsLoading, setStatsLoading] = useState(false);
  const hasLoadedStatsRef = useRef(false);
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
    hasLoadedStatsRef.current = false;
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
    // Only show skeleton on first-ever load for this user, not on tab re-focus.
    // This eliminates the "skeleton flash" every time the profile tab is revisited.
    const showSkeleton = !hasLoadedStatsRef.current;
    if (showSkeleton) setStatsLoading(true);
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
          hasLoadedStatsRef.current = true;
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
      // Sync Firestore photo into avatar store — this is authoritative and always wins
      // over the Google photo synced during login.
      if (photo) { setPhotoURL(photo); syncAvatar(photo); }
      if (unameData.username) setCurrentUsername(unameData.username);
      setUsernameLastChangedAt(unameData.usernameLastChangedAt);
      hasLoadedStatsRef.current = true;
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

  const handleSaveName = useCallback(async () => {
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
  }, [newName, user?.id, updateLocalDisplayName]);

  const handleSaveUsername = useCallback(async () => {
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
  }, [user?.id, newUsernameInput]);

  const handlePickPhoto = useCallback(async (source: "camera" | "gallery") => {
    setPhotoModalOpen(false);
    try {
      let result: ImagePicker.ImagePickerResult;
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert("Permission needed", "Camera access is required."); return; }
        result = await ImagePicker.launchCameraAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
      } else {
        const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!perm.granted) { Alert.alert("Permission needed", "Gallery access is required."); return; }
        result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ["images"], allowsEditing: true, aspect: [1, 1], quality: 0.6 });
      }
      if (result.canceled || !result.assets?.[0]) return;
      const asset = result.assets[0];

      // ── OPTIMISTIC UI ──────────────────────────────────────────────────────
      // Show the local file immediately so the user sees their new photo at once.
      // The CDN URL swap happens silently in the background.
      const prevPhotoUrl = photoURL;
      setAvatar(asset.uri);
      setUploadingPhoto(true);

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { uploadProfilePhoto } = await import("@/lib/services/storage-service");
      const newPhotoUrl = await uploadProfilePhoto(blob, user!.id, prevPhotoUrl ?? undefined);

      await updateUserPhotoURL(user!.id, newPhotoUrl);

      // Swap optimistic local URI → real CDN URL (triggers a version bump + cache-bust)
      setPhotoURL(newPhotoUrl);
      setAvatar(newPhotoUrl);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      // Rollback: restore the previous avatar so the UI doesn't stay broken
      if (photoURL) setAvatar(photoURL); else clearAvatar();
      Alert.alert("Error", `Could not update photo: ${error.message}`);
    } finally {
      setUploadingPhoto(false);
    }
  }, [user?.id, photoURL, setAvatar, clearAvatar]);

  const handleRemovePhoto = useCallback(async () => {
    if (!user?.id) return;
    setPhotoModalOpen(false);
    const prevUrl = photoURL;

    // ── OPTIMISTIC UI: clear avatar immediately ────────────────────────────
    clearAvatar();
    setPhotoURL(null);

    try {
      // Delete from Storage (fire-and-forget, non-blocking)
      if (prevUrl && prevUrl.includes("firebasestorage")) {
        const { deleteProfilePhoto } = await import("@/lib/services/storage-service");
        deleteProfilePhoto(user.id, prevUrl).catch(() => {});
      }
      // Clear in Firestore
      await updateUserPhotoURL(user.id, null);
      invalidateUserCache(user.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      // Rollback on failure
      if (prevUrl) setAvatar(prevUrl);
      setPhotoURL(prevUrl);
    }
  }, [user?.id, photoURL, clearAvatar, setAvatar]);

  const handleCancelUsername = useCallback(() => {
    setEditingUsername(false);
    setUsernameError("");
    setUsernameAvailable(null);
  }, []);

  const handleSignOut = useCallback(async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          try {
            clearAvatar();
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

  // Memoize derived values so they don't recompute on every render.
  const lastChangedDate = useMemo<Date | null>(() => {
    if (usernameLastChangedAt instanceof Date) return usernameLastChangedAt;
    if (typeof usernameLastChangedAt === "string" && usernameLastChangedAt) return new Date(usernameLastChangedAt);
    return null;
  }, [usernameLastChangedAt]);

  const daysUntilEdit = useMemo(
    () => lastChangedDate ? Math.max(0, Math.ceil(15 - (Date.now() - lastChangedDate.getTime()) / 86400000)) : 0,
    [lastChangedDate]
  );

  const initials = useMemo(
    () => user?.displayName
      ? user.displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
      : "?",
    [user?.displayName]
  );

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
    handleRemovePhoto,
    handleSignOut,
  };
}
