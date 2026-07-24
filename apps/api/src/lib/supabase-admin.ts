// ═══════════════════════════════════════════════════════════════════════════════
// SUPABASE ADMIN CLIENT — server-side Supabase client with service role key.
// ───────────────────────────────────────────────────────────────────────────────
// Replaces apps/api/src/lib/firebase-admin.ts.
// The service role key bypasses Row Level Security — keep it server-only.
// ═══════════════════════════════════════════════════════════════════════════════

import { createClient } from "@supabase/supabase-js";
import type { SupabaseClient } from "@supabase/supabase-js";

let _adminClient: SupabaseClient | null = null;

export function getAdminSupabase(): SupabaseClient | null {
  if (_adminClient) return _adminClient;

  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.warn(
      "[supabase-admin] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — admin client disabled",
    );
    return null;
  }

  try {
    _adminClient = createClient(url, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
    return _adminClient;
  } catch (err) {
    console.error("[supabase-admin] Failed to create admin client:", err);
    return null;
  }
}

/**
 * Verify a Supabase JWT and return the user's claims.
 * Returns null when the token is missing, invalid, or the admin client is unavailable.
 */
export async function verifySupabaseToken(
  token: string,
): Promise<{ uid: string; email: string | undefined; emailVerified: boolean } | null> {
  const client = getAdminSupabase();
  if (!client) return null;

  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;

    const user = data.user;
    return {
      uid: user.id,
      email: user.email,
      emailVerified: !!user.email_confirmed_at,
    };
  } catch (err) {
    console.error("[supabase-admin] verifySupabaseToken error:", err);
    return null;
  }
}

/**
 * Delete a user from Supabase Auth (admin operation).
 */
export async function deleteSupabaseUser(uid: string): Promise<void> {
  const client = getAdminSupabase();
  if (!client) throw new Error("Admin client not available — set SUPABASE_SERVICE_ROLE_KEY");
  const { error } = await client.auth.admin.deleteUser(uid);
  if (error) throw error;
}
