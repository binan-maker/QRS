/**
 * Auth helpers — shared between client components and server API routes.
 *
 * Session flow:
 *   1. User signs in with Firebase Auth (browser)
 *   2. Client POSTs the Firebase ID token to /api/auth/session
 *   3. Server verifies the token and stores it in a long-lived httpOnly cookie
 *   4. Next.js middleware / Server Components read the cookie to auth SSR
 *   5. On sign-out, client DELETEs /api/auth/session to clear the cookie
 */

export const SESSION_COOKIE_NAME = "__session";
export const SESSION_COOKIE_MAX_AGE = 5 * 24 * 60 * 60; // 5 days in seconds

// ─── Client helpers ───────────────────────────────────────────────────────────

/**
 * Exchange a Firebase ID token for a server session cookie.
 * Called client-side immediately after signIn().
 */
export async function createSession(accessToken: string): Promise<boolean> {
  try {
    const res = await fetch("/api/auth/session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ idToken: accessToken }),
      credentials: "same-origin",
    });
    return res.ok;
  } catch {
    return false;
  }
}

/** Clear the server session cookie on sign-out. */
export async function destroySession(): Promise<void> {
  try {
    await fetch("/api/auth/session", {
      method: "DELETE",
      credentials: "same-origin",
    });
  } catch {
    // best-effort
  }
}

/**
 * Get the authenticated user from the current session cookie.
 * Returns null if not authenticated.
 */
export async function getSessionUser(): Promise<{
  uid: string;
  email: string | undefined;
  emailVerified: boolean;
} | null> {
  try {
    const res = await fetch("/api/auth/me", { credentials: "same-origin" });
    if (!res.ok) return null;
    const { data } = await res.json();
    return data ?? null;
  } catch {
    return null;
  }
}

// ─── Route constants ──────────────────────────────────────────────────────────

/** Routes that require authentication — redirects to LOGIN_REDIRECT if no session. */
export const PROTECTED_PREFIXES = ["/dashboard", "/qr", "/analytics", "/profile", "/settings", "/notifications"];

/** Routes where an authenticated user should be redirected away (e.g. /login). */
export const AUTH_PREFIXES = ["/login", "/signup", "/forgot-password"];

/** Where to redirect after successful login. */
export const POST_LOGIN_REDIRECT = "/dashboard";

/** Where to redirect when auth is required but missing. */
export const LOGIN_REDIRECT = "/login";
