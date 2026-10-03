"use client";

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from "react";
import type { User, Session } from "@supabase/supabase-js";
import { getWebSupabase, isWebSupabaseConfigured } from "./supabase";
import { isUserUploadedPhoto } from "./avatar-context";

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<{ user: User; session: Session }>;
  signUp: (email: string, password: string, displayName: string) => Promise<{ user: User; session: Session | null }>;
  signOut: () => Promise<void>;
  signInWithGoogle: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  resendVerification: (email: string) => Promise<void>;
  refreshUser: () => Promise<User | null>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  // Sync user profile into public.users if not present
  const syncUserProfile = useCallback(async (u: User) => {
    if (!isWebSupabaseConfigured()) return;
    const supabase = getWebSupabase();
    try {
      const { data: existing } = await supabase
        .from("users")
        .select("id, photo_url, username, display_name")
        .eq("id", u.id)
        .maybeSingle();

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

      if (!existing) {
        const displayName =
          u.user_metadata?.full_name ||
          u.user_metadata?.name ||
          u.user_metadata?.display_name ||
          u.email?.split("@")[0] ||
          "User";
        const baseUsername = displayName
          .toLowerCase()
          .replace(/[^a-z0-9_]/g, "")
          .slice(0, 15) || "user";
        const randomSuffix = Math.floor(1000 + Math.random() * 9000);
        const username = `${baseUsername}_${randomSuffix}`;

        await supabase.from("users").insert({
          id: u.id,
          email: u.email,
          display_name: displayName,
          username,
          photo_url: metaPhoto,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString(),
        });
      } else {
        // If DB has an uploaded photo, prioritize and cache it
        if (existing.photo_url && isUserUploadedPhoto(existing.photo_url)) {
          if (typeof window !== "undefined") {
            localStorage.setItem(`user_custom_avatar_${u.id}`, existing.photo_url);
            localStorage.setItem(`user_avatar_${u.id}`, existing.photo_url);
            window.dispatchEvent(
              new CustomEvent("binro_avatar_updated", { detail: { url: existing.photo_url } })
            );
          }
        } else if (!existing.photo_url && metaPhoto) {
          // Backfill photo_url only if row had null
          await supabase
            .from("users")
            .update({ photo_url: metaPhoto, updated_at: new Date().toISOString() })
            .eq("id", u.id);
        } else if (localCustom && isUserUploadedPhoto(localCustom) && !isUserUploadedPhoto(existing.photo_url)) {
          // If user previously uploaded photo in this browser, restore it to users table
          await supabase
            .from("users")
            .update({ photo_url: localCustom, updated_at: new Date().toISOString() })
            .eq("id", u.id);
        }
      }
    } catch {
      // Ignore background sync errors if table permissions or triggers already handle it
    }
  }, []);

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
    const supabase = getWebSupabase();
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });
    if (error) throw error;
    if (!data.user || !data.session) {
      throw new Error("Sign in failed. No session returned.");
    }
    setUser(data.user);
    setSession(data.session);
    void syncUserProfile(data.user);
    return { user: data.user, session: data.session };
  }, [syncUserProfile]);

  const signUp = useCallback(async (email: string, password: string, displayName: string) => {
    const supabase = getWebSupabase();
    const { data, error } = await supabase.auth.signUp({
      email: email.trim(),
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
    if (error) throw error;
    if (!data.user) {
      throw new Error("Sign up failed. No user returned.");
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
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    const supabase = getWebSupabase();
    const redirectTo =
      typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : undefined;

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          access_type: "offline",
          prompt: "consent",
        },
      },
    });
    if (error) throw error;
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
      return data.user;
    }
    return null;
  }, []);

  const value = useMemo(
    () => ({
      user,
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
    }),
    [
      user,
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
