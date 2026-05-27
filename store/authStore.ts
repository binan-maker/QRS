import { create } from "zustand";
import type { User } from "firebase/auth";

interface AuthState {
  user: User | null;
  loading: boolean;
  initialized: boolean;
  setUser: (user: User | null) => void;
  setLoading: (loading: boolean) => void;
  setInitialized: (initialized: boolean) => void;
  reset: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: null,
  loading: true,
  initialized: false,
  setUser: (user) => set({ user }),
  setLoading: (loading) => set({ loading }),
  setInitialized: (initialized) => set({ initialized }),
  reset: () => set({ user: null, loading: false, initialized: true }),
}));

export const selectUser = (s: AuthState) => s.user;
export const selectIsAuthenticated = (s: AuthState) => s.user !== null;
export const selectUid = (s: AuthState) => s.user?.uid ?? null;
export const selectDisplayName = (s: AuthState) => s.user?.displayName ?? null;
export const selectPhotoURL = (s: AuthState) => s.user?.photoURL ?? null;
export const selectEmailVerified = (s: AuthState) => s.user?.emailVerified ?? false;
export const selectAuthLoading = (s: AuthState) => s.loading;
