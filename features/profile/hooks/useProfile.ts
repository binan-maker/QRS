import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Alert } from "react-native";
import { useFocusEffect, router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "@/shared/utils/haptics";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useAvatar } from "@/shared/contexts/AvatarContext";
import { authAdapter } from "@/lib/auth";
import { db } from "@/lib/db";
import {
  getUserStats,
  updateUserPhotoURL,
  getUserPhotoURL,
  subscribeToUserGeneratedQrs,
  getUsernameData,
  type UserStats,
  type GeneratedQrItem,
} from "@/lib/firestore-service";
import { getUserBio } from "@/services/user-service";
import {
  getCachedUserStats,
  setCachedUserStats,
  invalidateUserCache,
  getCachedProfileExtras,
  setCachedProfileExtras,
  getCachedGeneratedQrs,
  setCachedGeneratedQrs,
} from "@/services/cache/qr-cache";

const STATS_STALE_MS  = 3 * 60 * 1000;
const EXTRAS_STALE_MS = 5 * 60 * 1000;

interface ProfileExtras {
  bio: string;
  friendsCount: number;
  fetchedAt: number;
}

export function useProfile() {
  const { user, signOut } = useAuth();
  const { setAvatar, syncAvatar, clearAvatar } = useAvatar();

  const [stats,          setStats]          = useState<UserStats>({ followingCount: 0, scanCount: 0, commentCount: 0, totalLikesReceived: 0 });
  const [statsLoading,   setStatsLoading]   = useState(false);
  const hasLoadedStatsRef                   = useRef(false);
  const [photoURL,       setPhotoURL]       = useState<string | null>(user?.photoURL || null);
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [refreshing,     setRefreshing]     = useState(false);
  const [myQrCodes,      setMyQrCodes]      = useState<GeneratedQrItem[]>([]);
  const [myQrLoading,    setMyQrLoading]    = useState(true);
  const [bio,            setBio]            = useState("");
  const [currentUsername, setCurrentUsername] = useState<string | null>(user?.username || null);

  const myQrCodesRef        = useRef<GeneratedQrItem[]>([]);
  const hasLoadedQrsRef     = useRef(false);
  const qrUnsubscribeRef    = useRef<(() => void) | null>(null);
  const qrSubscribedUidRef  = useRef<string | null>(null); // tracks which user the listener is for
  const lastStatsFetchRef   = useRef<number>(0);
  const lastExtrasFetchRef  = useRef<number>(0);
  const inFlightStatsRef    = useRef(false);
  const inFlightExtrasRef   = useRef(false);

  useEffect(() => { myQrCodesRef.current = myQrCodes; }, [myQrCodes]);

  // Reset all derived state when the signed-in user changes
  useEffect(() => {
    setPhotoURL(user?.photoURL || null);
    setCurrentUsername(user?.username || null);
    setStats({ followingCount: 0, scanCount: 0, commentCount: 0, totalLikesReceived: 0 });
    hasLoadedStatsRef.current    = false;
    setBio("");
    lastStatsFetchRef.current    = 0;
    lastExtrasFetchRef.current   = 0;
  }, [user?.id]);

  // ── Stats + username (3-min stale, disk-cached) ────────────────────────────
  const loadStats = useCallback(async (forceRefresh = false) => {
    if (!user) return;
    if (inFlightStatsRef.current) return;
    if (!forceRefresh && Date.now() - lastStatsFetchRef.current < STATS_STALE_MS) return;
    inFlightStatsRef.current = true;
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
          hasLoadedStatsRef.current    = true;
          setStatsLoading(false);
          inFlightStatsRef.current     = false;
          lastStatsFetchRef.current    = Date.now();
          return;
        }
      }
      const [s, photo, unameData] = await Promise.all([
        getUserStats(user.id),
        getUserPhotoURL(user.id),
        getUsernameData(user.id),
      ]);
      setStats(s);
      if (photo) { setPhotoURL(photo); syncAvatar(photo); }
      if (unameData.username) setCurrentUsername(unameData.username);
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

  // ── Profile extras: bio + friends count (5-min stale, disk-cached) ─────────
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
          lastExtrasFetchRef.current = cached.fetchedAt;
          inFlightExtrasRef.current = false;
          return; // cache is valid — no Firestore round-trip needed
        }
      }
      const [bioRes, doc] = await Promise.all([
        getUserBio(user.id).catch(() => ""),
        db.get(["users", user.id]).catch(() => null),
      ]);
      const nextBio     = bioRes || "";
      const nextFriends = (doc as any)?.friendsCount ?? 0;
      setBio(nextBio);
      const fetchedAt = Date.now();
      lastExtrasFetchRef.current = fetchedAt;
      setCachedProfileExtras<ProfileExtras>(user.id, {
        bio: nextBio, friendsCount: nextFriends, fetchedAt,
      }).catch(() => {});
    } catch {}
    inFlightExtrasRef.current = false;
  }, [user?.id]);

  // Load only when the profile tab is focused
  useFocusEffect(
    useCallback(() => {
      loadStats();
      loadProfileExtras();
    }, [loadStats, loadProfileExtras])
  );

  // Hydrate from cache on first mount so the first paint is instant
  useEffect(() => {
    if (!user) return;
    getCachedProfileExtras<ProfileExtras>(user.id).then((cached) => {
      if (!cached) return;
      setBio(cached.bio || "");
    }).catch(() => {});
  }, [user?.id]);

  // Generated-QR listener — started once per user and kept alive across tab
  // switches.  Previously the listener was torn down on every blur and rebuilt
  // on every focus, causing a brief data gap each time the user returned to
  // the profile tab (visible as a blank/flickering QR stack).  Now we only
  // create a new listener when the signed-in user changes; we never kill it
  // just because the tab lost focus.  Cleanup on unmount is handled by the
  // separate useEffect below.
  useFocusEffect(
    useCallback(() => {
      if (!user) {
        // User signed out — tear down the listener and clear data
        if (qrUnsubscribeRef.current) {
          qrUnsubscribeRef.current();
          qrUnsubscribeRef.current = null;
          qrSubscribedUidRef.current = null;
        }
        setMyQrCodes([]);
        setMyQrLoading(false);
        return;
      }

      // If we already have an active listener for this user, do nothing
      if (qrUnsubscribeRef.current && qrSubscribedUidRef.current === user.id) {
        return;
      }

      // New user or first mount — clean up any old listener first
      if (qrUnsubscribeRef.current) {
        qrUnsubscribeRef.current();
        qrUnsubscribeRef.current = null;
        qrSubscribedUidRef.current = null;
      }

      // Seed from cache first so the QR stack appears instantly
      const uid = user.id;
      if (!hasLoadedQrsRef.current && myQrCodesRef.current.length === 0) {
        getCachedGeneratedQrs<GeneratedQrItem[]>(uid).then((cached) => {
          if (cached && cached.length > 0 && !hasLoadedQrsRef.current) {
            setMyQrCodes(cached);
          }
        }).catch(() => {});
      }

      setMyQrLoading(!hasLoadedQrsRef.current && myQrCodesRef.current.length === 0);
      const unsub = subscribeToUserGeneratedQrs(uid, (items) => {
        setMyQrCodes(items);
        hasLoadedQrsRef.current = true;
        setMyQrLoading(false);
        // Keep cache warm so next visit is instant
        setCachedGeneratedQrs<GeneratedQrItem[]>(uid, items).catch(() => {});
      });
      qrUnsubscribeRef.current = unsub;
      qrSubscribedUidRef.current = uid;
    }, [user?.id])
  );

  // Tear down the Firestore listener when the component fully unmounts
  useEffect(() => {
    return () => {
      if (qrUnsubscribeRef.current) {
        qrUnsubscribeRef.current();
        qrUnsubscribeRef.current = null;
        qrSubscribedUidRef.current = null;
      }
    };
  }, []);

  // ── Photo pick / upload (optimistic) ───────────────────────────────────────
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

      // Show local file immediately; swap to CDN URL silently in background
      const prevPhotoUrl = photoURL;
      setAvatar(asset.uri);
      setUploadingPhoto(true);

      const response = await fetch(asset.uri);
      const blob = await response.blob();

      const { uploadProfilePhoto } = await import("@/services/storage-service");
      const newPhotoUrl = await uploadProfilePhoto(blob, user!.id, prevPhotoUrl ?? undefined);

      await updateUserPhotoURL(user!.id, newPhotoUrl);

      setPhotoURL(newPhotoUrl);
      setAvatar(newPhotoUrl);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      if (photoURL) setAvatar(photoURL); else clearAvatar();
      Alert.alert("Error", `Could not update photo: ${error.message}`);
    } finally {
      setUploadingPhoto(false);
    }
  }, [user?.id, photoURL, setAvatar, clearAvatar]);

  // ── Photo remove (optimistic) ──────────────────────────────────────────────
  const handleRemovePhoto = useCallback(async () => {
    if (!user?.id) return;
    setPhotoModalOpen(false);
    const prevUrl = photoURL;

    clearAvatar();
    setPhotoURL(null);

    try {
      if (prevUrl && prevUrl.includes("firebasestorage")) {
        const { deleteProfilePhoto } = await import("@/services/storage-service");
        deleteProfilePhoto(user.id, prevUrl).catch(() => {});
      }
      await updateUserPhotoURL(user.id, null);
      invalidateUserCache(user.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      if (prevUrl) setAvatar(prevUrl);
      setPhotoURL(prevUrl);
    }
  }, [user?.id, photoURL, clearAvatar, setAvatar]);

  // ── Pull-to-refresh ────────────────────────────────────────────────────────
  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      await Promise.all([loadStats(true), loadProfileExtras(true)]);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setRefreshing(false);
  }, [refreshing, loadStats, loadProfileExtras]);

  // ── Sign out ───────────────────────────────────────────────────────────────
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

  const initials = useMemo(
    () => user?.displayName
      ? user.displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
      : "?",
    [user?.displayName]
  );

  return {
    user,
    stats,
    statsLoading,
    photoURL,
    photoModalOpen,
    setPhotoModalOpen,
    uploadingPhoto,
    myQrCodes,
    myQrLoading,
    currentUsername,
    initials,
    bio,
    refreshing,
    handleRefresh,
    handlePickPhoto,
    handleRemovePhoto,
    handleSignOut,
  };
}
