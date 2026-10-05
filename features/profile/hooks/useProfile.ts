import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { Alert, Platform } from "react-native";
import { useFocusEffect, router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "@/shared/utils/haptics";
import { useAuth } from "@/shared/contexts/AuthContext";
import {
  useAvatar,
  isUserUploadedPhoto,
  pickBestPhotoUrl,
} from "@/shared/contexts/AvatarContext";
import {
  getUserStats,
  updateUserPhotoURL,
  getUserPhotoURL,
  getUsernameData,
  type UserStats,
} from "@/lib/data-service";
import {
  getCachedUserStats,
  setCachedUserStats,
  invalidateUserCache,
} from "@/services/cache/qr-cache";

export { isUserUploadedPhoto };

const STATS_STALE_MS  = 3 * 60 * 1000;

function decodeBase64ToArrayBuffer(base64: string): ArrayBuffer {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(base64, "base64");
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes.buffer;
}


export function useProfile() {
  const { user, signOut } = useAuth();
  const { url: avatarUrl, setAvatar, syncAvatar, clearAvatar } = useAvatar();

  const [stats,          setStats]          = useState<UserStats>({ scanCount: 0, commentCount: 0, totalLikesReceived: 0 });
  const [statsLoading,   setStatsLoading]   = useState(false);
  const hasLoadedStatsRef                   = useRef(false);
  const [photoURL,        setPhotoURL]        = useState<string | null>(() =>
    pickBestPhotoUrl(avatarUrl, user?.photoURL)
  );
  const [photoModalOpen,  setPhotoModalOpen]  = useState(false);
  const [uploadingPhoto,  setUploadingPhoto]  = useState(false);
  const [cropModalOpen,   setCropModalOpen]   = useState(false);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const mediaLibraryPermRef = useRef<boolean | null>(null); // cached permission status
  const [refreshing,     setRefreshing]     = useState(false);
  const [currentUsername, setCurrentUsername] = useState<string | null>(user?.username || null);
  const [usernameLastChangedAt, setUsernameLastChangedAt] = useState<Date | null>(null);

  const lastStatsFetchRef   = useRef<number>(0);
  const inFlightStatsRef    = useRef(false);

  // Keep local photoURL in sync when AvatarContext or AuthContext resolves the authoritative DB photo
  useEffect(() => {
    const best = pickBestPhotoUrl(avatarUrl, user?.photoURL);
    if (best) {
      setPhotoURL(best);
    } else if (avatarUrl === null && !user?.photoURL) {
      setPhotoURL(null);
    }
  }, [avatarUrl, user?.photoURL]);

  // Reset all derived state when the signed-in user changes
  useEffect(() => {
    setPhotoURL(pickBestPhotoUrl(avatarUrl, user?.photoURL));
    setCurrentUsername(user?.username || null);
    setUsernameLastChangedAt(null);
    setStats({ scanCount: 0, commentCount: 0, totalLikesReceived: 0 });
    hasLoadedStatsRef.current    = false;
    lastStatsFetchRef.current    = 0;
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
        if (cached && isUserUploadedPhoto(cached.photoURL)) {
          setStats(cached.stats);
          if (cached.photoURL) {
            setPhotoURL(cached.photoURL);
            syncAvatar(cached.photoURL);
          }
          if (cached.username) setCurrentUsername(cached.username);
          if (cached.usernameLastChangedAt) {
            setUsernameLastChangedAt(
              cached.usernameLastChangedAt instanceof Date
                ? cached.usernameLastChangedAt
                : new Date(cached.usernameLastChangedAt)
            );
          }
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
      if (photo) {
        setPhotoURL(photo);
        syncAvatar(photo);
      }
      if (unameData.username) setCurrentUsername(unameData.username);
      if (unameData.usernameLastChangedAt) {
        setUsernameLastChangedAt(
          unameData.usernameLastChangedAt instanceof Date
            ? unameData.usernameLastChangedAt
            : new Date(unameData.usernameLastChangedAt)
        );
      }
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
  }, [user?.id, syncAvatar]);

  // Load only when the profile tab is focused
  useFocusEffect(
    useCallback(() => {
      loadStats();
    }, [loadStats])
  );

  // ── Internal helper: upload a (possibly cropped) URI ───────────────────────
  // Declared BEFORE handlePickPhoto so it can be safely referenced in its deps.
  const uploadCroppedPhoto = useCallback(async (uri: string) => {
    if (!user?.id) return;
    const prevPhotoUrl = photoURL;
    setAvatar(uri);
    setUploadingPhoto(true);
    try {
      // 1. Process image locally via expo-image-manipulator to obtain clean, compressed base64
      // This eliminates calling fetch(localUri) which triggers "Network request failed" in React Native.
      const { manipulateAsync, SaveFormat } = await import("expo-image-manipulator");
      const manipulated = await manipulateAsync(
        uri,
        [{ resize: { width: 512, height: 512 } }],
        { compress: 0.85, format: SaveFormat.JPEG, base64: true }
      );

      if (!manipulated.base64) {
        throw new Error("Could not process selected image");
      }

      const { uploadProfilePhoto } = await import("@/services/storage/storage-service");
      let newPhotoUrl: string;

      try {
        const arrayBuffer = decodeBase64ToArrayBuffer(manipulated.base64);
        newPhotoUrl = await uploadProfilePhoto(
          arrayBuffer,
          user.id,
          prevPhotoUrl ?? undefined,
          { contentType: "image/jpeg" }
        );
      } catch (storageErr: any) {
        console.warn("[profile] Supabase Storage upload failed, applying compressed base64 fallback:", storageErr?.message);
        newPhotoUrl = `data:image/jpeg;base64,${manipulated.base64}`;
      }

      await updateUserPhotoURL(user.id, newPhotoUrl);

      // Sync auth metadata (only store remote URLs in auth metadata to avoid exceeding GoTrue's 32KB limit, matching Web)
      if (!newPhotoUrl.startsWith("data:")) {
        try {
          const { supabase } = await import("@/lib/supabase");
          await supabase.auth.updateUser({
            data: {
              avatar_url: newPhotoUrl,
              photo_url: newPhotoUrl,
              custom_avatar_url: newPhotoUrl,
            },
          });
        } catch {}
      }

      setPhotoURL(newPhotoUrl);
      setAvatar(newPhotoUrl);
      invalidateUserCache(user.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error: any) {
      if (prevPhotoUrl) setAvatar(prevPhotoUrl); else clearAvatar();
      Alert.alert("Error", `Could not update photo: ${error.message}`);
    } finally {
      setUploadingPhoto(false);
    }
  }, [user?.id, photoURL, setAvatar, clearAvatar]);

  // ── Custom crop modal callbacks (Android only) ──────────────────────────────
  const handleCropConfirm = useCallback(async (croppedUri: string) => {
    setCropModalOpen(false);
    setPendingImageUri(null);
    await uploadCroppedPhoto(croppedUri);
  }, [uploadCroppedPhoto]);

  const handleCropCancel = useCallback(() => {
    setCropModalOpen(false);
    setPendingImageUri(null);
  }, []);

  // Pre-fetch media-library permission whenever the photo modal opens so it is
  // already cached in mediaLibraryPermRef by the time the user taps "Gallery".
  // This eliminates the async permission round-trip that caused the perceived
  // double-tap / long-wait before the gallery appeared.
  useEffect(() => {
    if (!photoModalOpen) return;
    ImagePicker.getMediaLibraryPermissionsAsync().then((perm) => {
      mediaLibraryPermRef.current = perm.granted;
    }).catch(() => {});
  }, [photoModalOpen]);

  // ── Photo pick / upload (optimistic) ───────────────────────────────────────
  //
  // On Android we skip the native UCrop editor (allowsEditing:true) because it
  // renders invisible in light theme.  Instead we open a custom JS crop screen
  // after picking.  On iOS the native editor works correctly for both themes.
  const handlePickPhoto = useCallback(async (source: "camera" | "gallery") => {
    setPhotoModalOpen(false);
    try {
      let result: ImagePicker.ImagePickerResult;
      // Use native editor only on iOS; Android gets our custom crop modal.
      const useNativeEditor = Platform.OS !== "android";
      if (source === "camera") {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) { Alert.alert("Permission needed", "Camera access is required."); return; }
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ["images"],
          allowsEditing: useNativeEditor,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        // Use the pre-fetched permission if available to avoid the async delay.
        // Only fall back to requestMediaLibraryPermissionsAsync when the status
        // is not yet known (first ever open) or was previously denied.
        let granted = mediaLibraryPermRef.current;
        if (granted === null || granted === false) {
          const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
          granted = perm.granted;
          mediaLibraryPermRef.current = granted;
        }
        if (!granted) { Alert.alert("Permission needed", "Gallery access is required."); return; }
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ["images"],
          allowsEditing: useNativeEditor,
          aspect: [1, 1],
          quality: 0.8,
        });
      }
      if (result.canceled || !result.assets?.[0]) return;
      const rawUri = result.assets[0].uri;

      // On Android: show the custom crop modal; upload happens in handleCropConfirm.
      if (Platform.OS === "android") {
        setPendingImageUri(rawUri);
        setCropModalOpen(true);
        return;
      }

      // iOS: proceed directly with the natively-cropped image.
      await uploadCroppedPhoto(rawUri);
    } catch (error: any) {
      if (photoURL) setAvatar(photoURL); else clearAvatar();
      Alert.alert("Error", `Could not update photo: ${error.message}`);
    }
  }, [photoURL, setAvatar, clearAvatar, uploadCroppedPhoto]);

  // ── Photo remove (optimistic) ──────────────────────────────────────────────
  const handleRemovePhoto = useCallback(async () => {
    if (!user?.id) return;
    setPhotoModalOpen(false);
    const prevUrl = photoURL;

    clearAvatar();
    setPhotoURL(null);

    try {
      if (prevUrl) {
        // Delete from Supabase Storage when the photo belongs to this app.
        const { deleteProfilePhoto } = await import("@/services/storage/storage-service");
        deleteProfilePhoto(user.id, prevUrl).catch(() => {});
      }
      await updateUserPhotoURL(user.id, null);
      try {
        const { supabase } = await import("@/lib/supabase");
        await supabase.auth.updateUser({
          data: {
            avatar_url: null,
            photo_url: null,
            custom_avatar_url: null,
          },
        });
      } catch {}
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
      await loadStats(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setRefreshing(false);
  }, [refreshing, loadStats]);

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
  }, [signOut, clearAvatar]);

  const initials = useMemo(
    () => user?.displayName
      ? user.displayName.split(" ").map((n: string) => n[0]).join("").toUpperCase().slice(0, 2)
      : "?",
    [user?.displayName]
  );

  const canRemovePhoto = useMemo(() => isUserUploadedPhoto(photoURL), [photoURL]);
  const hasGooglePhoto = useMemo(() => {
    if (!photoURL) return false;
    const l = photoURL.toLowerCase();
    return l.includes("googleusercontent.com") || l.includes("google.com") || l.includes("gstatic.com");
  }, [photoURL]);

  const canChangeUsername = useMemo(() => {
    if (!usernameLastChangedAt) return true;
    const daysSince = (Date.now() - new Date(usernameLastChangedAt).getTime()) / 86400000;
    return daysSince >= 15;
  }, [usernameLastChangedAt]);

  const daysUntilUsernameChange = useMemo(() => {
    if (!usernameLastChangedAt) return 0;
    const daysSince = (Date.now() - new Date(usernameLastChangedAt).getTime()) / 86400000;
    return daysSince >= 15 ? 0 : Math.ceil(15 - daysSince);
  }, [usernameLastChangedAt]);

  return {
    user,
    stats,
    statsLoading,
    photoURL,
    canRemovePhoto,
    hasGooglePhoto,
    photoModalOpen,
    setPhotoModalOpen,
    uploadingPhoto,
    // Android custom crop modal
    cropModalOpen,
    pendingImageUri,
    handleCropConfirm,
    handleCropCancel,
    currentUsername,
    usernameLastChangedAt,
    canChangeUsername,
    daysUntilUsernameChange,
    initials,
    refreshing,
    handleRefresh,
    handlePickPhoto,
    handleRemovePhoto,
    handleSignOut,
  };
}
