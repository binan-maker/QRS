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
import {
  getWebSupabase,
  isWebSupabaseConfigured,
  SUPABASE_TABLES,
  SUPABASE_BUCKETS,
} from "./supabase";

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
    try {
      if (user?.id) {
        return (
          localStorage.getItem(`${CUSTOM_AVATAR_PREFIX}${user.id}`) ||
          localStorage.getItem(`${USER_AVATAR_PREFIX}${user.id}`) ||
          null
        );
      }
    } catch {}
    return null;
  });
  const [version, setVersion] = useState<number>(0);
  const [isHydrated, setIsHydrated] = useState(false);
  const [uploading, setUploading] = useState(false);

  // Initialize and synchronize avatar from Supabase DB (authoritative)
  useEffect(() => {
    if (typeof window === "undefined") return;

    const cachedVer = localStorage.getItem(AVATAR_VER_KEY);
    if (cachedVer) setVersion(Number(cachedVer));

    if (!user?.id) {
      setAvatarUrl(null);
      setIsHydrated(true);
      return;
    }

    let active = true;
    const customKey = `${CUSTOM_AVATAR_PREFIX}${user.id}`;
    const userKey = `${USER_AVATAR_PREFIX}${user.id}`;

    // 1. Immediately hydrate from user-specific local storage without delay
    const initialLocal =
      localStorage.getItem(customKey) || localStorage.getItem(userKey);
    if (initialLocal && active) {
      setAvatarUrl(initialLocal);
    }

    // 2. Fetch authoritative photo from public.users table in Supabase
    const resolveAvatar = async () => {
      if (!isWebSupabaseConfigured()) {
        if (active) setIsHydrated(true);
        return;
      }

      try {
        const supabase = getWebSupabase();
        const { data } = await supabase
          .from("users")
          .select("photo_url, avatar_url")
          .eq("id", user.id)
          .maybeSingle();

        if (!active) return;

        const dbPhoto = data?.photo_url || data?.avatar_url || null;

        if (dbPhoto) {
          setAvatarUrl(dbPhoto);
          localStorage.setItem(customKey, dbPhoto);
          localStorage.setItem(userKey, dbPhoto);
          localStorage.setItem(AVATAR_URL_KEY, dbPhoto);
          try {
            const profKey = `binro_profile_${user.id}`;
            const existing = localStorage.getItem(profKey);
            const parsed = existing ? JSON.parse(existing) : {};
            parsed.photoUrl = dbPhoto;
            localStorage.setItem(profKey, JSON.stringify(parsed));
          } catch {}
        } else if (data && dbPhoto === null) {
          // User explicitly removed or does not have a photo in DB
          setAvatarUrl(null);
          localStorage.removeItem(customKey);
          localStorage.removeItem(userKey);
          localStorage.removeItem(AVATAR_URL_KEY);
          try {
            const profKey = `binro_profile_${user.id}`;
            const existing = localStorage.getItem(profKey);
            if (existing) {
              const parsed = JSON.parse(existing);
              parsed.photoUrl = null;
              localStorage.setItem(profKey, JSON.stringify(parsed));
            }
          } catch {}
        }
      } catch (err) {
        console.warn("[avatar] Error resolving avatar from DB:", err);
      } finally {
        if (active) setIsHydrated(true);
      }
    };

    resolveAvatar();

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
  }, [user?.id]);

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
          try {
            const pKey = `binro_profile_${user.id}`;
            const ex = localStorage.getItem(pKey);
            const p = ex ? JSON.parse(ex) : {};
            p.photoUrl = newUrl;
            localStorage.setItem(pKey, JSON.stringify(p));
          } catch {}
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
            try {
              const pKey = `binro_profile_${user.id}`;
              const ex = localStorage.getItem(pKey);
              const p = ex ? JSON.parse(ex) : {};
              p.photoUrl = newUrl;
              localStorage.setItem(pKey, JSON.stringify(p));
            } catch {}
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
        try {
          const pKey = `binro_profile_${user.id}`;
          const ex = localStorage.getItem(pKey);
          if (ex) {
            const p = JSON.parse(ex);
            p.photoUrl = null;
            localStorage.setItem(pKey, JSON.stringify(p));
          }
        } catch {}
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
            const filenameOnly = `${Date.now()}_avatar.jpg`;
            const filename = `${user.id}/${filenameOnly}`;

            // Convert base64 dataUrl to blob
            const res = await fetch(dataUrl);
            const blob = await res.blob();

            // Upload to canonical "avatars" bucket
            const uploadRes = await supabase.storage
              .from(SUPABASE_BUCKETS.AVATARS)
              .upload(filename, blob, {
                upsert: true,
                contentType: "image/jpeg",
                cacheControl: "3600",
              });

            if (!uploadRes.error) {
              const { data: pubData } = supabase.storage
                .from(SUPABASE_BUCKETS.AVATARS)
                .getPublicUrl(filename);
              if (pubData?.publicUrl) {
                finalUrl = pubData.publicUrl;
              }

              // ── IMMEDIATELY DELETE ALL PAST AVATARS FROM STORAGE ──
              try {
                const { data: existingList } = await supabase.storage
                  .from(SUPABASE_BUCKETS.AVATARS)
                  .list(user.id);
                if (existingList && existingList.length > 0) {
                  const oldFiles = existingList
                    .filter((item) => item.name && item.name !== filenameOnly)
                    .map((item) => `${user.id}/${item.name}`);
                  if (oldFiles.length > 0) {
                    await supabase.storage.from(SUPABASE_BUCKETS.AVATARS).remove(oldFiles);
                  }
                }
              } catch {}

              // Server-side admin fallback to guarantee storage cleanup
              try {
                const { data: sessionData } = await supabase.auth.getSession();
                const token = sessionData?.session?.access_token;
                if (token) {
                  void fetch("/api/user/avatar/delete-previous", {
                    method: "POST",
                    headers: {
                      "Content-Type": "application/json",
                      Authorization: `Bearer ${token}`,
                    },
                    body: JSON.stringify({ excludeFileName: filenameOnly }),
                  });
                }
              } catch {}
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
              .from(SUPABASE_TABLES.USERS)
              .update({
                photo_url: finalUrl,
                avatar_url: finalUrl,
                updated_at: new Date().toISOString(),
              })
              .eq("id", user.id);

            if (updateErr) {
              await supabase.from(SUPABASE_TABLES.USERS).upsert({
                id: user.id,
                email: user.email || `${user.id}@users.binro.app`,
                display_name:
                  user.user_metadata?.display_name ||
                  user.user_metadata?.full_name ||
                  user.email?.split("@")[0] ||
                  "User",
                photo_url: finalUrl,
                avatar_url: finalUrl,
                updated_at: new Date().toISOString(),
              });
            }

            // Only store remote URLs in auth metadata to avoid exceeding GoTrue's 32KB user_metadata limit
            if (!finalUrl.startsWith("data:")) {
              await supabase.auth.updateUser({
                data: {
                  avatar_url: finalUrl,
                  photo_url: finalUrl,
                  custom_avatar_url: finalUrl,
                },
              });
            }
          } catch (dbErr) {
            console.warn("[avatar] Could not update users DB table:", dbErr);
          }
        }

        // 4. Update local state & storage and dispatch update
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

        // ── IMMEDIATELY DELETE ALL AVATAR FILES FROM STORAGE ──
        try {
          const { data: existingList } = await supabase.storage
            .from(SUPABASE_BUCKETS.AVATARS)
            .list(user.id);
          if (existingList && existingList.length > 0) {
            const allFiles = existingList.map((item) => `${user.id}/${item.name}`);
            await supabase.storage.from(SUPABASE_BUCKETS.AVATARS).remove(allFiles);
          }
        } catch {}

        try {
          const { data: sessionData } = await supabase.auth.getSession();
          const token = sessionData?.session?.access_token;
          if (token) {
            void fetch("/api/user/avatar/delete-previous", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ excludeFileName: "" }),
            });
          }
        } catch {}

        await supabase
          .from(SUPABASE_TABLES.USERS)
          .update({
            photo_url: null,
            avatar_url: null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", user.id);

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
