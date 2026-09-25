import { createClient, type SupabaseClient, type User } from "@supabase/supabase-js";

type AuthenticatedUser = {
  uid: string;
  email?: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
};

let client: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (client) return client;
  const url = process.env.SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceRoleKey) return null;

  client = createClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return client;
}

function mapUser(user: User): AuthenticatedUser {
  return {
    uid: user.id,
    email: user.email,
    emailVerified: Boolean(user.email_confirmed_at),
    name:
      user.user_metadata?.display_name ??
      user.user_metadata?.full_name ??
      user.user_metadata?.name,
    picture: user.user_metadata?.avatar_url ?? user.user_metadata?.picture,
  };
}

export async function verifySupabaseToken(
  accessToken: string,
): Promise<AuthenticatedUser | null> {
  const supabase = getClient();
  if (!supabase) return null;
  const { data, error } = await supabase.auth.getUser(accessToken);
  if (error || !data.user) return null;
  return mapUser(data.user);
}

export async function deleteSupabaseUser(uid: string): Promise<void> {
  const supabase = getClient();
  if (!supabase) throw new Error("Supabase server credentials are not configured");
  const { error } = await supabase.auth.admin.deleteUser(uid);
  if (error) throw error;
}

/**
 * This is intentionally typed as any for the legacy route layer. Those routes
 * still call the old Firestore-shaped `collection()` facade and are being
 * ported to direct Supabase queries separately. Returning the authenticated
 * service client here keeps startup and auth verification functional without
 * exposing the service-role key to the client.
 */
export function getAdminDb(): any {
  return getClient();
}

export function getAdminAuth(): any {
  const supabase = getClient();
  if (!supabase) return null;

  return {
    async verifyIdToken(accessToken: string) {
      const user = await verifySupabaseToken(accessToken);
      if (!user) throw new Error("Invalid or expired token");
      return user;
    },
    async updateUser(uid: string, attributes: {
      displayName?: string;
      photoURL?: string | null;
    }) {
      const { error } = await supabase.auth.admin.updateUserById(uid, {
        user_metadata: {
          ...(attributes.displayName ? { display_name: attributes.displayName, full_name: attributes.displayName } : {}),
          ...(attributes.photoURL !== undefined ? { avatar_url: attributes.photoURL } : {}),
        },
      });
      if (error) throw error;
    },
    async revokeRefreshTokens(_uid: string) {
      // Supabase access tokens are verified against Auth on each request.
      // There is no Firebase-style per-user revoke timestamp operation here.
    },
  };
}

export const admin = {
  firestore: {
    FieldValue: {
      serverTimestamp: () => new Date().toISOString(),
      increment: (value: number) => ({ __binroIncrement: value }),
    },
  },
};