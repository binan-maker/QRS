export {
  checkUsernameAvailability,
  updateUsernamePermanently,
  type UsernameAvailabilityResult,
} from "@/lib/username-service";

import { getWebSupabase, isWebSupabaseConfigured } from "./supabase";

export interface SyncUserProfilePayload {
  id: string;
  email: string;
  displayName: string;
  username: string;
  emailVerified?: boolean;
  scanCount?: number;
  commentCount?: number;
}

export async function syncStructuredUserProfile(payload: SyncUserProfilePayload): Promise<void> {
  if (!isWebSupabaseConfigured()) return;
  const supabase = getWebSupabase();
  try {
    await supabase.from("users").upsert(
      {
        id: payload.id,
        email: payload.email,
        display_name: payload.displayName,
        username: payload.username,
        scan_count: payload.scanCount ?? 0,
        comment_count: payload.commentCount ?? 0,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  } catch {}
}

export async function deleteUserAccountPermanently(userId: string): Promise<void> {
  if (!userId) return;
  const res = await fetch("/api/account/delete", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ userId }),
  });
  if (!res.ok) {
    const json = await res.json().catch(() => ({}));
    throw new Error(json.error || "Failed to delete account");
  }
}
