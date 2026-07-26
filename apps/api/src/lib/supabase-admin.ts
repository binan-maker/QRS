// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE ADMIN CLIENT — server-side Supabase client with service role key.
// ───────────────────────────────────────────────────────────────────────────────
// Replaces apps/api/src/lib/firebase-admin.ts.
// The service role key bypasses Row Level Security — keep it server-only.
//
// Token verification falls back to a direct REST call with the anon key when
// SUPABASE_SERVICE_ROLE_KEY is not set. This avoids the Supabase JS realtime
// client which requires native WebSocket (Node.js 22+; absent on Node.js 20).
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

// Track init state with a three-value flag so we only attempt creation once.
type InitState = "pending" | "ready" | "unavailable";

let _adminClient: SupabaseClient | null = null;
let _adminState: InitState = "pending";

export function getAdminSupabase(): SupabaseClient | null {
  if (_adminState === "ready") return _adminClient;
  if (_adminState === "unavailable") return null;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.warn(
      "[supabase-admin] SUPABASE_SERVICE_ROLE_KEY not set — admin operations disabled. " +
      "Token verification will fall back to direct REST with the anon key.",
    );
    _adminState = "unavailable";
    return null;
  }

  try {
    _adminClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    _adminState = "ready";
    return _adminClient;
  } catch (err) {
    console.error("[supabase-admin] Failed to create admin client:", err);
    _adminState = "unavailable";
    return null;
  }
}

/**
 * Verify a Supabase JWT via a direct REST call to /auth/v1/user.
 * Does not use the Supabase JS SDK so it works on Node.js 20 (no WebSocket).
 */
async function verifyTokenViaRest(
  token: string,
): Promise<{ uid: string; email: string | undefined; emailVerified: boolean } | null> {
  const url = process.env.SUPABASE_URL;
  // Prefer a server-only var; fall back to the EXPO_PUBLIC_ variant which is
  // also present in the Node.js environment when set in Replit Secrets.
  const anonKey =
    process.env.SUPABASE_ANON_KEY ??
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    console.warn(
      "[supabase-admin] Cannot verify token — SUPABASE_URL and SUPABASE_ANON_KEY " +
      "(or EXPO_PUBLIC_SUPABASE_ANON_KEY) must be set.",
    );
    return null;
  }

  try {
    const res = await fetch(`${url}/auth/v1/user`, {
      headers: {
        Authorization: `Bearer ${token}`,
        apikey: anonKey,
      },
    });

    if (!res.ok) return null;

    const user: any = await res.json();
    if (!user?.id) return null;

    return {
      uid: user.id,
      email: user.email,
      emailVerified: !!user.email_confirmed_at,
    };
  } catch (err) {
    console.error("[supabase-admin] verifyTokenViaRest error:", err);
    return null;
  }
}

/**
 * Verify a Supabase JWT and return the user's claims.
 * Uses the admin client (service role key) when available; otherwise falls back
 * to a direct REST call with the anon key (works on Node.js 20+).
 * Returns null when the token is missing, invalid, or no credentials are configured.
 */
export async function verifySupabaseToken(
  token: string,
): Promise<{ uid: string; email: string | undefined; emailVerified: boolean } | null> {
  const adminClient = getAdminSupabase();

  if (adminClient) {
    try {
      const { data, error } = await adminClient.auth.getUser(token);
      if (error || !data.user) return null;
      const user = data.user;
      return {
        uid: user.id,
        email: user.email,
        emailVerified: !!user.email_confirmed_at,
      };
    } catch (err) {
      console.error("[supabase-admin] verifySupabaseToken (admin) error:", err);
      return null;
    }
  }

  // Admin client unavailable — fall back to direct REST verification.
  return verifyTokenViaRest(token);
}

/**
 * Delete a user from Supabase Auth (admin operation — requires service role key).
 */
export async function deleteSupabaseUser(uid: string): Promise<void> {
  const client = getAdminSupabase();
  if (!client) throw new Error("Admin client not available — set SUPABASE_SERVICE_ROLE_KEY");
  const { error } = await client.auth.admin.deleteUser(uid);
  if (error) throw error;
}
