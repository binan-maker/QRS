/**
 * Supabase Admin client — server-only.
 *
 * Replaces apps/web/src/lib/firebase-admin.ts.
 * Used by Next.js API routes and Server Components for:
 * - Verifying Supabase access tokens (JWTs)
 * - Admin operations that bypass Row Level Security
 *
 * NEVER import this file in Client Components or pages marked "use client".
 */

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let _adminClient: SupabaseClient | null = null;

function getAdminClient(): SupabaseClient | null {
  if (_adminClient) return _adminClient;

  const url = process.env.SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    console.warn(
      "[supabase-admin] SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY not set — admin client disabled",
    );
    return null;
  }

  _adminClient = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return _adminClient;
}

/**
 * Verify a Supabase JWT access token and return the decoded user info.
 * Returns null when the token is missing, invalid, or admin client unavailable.
 */
export async function verifySessionCookie(token: string): Promise<{
  uid: string;
  email: string | undefined;
  email_verified: boolean;
  name: string | null;
  picture: string | null;
} | null> {
  const client = getAdminClient();
  if (!client) return null;
  try {
    const { data, error } = await client.auth.getUser(token);
    if (error || !data.user) return null;
    const user = data.user;
    const meta = user.user_metadata ?? {};
    return {
      uid:            user.id,
      email:          user.email,
      email_verified: !!user.email_confirmed_at,
      name:           meta.full_name ?? meta.name ?? null,
      picture:        meta.avatar_url ?? meta.picture ?? null,
    };
  } catch {
    return null;
  }
}

/** Delete a user from Supabase Auth (admin operation). */
export async function deleteSupabaseUser(uid: string): Promise<void> {
  const client = getAdminClient();
  if (!client) throw new Error("Admin client not available — set SUPABASE_SERVICE_ROLE_KEY");
  const { error } = await client.auth.admin.deleteUser(uid);
  if (error) throw error;
}
