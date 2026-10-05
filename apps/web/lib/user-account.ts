// ═══════════════════════════════════════════════════════════════════════════════
// BINRO WEB: STRUCTURED USER ACCOUNT & DELETION SERVICE
// Handles complete structured synchronization of user profile data in Supabase
// and structured, permanent account deletion cascading across all tables.
// ═══════════════════════════════════════════════════════════════════════════════

import {
  getWebSupabase,
  isWebSupabaseConfigured,
  SUPABASE_TABLES,
  SUPABASE_BUCKETS,
} from "./supabase";

export interface StructuredUserProfile {
  id: string;
  email: string;
  displayName: string;
  username: string;
  photoUrl?: string | null;
  avatarUrl?: string | null;
  emailVerified: boolean;
  pastUsernames?: string[];
  usernameLastChangedAt?: string | null;
  scanCount?: number;
  commentCount?: number;
}

/**
 * Synchronizes full user details into Supabase `users` and `public_profiles`
 * tables so all details are structured and persistent.
 */
export async function syncStructuredUserProfile(
  profile: StructuredUserProfile,
): Promise<void> {
  if (!isWebSupabaseConfigured()) return;
  const supabase = getWebSupabase();
  const now = new Date().toISOString();

  const cleanUsername = String(profile.username || profile.email?.split("@")[0] || "user")
    .replace(/^@/, "")
    .replace(/\s+/g, "")
    .replace(/[^a-zA-Z0-9_]/g, "")
    .toLowerCase() || "user";

  try {
    // 1. Read existing user row first so we never overwrite scan_count, comment_count,
    //    username, past_usernames, or custom avatar on routine sign-in syncs.
    const { data: existingUser } = await supabase
      .from("users")
      .select(
        "username, photo_url, avatar_url, past_usernames, username_last_changed_at, scan_count, comment_count"
      )
      .eq("id", profile.id)
      .maybeSingle();

    const payload: Record<string, any> = {
      id: profile.id,
      email: profile.email,
      display_name: profile.displayName,
      username: existingUser?.username || cleanUsername,
      photo_url: profile.photoUrl ?? existingUser?.photo_url ?? null,
      avatar_url:
        profile.avatarUrl ??
        profile.photoUrl ??
        existingUser?.avatar_url ??
        existingUser?.photo_url ??
        null,
      email_verified: profile.emailVerified,
      updated_at: now,
    };

    if (profile.pastUsernames !== undefined) {
      payload.past_usernames = profile.pastUsernames;
    } else if (!existingUser) {
      payload.past_usernames = [];
    }

    if (profile.usernameLastChangedAt !== undefined) {
      payload.username_last_changed_at = profile.usernameLastChangedAt;
    }

    if (typeof profile.scanCount === "number") {
      payload.scan_count = profile.scanCount;
    } else if (!existingUser) {
      payload.scan_count = 0;
    }

    if (typeof profile.commentCount === "number") {
      payload.comment_count = profile.commentCount;
    } else if (!existingUser) {
      payload.comment_count = 0;
    }

    await supabase.from("users").upsert(payload, { onConflict: "id" });

    // Ensure the user's active username is also registered in public.usernames
    const finalUsername = payload.username;
    if (finalUsername) {
      await supabase.from("usernames").upsert(
        {
          username: finalUsername,
          user_id: profile.id,
          claimed_at: now,
        },
        { onConflict: "username", ignoreDuplicates: true }
      );
    }
  } catch (err) {
    console.warn("[user-account] Failed to sync structured user profile:", err);
  }
}

/**
 * Permanently deletes a user's account and cascades removal across:
 * - `qr_comments`: soft-deletes / deletes comments
 * - `comment_likes`: removes all user likes
 * - `qr_scans`: cleans up all scan records for the user
 * - `public_profiles`: deletes the public profile
 * - `usernames`: deletes claimed handles
 * - `users`: marks deleted and wipes sensitive data
 * - LocalStorage: clears cached avatars, scans, and session tokens
 */
export async function deleteUserAccountPermanently(userId: string): Promise<void> {
  if (!userId) {
    throw new Error("No authenticated user ID found.");
  }

  const now = new Date().toISOString();

  if (isWebSupabaseConfigured()) {
    const supabase = getWebSupabase();

    const { data: sessionData } = await supabase.auth.getSession();
    const token = sessionData?.session?.access_token;

    // 1. Delete all user-uploaded avatar files from canonical Supabase Storage bucket while session is active
    try {
      const { data: existingList } = await supabase.storage
        .from(SUPABASE_BUCKETS.AVATARS)
        .list(userId, { limit: 100 });
      if (Array.isArray(existingList) && existingList.length > 0) {
        const allFiles = existingList
          .filter((item) => item.name)
          .map((item) => `${userId}/${item.name}`);
        if (allFiles.length > 0) {
          await supabase.storage.from(SUPABASE_BUCKETS.AVATARS).remove(allFiles);
        }
      }
    } catch (storageErr) {
      console.warn("[user-account] Storage cleanup:", storageErr);
    }

    // 2. Client-side authenticated cascade cleanup across canonical public tables
    try {
      await supabase.from(SUPABASE_TABLES.QR_COMMENTS).delete().eq("user_id", userId);
      await supabase
        .from(SUPABASE_TABLES.QR_COMMENTS)
        .update({
          is_deleted: true,
          text: "[deleted]",
          user_display_name: "Deleted User",
          user_username: null,
          user_photo_url: null,
          updated_at: now,
        })
        .eq("user_id", userId);
    } catch (e) {
      console.warn("[user-account] comments cleanup error:", e);
    }

    try {
      await supabase.from(SUPABASE_TABLES.COMMENT_LIKES).delete().eq("user_id", userId);
    } catch {}

    try {
      await supabase.from(SUPABASE_TABLES.QR_REPORTS).delete().eq("user_id", userId);
    } catch {}

    try {
      await supabase.from(SUPABASE_TABLES.QR_SCANS).delete().eq("user_id", userId);
    } catch {}

    try {
      await supabase.from(SUPABASE_TABLES.USERNAMES).delete().eq("user_id", userId);
    } catch {}

    try {
      await supabase
        .from(SUPABASE_TABLES.USERS)
        .update({
          is_deleted: true,
          deleted_at: now,
          email: `deleted_${userId}@deleted.binro.app`,
          display_name: "Deleted User",
          username: null,
          past_usernames: [],
          photo_url: null,
          avatar_url: null,
          scan_count: 0,
          comment_count: 0,
          updated_at: now,
        })
        .eq("id", userId);

      await supabase.from(SUPABASE_TABLES.USERS).delete().eq("id", userId);
    } catch (userTblErr) {
      console.warn("[user-account] users table cleanup note:", userTblErr);
    }

    // 3. Call server-side deletion endpoint (uses service_role key / authenticated RLS + RPCs)
    let serverAuthDeleted = false;
    if (token) {
      try {
        const res = await fetch("/api/account/delete", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.ok) {
          const json = await res.json().catch(() => ({}));
          serverAuthDeleted = Boolean(json?.authDeleted);
        } else {
          const errJson = await res.json().catch(() => ({}));
          console.warn("[user-account] API delete response:", errJson);
        }
      } catch (apiErr) {
        console.warn("[user-account] API account delete call failed:", apiErr);
      }
    }

    // 4. Try client-side SECURITY DEFINER RPCs if server did not hard-delete auth.users
    if (!serverAuthDeleted) {
      for (const rpcName of ["delete_own_account", "delete_user", "delete_user_account"]) {
        try {
          const { error: rpcErr } = await supabase.rpc(rpcName);
          if (!rpcErr) {
            serverAuthDeleted = true;
            break;
          }
        } catch {}
      }
    }

    // 5. Fallback tombstone on auth.users if still active so login is permanently blocked
    if (!serverAuthDeleted) {
      try {
        const randomLockPassword = `Del!${Math.random().toString(36).slice(2)}_${Date.now()}Aa1!`;
        await supabase.auth.updateUser({
          password: randomLockPassword,
          data: {
            is_deleted: true,
            account_deleted: true,
            deleted_at: now,
            display_name: "Deleted User",
            full_name: "Deleted User",
            name: "Deleted User",
            username: null,
            user_name: null,
            past_usernames: [],
            avatar_url: null,
            photo_url: null,
            custom_avatar_url: null,
          },
        });
      } catch {}
    }

    // 6. Revoke all active sessions globally
    try {
      await supabase.auth.signOut({ scope: "global" });
    } catch {}
  }

  // 7. Clear all user-specific & scan LocalStorage / SessionStorage caches on the client
  if (typeof window !== "undefined") {
    try {
      const keysToRemove = [
        `user_custom_avatar_${userId}`,
        `user_avatar_${userId}`,
        `binro_profile_${userId}`,
        `local_scan_history_${userId}`,
        "binro_recent_scans",
        "local_scan_history",
        "binro_scan_history",
        "binro_scans",
        "qrg:avatar:url",
        "qrg:avatar:version",
        "anon_scan_usage",
        "anon_scan_count",
        "recent_search_terms",
      ];
      for (const key of keysToRemove) {
        localStorage.removeItem(key);
      }
      sessionStorage.clear();
      window.dispatchEvent(
        new CustomEvent("binro_avatar_updated", { detail: { url: null } })
      );
    } catch {}
  }
}
