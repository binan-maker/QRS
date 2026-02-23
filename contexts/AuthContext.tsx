import { createContext, useContext, useState, useEffect, useMemo, ReactNode } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { getApiUrl } from "@/lib/query-client";
import { fetch } from "expo/fetch";

interface AuthUser {
  id: string;
  email: string;
  displayName: string;
}

interface AuthContextValue {
  user: AuthUser | null;
  token: string | null;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, displayName: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  async function loadStoredAuth() {
    try {
      const storedToken = await AsyncStorage.getItem("auth_token");
      if (storedToken) {
        const baseUrl = getApiUrl();
        const res = await fetch(`${baseUrl}api/auth/me`, {
          headers: { Authorization: `Bearer ${storedToken}` },
        });
        if (res.ok) {
          const data = await res.json();
          setUser(data.user);
          setToken(storedToken);
        } else {
          await AsyncStorage.removeItem("auth_token");
        }
      }
    } catch (e) {
      console.error("Auth load error:", e);
    } finally {
      setIsLoading(false);
    }
  }

  async function signIn(email: string, password: string) {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Sign in failed");
    await AsyncStorage.setItem("auth_token", data.token);
    setUser(data.user);
    setToken(data.token);
  }

  async function signUp(email: string, displayName: string, password: string) {
    const baseUrl = getApiUrl();
    const res = await fetch(`${baseUrl}api/auth/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, displayName, password }),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.message || "Sign up failed");
    await AsyncStorage.setItem("auth_token", data.token);
    setUser(data.user);
    setToken(data.token);
  }

  async function signOut() {
    try {
      if (token) {
        const baseUrl = getApiUrl();
        await fetch(`${baseUrl}api/auth/logout`, {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      }
    } catch (e) {}
    await AsyncStorage.removeItem("auth_token");
    setUser(null);
    setToken(null);
  }

  const value = useMemo(
    () => ({ user, token, isLoading, signIn, signUp, signOut }),
    [user, token, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
