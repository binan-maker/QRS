// ── Auth store ────────────────────────────────────────────────────────────────
// Zustand store that mirrors the live auth state from AuthContext.
// Use this to read auth state outside of React (e.g. API utilities, background
// services) or for fine-grained subscriptions that avoid full re-renders.
//
// SOURCE OF TRUTH: AuthContext.tsx — it writes here via useEffect.
// For auth methods (signIn, signOut, etc.) always use useAuth() from AuthContext.

import { create } from "zustand";
import type { AuthUser } from "@/lib/auth/types";

export type { AuthUser };

interface AuthState {
  user: AuthUser | null;
  token: string | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: AuthUser | null) => void;
  setToken: (token: string | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  token: null,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user }),
  setToken: (token) => set({ token }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
  reset: () => set({ user: null, token: null, loading: false, initialized: true }),
}));

// ── Fine-grained selectors ────────────────────────────────────────────────────
// Subscribe to only what you need — avoids re-renders on unrelated state changes.
//
// Usage: const uid = useAuthStore(selectUid);

export const selectUser            = (s: AuthState) => s.user;
export const selectToken           = (s: AuthState) => s.token;
export const selectIsAuthenticated = (s: AuthState) => s.user !== null;
export const selectUid             = (s: AuthState) => s.user?.id ?? null;
export const selectDisplayName     = (s: AuthState) => s.user?.displayName ?? null;
export const selectPhotoURL        = (s: AuthState) => s.user?.photoURL ?? null;
export const selectEmailVerified   = (s: AuthState) => s.user?.emailVerified ?? false;
export const selectUsername        = (s: AuthState) => s.user?.username ?? null;
export const selectAuthLoading     = (s: AuthState) => s.loading;
export const selectAuthInitialized = (s: AuthState) => s.initialized;
