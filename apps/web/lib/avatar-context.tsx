"use client";

import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  useMemo,
  type ReactNode,
} from "react";
import { useAuth } from "./auth-context";
import { getWebSupabase, isWebSupabaseConfigured } from "./supabase";

const AVATAR_URL_KEY = "qrg:avatar:url";
const AVATAR_VER_KEY = "qrg:avatar:version";
const CUSTOM_AVATAR_PREFIX = "user_custom_avatar_";
const USER_AVATAR_PREFIX = "user_avatar_";

export function isUserUploadedPhoto(url?: string | null): boolean {
  if (!url || typeof url !== "string") return false;
  const trimmed = url.trim().toLowerCase();
  if (!trimmed) return false;
  if (
    trimmed.includes("googleusercontent.com") ||
    trimmed.includes("google.com") ||
    trimmed.includes("gstatic.com")
  ) {
    return false;
  }
  if (
    trimmed.includes("placeholder") ||
    trimmed.includes("default-avatar") ||
    trimmed.includes("ui-avatars.com")
  ) {
    return false;
  }
  return true;
}

function stripQuery(url: string): string {
  try {
    const idx = url.indexOf("?");
    return idx === -1 ? url : url.slice(0, idx);
  } catch {
    return url;
  }
}

interface AvatarContextState {
  avatarUrl: string | null;
  cachedUrl: string | null;
  version: number;
  isHydrated: boolean;
  uploading: boolean;
  hasCustomAvatar: boolean;
  setAvatar: (url: string) => void;
  syncAvatar: (url: string | null) => void;
  clearAvatar: () => void;
  uploadAvatar: (file: File) => Promise<string>;
  removeAvatar: () => Promise<void>;
}

const AvatarContext = createContext<AvatarContextState>({
  avatarUrl: null,
  cachedUrl: null,
  version: 0,
  isHydrated: false,
  uploading: false,
  hasCustomAvatar: false,
  setAvatar: () => {},
  syncAvatar: () => {},
  clearAvatar: () => {},
  uploadAvatar: async () => "",
  removeAvatar: async () => {},
});

export function AvatarProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();

  const [avatarUrl, setAvatarUrl] = useState<string | null>(() => {
    if (typeof window === "undefined") return null;
    return (
      localStorage.getItem(AVATAR_URL_KEY) ||
      localStorage.getItem("user_avatar_custom") ||
      null
    );
  });

  const [version, setVersion] = useState<number>(() => {
    if (typeof window === "undefined") return 0;
    const v = localStorage.getItem(AVATAR_VER_KEY);
    return v ? Number(v) : 0;
  });

  const [isHydrated, setIsHydrated] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Initialize and synchronize avatar from user auth metadata or Supabase DB
  useEffect(() => {
    if (typeof window === "undefined") return;

    let active = true;

    const resolveAvatar = async () => {
      const customKey = user?.id ? `${CUSTOM_AVATAR_PREFIX}${user.id}` : null;
      const userKey = user?.id ? `${USER_AVATAR_PREFIX}${user.id}` : null;

      // 1. Check local storage for user-specific custom uploaded photo
      const customLocal = customKey ? localStorage.getItem(customKey) : null;
      const cachedLocal =
        customLocal ||
        (userKey ? localStorage.getItem(userKey) : null) ||
        localStorage.getItem(AVATAR_URL_KEY);

      if (customLocal && active) {
        setAvatarUrl(customLocal);
      } else if (cachedLocal && isUserUploadedPhoto(cachedLocal) && active) {
        setAvatarUrl(cachedLocal);
      }

      // 2. Check public.users table in Supabase — prefer app-uploaded photos over Google auth icons
      let dbPhoto: string | null = null;
      if (user?.id && isWebSupabaseConfigured()) {
        try {
          const supabase = getWebSupabase();
          const { data } = await supabase
            .from("users")
            .select("photo_url")
            .eq("id", user.id)
            .maybeSingle();

          if (data?.photo_url) {
            dbPhoto = data.photo_url;
          }
        } catch {
          // Ignore network or DB error
        }
      }

      if (!active) return;

      // If database has a verified user-uploaded photo, prioritize it over Google auth icon
      if (dbPhoto && isUserUploadedPhoto(dbPhoto)) {
        setAvatarUrl(dbPhoto);
        localStorage.setItem(AVATAR_URL_KEY, dbPhoto);
        if (customKey) localStorage.setItem(customKey, dbPhoto);
        if (userKey) localStorage.setItem(userKey, dbPhoto);
        setIsHydrated(true);
        return;
      }

      // If local storage has an uploaded photo, prioritize it over Google auth icon
      if (customLocal) {
        setAvatarUrl(customLocal);
        setIsHydrated(true);
        return;
      }

      if (cachedLocal && isUserUploadedPhoto(cachedLocal)) {
        setAvatarUrl(cachedLocal);
        setIsHydrated(true);
        return;
      }

      // 3. Fallback only when NO custom photo was ever uploaded: Google OAuth or other provider photo
      const authMetaPhoto =
        user?.user_metadata?.custom_avatar_url ||
        dbPhoto ||
        user?.user_metadata?.avatar_url ||
        user?.user_metadata?.picture ||
        user?.user_metadata?.photo_url ||
        user?.user_metadata?.photoURL ||
        null;

      if (authMetaPhoto && active) {
        setAvatarUrl(authMetaPhoto);
        if (user?.user_metadata?.custom_avatar_url && customKey) {
          localStorage.setItem(customKey, authMetaPhoto);
        }
        if (userKey) localStorage.setItem(userKey, authMetaPhoto);
      }

      if (active) setIsHydrated(true);
    };

    resolveAvatar();

    // Listen to custom cross-component update events
    const handleAvatarUpdated = (e: Event) => {
      const customEvent = e as CustomEvent<{ url: string | null }>;
      if (customEvent.detail !== undefined) {
        setAvatarUrl(customEvent.detail.url);
        setVersion(Date.now());
      }
    };

    window.addEventListener("binro_avatar_updated", handleAvatarUpdated);

    return () => {
      active = false;
      window.removeEventListener("binro_avatar_updated", handleAvatarUpdated);
    };
  }, [user?.id, user?.user_metadata]);

  const setAvatar = useCallback(
    (newUrl: string) => {
      const v = Date.now();
      setAvatarUrl(newUrl);
      setVersion(v);
      if (typeof window !== "undefined") {
        localStorage.setItem(AVATAR_URL_KEY, newUrl);
        localStorage.setItem(AVATAR_VER_KEY, String(v));
        if (user?.id) {
          localStorage.setItem(`${CUSTOM_AVATAR_PREFIX}${user.id}`, newUrl);
          localStorage.setItem(`${USER_AVATAR_PREFIX}${user.id}`, newUrl);
        }
        window.dispatchEvent(
          new CustomEvent("binro_avatar_updated", { detail: { url: newUrl } })
        );
      }
    },
    [user?.id]
  );

  const syncAvatar = useCallback(
    (newUrl: string | null) => {
      if (!newUrl) return;
      setAvatarUrl((prev) => {
        if (prev !== null && stripQuery(prev) === stripQuery(newUrl)) {
          return prev;
        }
        const v = Date.now();
        setVersion(v);
        if (typeof window !== "undefined") {
          localStorage.setItem(AVATAR_URL_KEY, newUrl);
          localStorage.setItem(AVATAR_VER_KEY, String(v));
          if (user?.id) {
            if (isUserUploadedPhoto(newUrl)) {
              localStorage.setItem(`${CUSTOM_AVATAR_PREFIX}${user.id}`, newUrl);
            }
            localStorage.setItem(`${USER_AVATAR_PREFIX}${user.id}`, newUrl);
          }
        }
        return newUrl;
      });
    },
    [user?.id]
  );

  const clearAvatar = useCallback(() => {
    setAvatarUrl(null);
    setVersion(0);
    if (typeof window !== "undefined") {
      localStorage.removeItem(AVATAR_URL_KEY);
      localStorage.removeItem(AVATAR_VER_KEY);
      if (user?.id) {
        localStorage.removeItem(`${CUSTOM_AVATAR_PREFIX}${user.id}`);
        localStorage.removeItem(`${USER_AVATAR_PREFIX}${user.id}`);
      }
      window.dispatchEvent(
        new CustomEvent("binro_avatar_updated", { detail: { url: null } })
      );
    }
  }, [user?.id]);

  // Upload an avatar: downscale on client canvas, upload to Supabase, update DB & auth metadata
  const uploadAvatar = useCallback(
    async (file: File): Promise<string> => {
      setUploading(true);
      try {
        // 1. Client-side canvas resize to 512x512 JPEG for crisp rendering and optimal size
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            const img = new Image();
            img.onload = () => {
              const canvas = document.createElement("canvas");
              const size = 512;
              canvas.width = size;
              canvas.height = size;
              const ctx = canvas.getContext("2d");
              if (!ctx) {
                resolve(e.target?.result as string);
                return;
              }

              // Center crop square
              const minDim = Math.min(img.width, img.height);
              const sx = (img.width - minDim) / 2;
              const sy = (img.height - minDim) / 2;
              ctx.drawImage(img, sx, sy, minDim, minDim, 0, 0, size, size);

              const compressed = canvas.toDataURL("image/jpeg", 0.9);
              resolve(compressed);
            };
            img.onerror = () => reject(new Error("Failed to load image for cropping"));
            img.src = e.target?.result as string;
          };
          reader.onerror = () => reject(new Error("Failed to read file"));
          reader.readAsDataURL(file);
        });

        let finalUrl = dataUrl;

        // 2. Upload to Supabase Storage if configured
        if (isWebSupabaseConfigured() && user?.id) {
          try {
            const supabase = getWebSupabase();
            const filename = `${user.id}/${Date.now()}_avatar.jpg`;

            // Convert base64 dataUrl to blob
            const res = await fetch(dataUrl);
            const blob = await res.blob();

            // Try "avatars" first, and "profile-photos" as fallback
            let uploadRes = await supabase.storage
              .from("avatars")
              .upload(filename, blob, {
                upsert: true,
                contentType: "image/jpeg",
                cacheControl: "3600",
              });

            let usedBucket = "avatars";
            if (uploadRes.error) {
              const retryRes = await supabase.storage
                .from("profile-photos")
                .upload(filename, blob, {
                  upsert: true,
                  contentType: "image/jpeg",
                  cacheControl: "3600",
                });
              if (!retryRes.error) {
                uploadRes = retryRes;
                usedBucket = "profile-photos";
              }
            }

            if (!uploadRes.error) {
              const { data: pubData } = supabase.storage
                .from(usedBucket)
                .getPublicUrl(filename);
              if (pubData?.publicUrl) {
                finalUrl = pubData.publicUrl;
              }
            } else {
              console.warn(
                "[avatar] Storage bucket upload note, using inline optimized data URL:",
                uploadRes.error.message
              );
            }
          } catch (storageErr) {
            console.warn("[avatar] Supabase storage upload exception:", storageErr);
          }

          // 3. Persist to public.users table and Auth metadata
          try {
            const supabase = getWebSupabase();
            const { error: updateErr } = await supabase
              .from("users")
              .update({
                photo_url: finalUrl,
                updated_at: new Date().toISOString(),
              })
              .eq("id", user.id);

            if (updateErr) {
              await supabase.from("users").upsert({
                id: user.id,
                email: user.email || `${user.id}@users.binro.app`,
                display_name:
                  user.user_metadata?.display_name ||
                  user.user_metadata?.full_name ||
                  user.email?.split("@")[0] ||
                  "User",
                photo_url: finalUrl,
                updated_at: new Date().toISOString(),
              });
            }

            try {
              await supabase
                .from("public_profiles")
                .update({ photo_url: finalUrl })
                .eq("id", user.id);
            } catch {}

            await supabase.auth.updateUser({
              data: {
                avatar_url: finalUrl,
                photo_url: finalUrl,
                custom_avatar_url: finalUrl,
              },
            });
          } catch (dbErr) {
            console.warn("[avatar] Could not update users DB table:", dbErr);
          }
        }

        // 4. Update local state & storage
        setAvatar(finalUrl);
        return finalUrl;
      } finally {
        setUploading(false);
      }
    },
    [user, setAvatar]
  );

  const removeAvatar = useCallback(async () => {
    clearAvatar();
    if (user?.id && isWebSupabaseConfigured()) {
      try {
        const supabase = getWebSupabase();
        await supabase
          .from("users")
          .update({ photo_url: null, updated_at: new Date().toISOString() })
          .eq("id", user.id);

        try {
          await supabase
            .from("public_profiles")
            .update({ photo_url: null })
            .eq("id", user.id);
        } catch {}

        await supabase.auth.updateUser({
          data: {
            avatar_url: null,
            photo_url: null,
            custom_avatar_url: null,
          },
        });
      } catch (err) {
        console.warn("[avatar] Remove photo error:", err);
      }
    }
  }, [user?.id, clearAvatar]);

  const cachedUrl = useMemo(() => {
    if (!avatarUrl) return null;
    if (avatarUrl.startsWith("data:")) return avatarUrl;
    return version ? `${avatarUrl}${avatarUrl.includes("?") ? "&" : "?"}v=${version}` : avatarUrl;
  }, [avatarUrl, version]);

  const hasCustomAvatar = useMemo(() => isUserUploadedPhoto(avatarUrl), [avatarUrl]);

  const value = useMemo(
    () => ({
      avatarUrl,
      cachedUrl,
      version,
      isHydrated,
      uploading,
      hasCustomAvatar,
      setAvatar,
      syncAvatar,
      clearAvatar,
      uploadAvatar,
      removeAvatar,
    }),
    [
      avatarUrl,
      cachedUrl,
      version,
      isHydrated,
      uploading,
      hasCustomAvatar,
      setAvatar,
      syncAvatar,
      clearAvatar,
      uploadAvatar,
      removeAvatar,
    ]
  );

  return <AvatarContext.Provider value={value}>{children}</AvatarContext.Provider>;
}

export function useAvatar() {
  return useContext(AvatarContext);
}
