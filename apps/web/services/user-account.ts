import { getWebSupabase } from "./supabase";

export {
  checkUsernameAvailability,
  updateUsernamePermanently,
  type UsernameAvailabilityResult,
} from "./username-service";

export async function deleteUserAccountPermanently(userId: string): Promise<void> {
  const supabase = getWebSupabase();
  const { data: { session } } = await supabase.auth.getSession();
  const token = session?.access_token || "";

  const res = await fetch("/api/account/delete", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify({ userId }),
  });

  if (!res.ok) {
    const data = await res.json().catch(() => ({}));
    throw new Error(data.error || "Failed to delete account");
  }
}

export async function syncStructuredUserProfile(params: {
  id: string;
  email: string;
  displayName: string;
  username: string;
  emailVerified: boolean;
  scanCount: number;
  commentCount: number;
}): Promise<void> {
  try {
    const supabase = getWebSupabase();
    await supabase.from("users").upsert(
      {
        id: params.id,
        email: params.email,
        display_name: params.displayName,
        username: params.username,
        scan_count: params.scanCount,
        comment_count: params.commentCount,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "id" }
    );
  } catch {}
}
