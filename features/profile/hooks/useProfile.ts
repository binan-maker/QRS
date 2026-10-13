import { useState, useEffect, useCallback, useMemo } from "react";
import { Alert, Platform } from "react-native";
import { router } from "expo-router";
import * as ImagePicker from "expo-image-picker";
import * as Haptics from "@/shared/utils/haptics";
import { useAuth } from "@/shared/contexts/AuthContext";
import { useAvatar, isUserUploadedPhoto, pickBestPhotoUrl } from "@/shared/contexts/AvatarContext";
import { updateUserPhotoURL, getUserPhotoURL } from "@/lib/data-service";
import { invalidateUserCache } from "@/services/cache/qr-cache";

export { isUserUploadedPhoto };

function base64ToBuffer(b64: string): ArrayBuffer {
  if (typeof Buffer !== "undefined") {
    const buf = Buffer.from(b64, "base64");
    return buf.buffer.slice(buf.byteOffset, buf.byteOffset + buf.byteLength);
  }
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes.buffer;
}

export function useProfile() {
  const { user, signOut } = useAuth();
  const { url: avatarUrl, setAvatar, syncAvatar, clearAvatar } = useAvatar();

  const [photoURL, setPhotoURL] = useState<string | null>(() => pickBestPhotoUrl(avatarUrl, user?.photoURL));
  const [photoModalOpen, setPhotoModalOpen] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [cropModalOpen, setCropModalOpen] = useState(false);
  const [pendingImageUri, setPendingImageUri] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const currentUsername = useMemo(() => user?.username || null, [user?.username]);

  // Keep local photoURL in sync with authoritative contexts
  useEffect(() => {
    const best = pickBestPhotoUrl(avatarUrl, user?.photoURL);
    setPhotoURL(best || null);
  }, [avatarUrl, user?.photoURL, user?.id]);

  const uploadCroppedPhoto = useCallback(async (uri: string) => {
    if (!user?.id) return;
    const prevUrl = photoURL;
    setAvatar(uri);
    setUploadingPhoto(true);
    try {
      const { manipulateAsync, SaveFormat } = await import("expo-image-manipulator");
      const manipulated = await manipulateAsync(
        uri,
        [{ resize: { width: 512, height: 512 } }],
        { compress: 0.85, format: SaveFormat.JPEG, base64: true }
      );
      if (!manipulated.base64) throw new Error("Could not process selected image");

      const { uploadProfilePhoto } = await import("@/services/storage/storage-service");
      let newPhotoUrl: string;
      try {
        newPhotoUrl = await uploadProfilePhoto(
          base64ToBuffer(manipulated.base64),
          user.id,
          prevUrl ?? undefined,
          { contentType: "image/jpeg" }
        );
      } catch {
        newPhotoUrl = `data:image/jpeg;base64,${manipulated.base64}`;
      }

      await updateUserPhotoURL(user.id, newPhotoUrl);

      if (!newPhotoUrl.startsWith("data:")) {
        const { supabase } = await import("@/lib/core/supabase");
        await supabase.auth.updateUser({
          data: { avatar_url: newPhotoUrl, photo_url: newPhotoUrl, custom_avatar_url: newPhotoUrl },
        }).catch(() => {});
      }

      setPhotoURL(newPhotoUrl);
      setAvatar(newPhotoUrl);
      invalidateUserCache(user.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (err: any) {
      if (prevUrl) setAvatar(prevUrl); else clearAvatar();
      Alert.alert("Error", `Could not update photo: ${err.message}`);
    } finally {
      setUploadingPhoto(false);
    }
  }, [user?.id, photoURL, setAvatar, clearAvatar]);

  const handleCropConfirm = useCallback(async (croppedUri: string) => {
    setCropModalOpen(false);
    setPendingImageUri(null);
    await uploadCroppedPhoto(croppedUri);
  }, [uploadCroppedPhoto]);

  const handleCropCancel = useCallback(() => {
    setCropModalOpen(false);
    setPendingImageUri(null);
  }, []);

  const handlePickPhoto = useCallback(async (source: "camera" | "gallery") => {
    setPhotoModalOpen(false);
    try {
      const isCam = source === "camera";
      const perm = isCam
        ? await ImagePicker.requestCameraPermissionsAsync()
        : await ImagePicker.requestMediaLibraryPermissionsAsync();

      if (!perm.granted) {
        Alert.alert("Permission needed", `${isCam ? "Camera" : "Gallery"} access is required.`);
        return;
      }

      const opts = {
        mediaTypes: ["images" as const],
        allowsEditing: Platform.OS !== "android",
        aspect: [1, 1] as [number, number],
        quality: 0.8,
      };
      const result = isCam
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync(opts);

      if (result.canceled || !result.assets?.[0]) return;
      const rawUri = result.assets[0].uri;

      if (Platform.OS === "android") {
        setPendingImageUri(rawUri);
        setCropModalOpen(true);
        return;
      }
      await uploadCroppedPhoto(rawUri);
    } catch (err: any) {
      if (photoURL) setAvatar(photoURL); else clearAvatar();
      Alert.alert("Error", `Could not update photo: ${err.message}`);
    }
  }, [photoURL, setAvatar, clearAvatar, uploadCroppedPhoto]);

  const handleRemovePhoto = useCallback(async () => {
    if (!user?.id) return;
    setPhotoModalOpen(false);
    const prevUrl = photoURL;
    clearAvatar();
    setPhotoURL(null);
    try {
      if (prevUrl) {
        const { deleteProfilePhoto } = await import("@/services/storage/storage-service");
        deleteProfilePhoto(user.id, prevUrl).catch(() => {});
      }
      await updateUserPhotoURL(user.id, null);
      const { supabase } = await import("@/lib/core/supabase");
      await supabase.auth.updateUser({
        data: { avatar_url: null, photo_url: null, custom_avatar_url: null },
      }).catch(() => {});
      invalidateUserCache(user.id);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {
      if (prevUrl) setAvatar(prevUrl);
      setPhotoURL(prevUrl);
    }
  }, [user?.id, photoURL, clearAvatar, setAvatar]);

  const handleRefresh = useCallback(async () => {
    if (refreshing) return;
    setRefreshing(true);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      if (user?.id) {
        const photo = await getUserPhotoURL(user.id);
        if (photo) {
          setPhotoURL(photo);
          syncAvatar(photo);
        }
      }
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch {}
    setRefreshing(false);
  }, [refreshing, user?.id, syncAvatar]);

  const handleSignOut = useCallback(() => {
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
    () => user?.displayName ? user.displayName.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2) : "?",
    [user?.displayName]
  );
  const canRemovePhoto = useMemo(() => isUserUploadedPhoto(photoURL), [photoURL]);
  const hasGooglePhoto = useMemo(() => {
    if (!photoURL) return false;
    const l = photoURL.toLowerCase();
    return l.includes("googleusercontent.com") || l.includes("google.com") || l.includes("gstatic.com");
  }, [photoURL]);

  return {
    user,
    stats: { scanCount: 0, commentCount: 0, totalLikesReceived: 0 },
    statsLoading: false,
    photoURL,
    canRemovePhoto,
    hasGooglePhoto,
    photoModalOpen,
    setPhotoModalOpen,
    uploadingPhoto,
    cropModalOpen,
    pendingImageUri,
    handleCropConfirm,
    handleCropCancel,
    currentUsername,
    usernameLastChangedAt: null,
    canChangeUsername: true,
    daysUntilUsernameChange: 0,
    initials,
    refreshing,
    handleRefresh,
    handlePickPhoto,
    handleRemovePhoto,
    handleSignOut,
  };
}
