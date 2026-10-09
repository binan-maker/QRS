"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo, useRef } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { getWebSupabase, isWebSupabaseConfigured } from "./supabase";
import { isUserUploadedPhoto } from "./avatar-context";
import { validateEmail } from "@shared/utils/email-validator";

export interface UserProfile {
  id: string;
  email?: string;
  displayName: string;
  username: string;
  photoUrl?: string | null;
}

export interface AuthContextType {
  user: User | null;
  profile: UserProfile | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User; session: Session }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ user: User; session: Session | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<{ provider: string; url: string | null } | null>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  refreshUser: () => Promise<User | null>;
  refreshProfile: () => Promise<UserProfile | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const syncInFlightRef = useRef<Map<string, Promise<UserProfile | null>>>(new Map());

  // Internal profile sync implementation
  const performSyncUserProfile = useCallback(async (u: User): Promise<UserProfile | null> => {
    // Immediately reject and sign out if the user account was marked deleted in auth metadata
    if (
      u?.user_metadata?.is_deleted === true ||
      u?.user_metadata?.account_deleted === true ||
      Boolean(u?.user_metadata?.deleted_at)
    ) {
      if (isWebSupabaseConfigured()) {
        const supabase = getWebSupabase();
        await supabase.auth.signOut().catch(() => {});
      }
      setUser(null);
      setSession(null);
      setProfile(null);
      throw new Error("This account has been permanently deleted.");
    }

    // Block disposable email addresses even if authenticated via external OAuth
    if (u?.email) {
      const emailValidation = validateEmail(u.email);
      if (!emailValidation.valid) {
        if (isWebSupabaseConfigured()) {
          const supabase = getWebSupabase();
          await supabase.auth.signOut();
        }
        setUser(null);
        setSession(null);
        setProfile(null);
        throw new Error(emailValidation.reason || "Temporary and disposable email addresses are not permitted.");
      }
    }

    // 1. Try restoring from local storage cache immediately
    if (typeof window !== "undefined" && u?.id) {
      try {
        const cached = localStorage.getItem(`binro_profile_${u.id}`);
        if (cached) {
          const parsed = JSON.parse(cached) as UserProfile;
          if (parsed && parsed.username) {
            setProfile(parsed);
          }
        }
      } catch {}
    }

    const localCustom =
      typeof window !== "undefined"
        ? localStorage.getItem(`user_custom_avatar_${u.id}`) ||
          localStorage.getItem(`user_avatar_${u.id}`)
        : null;

    const metaPhoto =
      u.user_metadata?.custom_avatar_url ||
      (localCustom && isUserUploadedPhoto(localCustom) ? localCustom : null) ||
      u.user_metadata?.avatar_url ||
      u.user_metadata?.picture ||
      u.user_metadata?.photo_url ||
      u.user_metadata?.photoURL ||
      null;

    const displayName =
      u.user_metadata?.full_name ||
      u.user_metadata?.name ||
      u.user_metadata?.display_name ||
      u.email?.split("@")[0] ||
      "User";

    // Format clean base username complying with rules (starts with letter, 3-16 chars)
    const rawSeed = (u.user_metadata?.username || u.email?.split("@")[0] || displayName || "user");
    let safeBase = rawSeed
      .toLowerCase()
      .replace(/^@+/, "")
      .replace(/\s+/g, "")
      .replace(/[^a-z0-9_]/g, "");
    if (!safeBase || !/^[a-z]/.test(safeBase)) {
      safeBase = `u_${safeBase || "user"}`;
    }
    if (safeBase.length < 3) {
      safeBase = `${safeBase}_user`.slice(0, 16);
    } else if (safeBase.length > 16) {
      safeBase = safeBase.slice(0, 16);
    }

    let resolvedProfile: UserProfile = {
      id: u.id,
      email: u.email,
      displayName,
      username: safeBase,
      photoUrl: metaPhoto,
    };

    if (!isWebSupabaseConfigured()) {
      setProfile(resolvedProfile);
      return resolvedProfile;
    }

    const supabase = getWebSupabase();
    try {
      const { data: existing } = await supabase
        .from("users")
        .select("id, photo_url, avatar_url, username, display_name, is_deleted, deleted_at")
        .eq("id", u.id)
        .maybeSingle();

      // Bug #3 Fix: If the user row in public.users was marked deleted, immediately sign out
      // and never allow the deleted account to reactivate as "Deleted User"
      if (
        existing?.is_deleted === true ||
        Boolean(existing?.deleted_at) ||
        existing?.display_name === "Deleted User"
      ) {
        await supabase.auth.signOut().catch(() => {});
        setUser(null);
        setSession(null);
        setProfile(null);
        if (typeof window !== "undefined") {
          localStorage.removeItem(`binro_profile_${u.id}`);
        }
        return null;
      }

      const existingPhoto = existing?.photo_url || existing?.avatar_url;
      const effectivePhoto = (existingPhoto && isUserUploadedPhoto(existingPhoto))
        ? existingPhoto
        : (metaPhoto || existingPhoto);

      let effectiveUsername = existing?.username;
      if (effectiveUsername) {
        effectiveUsername = String(effectiveUsername)
          .replace(/^@+/, "")
          .replace(/\s+/g, "")
          .replace(/[^a-zA-Z0-9_]/g, "")
          .toLowerCase();
      }

      if (!effectiveUsername) {
        // Resolve collision-free username against users and usernames tables
        let candidate = safeBase;
        const { data: takenUser } = await supabase
          .from("users")
          .select("id")
          .ilike("username", candidate)
          .neq("id", u.id)
          .maybeSingle();

        const { data: takenUname } = await supabase
          .from("usernames")
          .select("user_id")
          .ilike("username", candidate)
          .neq("user_id", u.id)
          .maybeSingle();

        if (takenUser || takenUname) {
          for (let i = 0; i < 5; i++) {
            const num = Math.floor(100 + Math.random() * 899);
            const suffixed = `${safeBase.slice(0, 15)}_${num}`.slice(0, 20);
            const { data: cl1 } = await supabase.from("users").select("id").ilike("username", suffixed).maybeSingle();
            const { data: cl2 } = await supabase.from("usernames").select("user_id").ilike("username", suffixed).maybeSingle();
            if (!cl1 && !cl2) {
              candidate = suffixed;
              break;
            }
          }
        }
        effectiveUsername = candidate;
      }

      const effectiveDisplayName = existing?.display_name || displayName;

      resolvedProfile = {
        id: u.id,
        email: u.email,
        displayName: effectiveDisplayName,
        username: effectiveUsername,
        photoUrl: effectivePhoto,
      };

      setProfile(resolvedProfile);
      if (typeof window !== "undefined") {
        try {
          localStorage.setItem(`binro_profile_${u.id}`, JSON.stringify(resolvedProfile));
        } catch {}
      }

      const now = new Date().toISOString();
      if (!existing) {
        const { error: insertErr } = await supabase.from("users").insert({
          id: u.id,
          email: u.email,
          display_name: effectiveDisplayName,
          username: effectiveUsername,
          photo_url: effectivePhoto,
          avatar_url: effectivePhoto,
          created_at: now,
          updated_at: now,
        });

        // If insert clashed on unique username, retry with randomized suffix
        if (insertErr && (insertErr.code === "23505" || insertErr.message?.includes("unique"))) {
          const randSuffix = Math.floor(1000 + Math.random() * 9000);
          effectiveUsername = `u_${safeBase.slice(0, 12)}_${randSuffix}`.slice(0, 20);
          resolvedProfile.username = effectiveUsername;
          setProfile(resolvedProfile);

          await supabase.from("users").upsert({
            id: u.id,
            email: u.email,
            display_name: effectiveDisplayName,
            username: effectiveUsername,
            photo_url: effectivePhoto,
            avatar_url: effectivePhoto,
            created_at: now,
            updated_at: now,
          });
        }

        // Also register in usernames reservation table
        await supabase.from("usernames").upsert({
          username: effectiveUsername,
          user_id: u.id,
          claimed_at: now,
        });

        // Auto-apply pending referral code from invite link or attribution query
        import("@services/rewards")
          .then(async ({ getPendingReferralCode, applyReferralCodeForUser }) => {
            const pending = await getPendingReferralCode();
            if (pending) {
              await applyReferralCodeForUser(u.id, pending);
            }
          })
          .catch(() => {});
      } else {
        const updates: Record<string, any> = {};
        if (!existing.username || existing.username !== effectiveUsername) {
          updates.username = effectiveUsername;
        }
        if (effectivePhoto && existing.photo_url !== effectivePhoto) {
          updates.photo_url = effectivePhoto;
          updates.avatar_url = effectivePhoto;
        }
        if (Object.keys(updates).length > 0) {
          updates.updated_at = now;
          await supabase.from("users").update(updates).eq("id", u.id);
        }

        // Keep usernames table synced
        if (effectiveUsername) {
          await supabase.from("usernames").upsert({
            username: effectiveUsername,
            user_id: u.id,
          });
        }
      }

      // Keep auth user metadata in sync
      if (!u.user_metadata?.username || u.user_metadata.username !== effectiveUsername) {
        try {
          await supabase.auth.updateUser({
            data: { username: effectiveUsername, user_name: effectiveUsername },
          });
        } catch {}
      }

      if (effectivePhoto && isUserUploadedPhoto(effectivePhoto) && typeof window !== "undefined") {
        localStorage.setItem(`user_custom_avatar_${u.id}`, effectivePhoto);
        localStorage.setItem(`user_avatar_${u.id}`, effectivePhoto);
        window.dispatchEvent(
          new CustomEvent("binro_avatar_updated", { detail: { url: effectivePhoto } })
        );
      }
    } catch (syncErr) {
      console.warn("[auth-context] syncUserProfile exception:", syncErr);
    }

    return resolvedProfile;
  }, []);

  // Deduplicated wrapper so concurrent calls from signIn() and onAuthStateChange()
  // share the same in-flight promise instead of executing duplicate DB queries
  const syncUserProfile = useCallback(
    async (u: User): Promise<UserProfile | null> => {
      if (!u?.id) return performSyncUserProfile(u);
      const existingPromise = syncInFlightRef.current.get(u.id);
      if (existingPromise) {
        return existingPromise;
      }
      const promise = performSyncUserProfile(u).finally(() => {
        syncInFlightRef.current.delete(u.id);
      });
      syncInFlightRef.current.set(u.id, promise);
      return promise;
    },
    [performSyncUserProfile]
  );

  useEffect(() => {
    if (!isWebSupabaseConfigured()) {
      setLoading(false);
      return;
    }

    const supabase = getWebSupabase();
    let mounted = true;

    // Check initial session
    void supabase.auth.getSession().then(({ data, error }) => {
      if (!mounted) return;
      if (!error && data.session) {
        setSession(data.session);
        setUser(data.session.user);
        void syncUserProfile(data.session.user);
      }
      setLoading(false);
    });

    // Listen for auth state changes
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (_event, newSession) => {
        if (!mounted) return;
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          void syncUserProfile(newSession.user);
        }
        setLoading(false);
      }
    );

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, [syncUserProfile]);

  const signIn = useCallback(async (email: string, password: string) => {
    const emailCheck = validateEmail(email.trim());
    if (!emailCheck.valid) {
      throw new Error(emailCheck.reason || "This email address is invalid. Temporary and disposable emails are not allowed.");
    }

    const supabase = getWebSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    if (!data.user || !data.session) {
      throw new Error("Sign in failed. No session returned.");
    }
    if (
      data.user.user_metadata?.is_deleted === true ||
      data.user.user_metadata?.account_deleted === true ||
      Boolean(data.user.user_metadata?.deleted_at)
    ) {
      await supabase.auth.signOut().catch(() => {});
      throw new Error("This account has been permanently deleted.");
    }
    const synced = await syncUserProfile(data.user);
    if (!synced) {
      await supabase.auth.signOut().catch(() => {});
      throw new Error("This account has been permanently deleted.");
    }
    setUser(data.user);
    setSession(data.session);
    return { user: data.user, session: data.session };
  }, [syncUserProfile]);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const trimmedEmail = email.trim();
    const emailCheck = validateEmail(trimmedEmail);
    if (!emailCheck.valid) {
      throw new Error(emailCheck.reason || "This email address is invalid. Temporary and disposable emails are not allowed.");
    }

    const supabase = getWebSupabase();

    // Check if user already exists in database using server-side check-email API (bypasses RLS safely)
    let userExists = false;
    try {
      const checkRes = await fetch("/api/auth/check-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmedEmail }),
      });
      if (checkRes.ok) {
        const json = await checkRes.json();
        userExists = Boolean(json.exists);
      }
    } catch {}

    if (!userExists) {
      try {
        const { data: userInDb } = await supabase
          .from("users")
          .select("id")
          .ilike("email", trimmedEmail)
          .eq("is_deleted", false)
          .maybeSingle();
        if (userInDb) userExists = true;
      } catch {}
    }

    if (userExists) {
      const err = new Error("This user already exists. Please use sign in.");
      (err as any).code = "auth/email-already-in-use";
      throw err;
    }

    const { data, error } = await supabase.auth.signUp({
      email: trimmedEmail,
      password,
      options: {
        data: {
          full_name: displayName.trim(),
          display_name: displayName.trim(),
          name: displayName.trim(),
        },
        emailRedirectTo: typeof window !== "undefined" ? `${window.location.origin}/login?verified=true` : undefined,
      },
    });

    if (error) {
      const isAlready =
        error.code === "user_already_exists" ||
        error.message?.toLowerCase().includes("already registered") ||
        error.message?.toLowerCase().includes("already in use") ||
        error.message?.toLowerCase().includes("already exists");
      if (isAlready) {
        const err = new Error("This user already exists. Please use sign in.");
        (err as any).code = "auth/email-already-in-use";
        throw err;
      }
      throw error;
    }

    if (!data.user) {
      throw new Error("Sign up failed. No user returned.");
    }

    // Supabase returns an empty identities array when the email is already registered
    if (Array.isArray(data.user.identities) && data.user.identities.length === 0) {
      const err = new Error("This user already exists. Please use sign in.");
      (err as any).code = "auth/email-already-in-use";
      throw err;
    }

    if (data.session) {
      setUser(data.user);
      setSession(data.session);
      void syncUserProfile(data.user);
    }
    return { user: data.user, session: data.session };
  }, [syncUserProfile]);

  const signOut = useCallback(async () => {
    const supabase = getWebSupabase();
    setUser(null);
    setSession(null);
    setProfile(null);
    try {
      await supabase.auth.signOut();
    } catch {
      // Ignore if session or auth user was already deleted
    }
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const supabase = getWebSupabase();
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : undefined;

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        skipBrowserRedirect: true,
        queryParams: {
          prompt: "select_account",
        },
      },
    });
    if (error) throw error;
    return data;
  }, []);

  const sendPasswordReset = useCallback(async (email: string) => {
    const supabase = getWebSupabase();
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/reset-password`
        : undefined;

    const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
      redirectTo,
    });
    if (error) throw error;
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    const supabase = getWebSupabase();
    const { error } = await supabase.auth.updateUser({ password });
    if (error) throw error;
  }, []);

  const resendVerification = useCallback(async (email: string) => {
    const supabase = getWebSupabase();
    const { error } = await supabase.auth.resend({
      type: "signup",
      email: email.trim(),
    });
    if (error) throw error;
  }, []);

  const refreshUser = useCallback(async () => {
    const supabase = getWebSupabase();
    const { data, error } = await supabase.auth.getUser();
    if (!error && data?.user) {
      setUser(data.user);
      void syncUserProfile(data.user);
      return data.user;
    }
    return null;
  }, [syncUserProfile]);

  const refreshProfile = useCallback(async () => {
    if (!user) return null;
    return await syncUserProfile(user);
  }, [user, syncUserProfile]);

  const value = useMemo(
    () => ({
      user,
      profile,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
      sendPasswordReset,
      updatePassword,
      resendVerification,
      refreshUser,
      refreshProfile,
    }),
    [
      user,
      profile,
      session,
      loading,
      signIn,
      signUp,
      signOut,
      signInWithGoogle,
      sendPasswordReset,
      updatePassword,
      resendVerification,
      refreshUser,
      refreshProfile,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
