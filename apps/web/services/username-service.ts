// ═══════════════════════════════════════════════════════════════════════════════
// USERNAME SERVICE (Web & Supabase)
// Handles real-time availability checks, reservation of past handles,
// 15-day cooldown policy, and updating user comments across the database.
// ═══════════════════════════════════════════════════════════════════════════════

import { getWebSupabase, isWebSupabaseConfigured } from "./supabase";
import {
  sanitizeUsername,
  validateUsername,
  getRemainingUsernameCooldownDays,
} from "@shared/utils/username-rules";

export interface UsernameAvailabilityResult {
  available: boolean;
  checked?: boolean;
  checking?: boolean;
  isCurrent?: boolean;
  error?: string | null;
  message?: string | null;
}

/**
 * Checks if a candidate username is available in real-time in Supabase.
 * Enforces:
 * - Format validation (3-20 characters, lowercase, letters, numbers, underscores)
 * - Single ownership (only one person can hold a username)
 * - Past usernames are permanently reserved and CANNOT be taken by anyone.
 */
export async function checkUsernameAvailability(
  candidate: string,
  currentUserId?: string | null,
  currentUsername?: string | null
): Promise<UsernameAvailabilityResult> {
  const sanitized = sanitizeUsername(candidate);

  if (!sanitized) {
    return { available: false, checked: true, error: "Username cannot be empty." };
  }

  // 1. Client-side rule validation
  const validation = validateUsername(sanitized);
  if (!validation.valid) {
    return { available: false, checked: true, error: validation.error || "Invalid username format." };
  }

  // 2. If it's identical to the user's current handle
  if (
    currentUsername &&
    sanitized.toLowerCase() === currentUsername.trim().toLowerCase()
  ) {
    return {
      available: true,
      checked: true,
      isCurrent: true,
      message: "This is your current username.",
    };
  }

  // 3. Server-side availability check via API (bypasses RLS restrictions safely)
  if (typeof window !== "undefined") {
    try {
      const res = await fetch("/api/user/check-username", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: sanitized,
          currentUserId: currentUserId || undefined,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        return {
          available: Boolean(data.available),
          checked: true,
          error: data.error || null,
          message: data.message || null,
        };
      }
    } catch (apiErr) {
      console.warn("[username-service] API check error, falling back to direct query:", apiErr);
    }
  }

  // 4. Supabase direct availability check fallback
  if (isWebSupabaseConfigured()) {
    try {
      const supabase = getWebSupabase();

      // A) Check usernames table (holds active and reserved handles)
      const { data: unameRow } = await supabase
        .from("usernames")
        .select("username, user_id")
        .ilike("username", sanitized)
        .maybeSingle();

      if (unameRow && (!currentUserId || unameRow.user_id !== currentUserId)) {
        return { available: false, checked: true, error: "This username is taken" };
      }

      // B) Check users table (active username)
      const { data: userRow } = await supabase
        .from("users")
        .select("id, username")
        .ilike("username", sanitized)
        .maybeSingle();

      if (userRow && (!currentUserId || userRow.id !== currentUserId)) {
        return { available: false, checked: true, error: "This username is taken" };
      }

      // C) Check past_usernames across all users (past handles are permanently reserved)
      const { data: pastRows } = await supabase
        .from("users")
        .select("id, past_usernames")
        .contains("past_usernames", [sanitized]);

      if (pastRows && pastRows.length > 0) {
        return { available: false, checked: true, error: "This username is taken" };
      }
    } catch (err) {
      console.warn("[username-service] Supabase query error:", err);
    }
  }

  return {
    available: true,
    checked: true,
    message: "Username is available",
  };
}

/**
 * Updates a user's username across Supabase and the entire database:
 * - Enforces 15-day cooldown policy
 * - Updates Supabase Auth metadata
 * - Retains past usernames in user history (never lost, permanently reserved)
 * - Keeps previous handles in usernames table so nobody else can take them
 * - Updates all comments by the user to reflect their new username
 */
export async function updateUsernamePermanently({
  userId,
  newUsername,
  oldUsername,
  lastChangedAt,
  existingPastUsernames = [],
}: {
  userId: string;
  newUsername: string;
  oldUsername: string | null;
  lastChangedAt: string | Date | null;
  existingPastUsernames?: string[];
}): Promise<{ pastUsernames: string[]; newChangedAt: string }> {
  const sanitized = sanitizeUsername(newUsername);
  const validation = validateUsername(sanitized);
  if (!validation.valid) {
    throw new Error(validation.error || "Invalid username format.");
  }

  // 15-day cooldown check
  if (lastChangedAt) {
    const daysLeft = getRemainingUsernameCooldownDays(lastChangedAt);
    if (daysLeft > 0) {
      throw new Error(
        `Usernames can only be edited once every 15 days. Please wait ${daysLeft} more day${
          daysLeft === 1 ? "" : "s"
        }.`
      );
    }
  }

  if (oldUsername && sanitized.toLowerCase() === oldUsername.toLowerCase()) {
    return {
      pastUsernames: existingPastUsernames,
      newChangedAt:
        lastChangedAt instanceof Date
          ? lastChangedAt.toISOString()
          : (lastChangedAt as string) || new Date().toISOString(),
    };
  }

  // Re-verify availability
  const avail = await checkUsernameAvailability(sanitized, userId, oldUsername);
  if (!avail.available && !avail.isCurrent) {
    throw new Error(avail.error || "This username is taken");
  }

  const nowIso = new Date().toISOString();

  // Accumulate past usernames so they are never lost
  const pastList = Array.isArray(existingPastUsernames)
    ? [...existingPastUsernames]
    : [];
  if (oldUsername && !pastList.includes(oldUsername)) {
    pastList.push(oldUsername);
  }

  if (isWebSupabaseConfigured()) {
    const supabase = getWebSupabase();

    // Verify caller owns this account (only the owner can edit their username)
    const { data: sessionData } = await supabase.auth.getSession();
    const activeUid = sessionData?.session?.user?.id;
    if (!activeUid || activeUid !== userId) {
      throw new Error("Unauthorized: You can only edit your own username.");
    }

    // Double-check usernames table ownership before writing
    const { data: existingUname } = await supabase
      .from("usernames")
      .select("user_id")
      .ilike("username", sanitized)
      .maybeSingle();
    if (existingUname && existingUname.user_id !== userId) {
      throw new Error("This username is already taken.");
    }

    // 1. Update Supabase Auth user metadata
    await supabase.auth.updateUser({
      data: {
        username: sanitized,
        user_name: sanitized,
        username_last_changed_at: nowIso,
        past_usernames: pastList,
      },
    });

    // 2. Query existing past_usernames from users table if any were previously stored
    try {
      const { data: dbUser } = await supabase
        .from("users")
        .select("past_usernames")
        .eq("id", userId)
        .maybeSingle();

      if (dbUser?.past_usernames && Array.isArray(dbUser.past_usernames)) {
        for (const p of dbUser.past_usernames) {
          if (p && !pastList.includes(p)) pastList.push(p);
        }
      }
    } catch {}

    // 3. Update users table with updated username, cooldown timestamp, and past_usernames list
    const { error: updateErr } = await supabase
      .from("users")
      .update({
        username: sanitized,
        username_last_changed_at: nowIso,
        past_usernames: pastList,
        updated_at: nowIso,
      })
      .eq("id", userId);

    if (updateErr) {
      await supabase.from("users").upsert(
        {
          id: userId,
          email: `${userId}@users.binro.app`,
          username: sanitized,
          username_last_changed_at: nowIso,
          past_usernames: pastList,
          updated_at: nowIso,
        },
        { onConflict: "id" }
      );
    }

    // 4. Reserve new username in usernames table
    await supabase.from("usernames").upsert({
      username: sanitized,
      user_id: userId,
      claimed_at: nowIso,
    });

    // 5. Keep past username permanently reserved to this user (cannot be claimed by anyone)
    if (oldUsername) {
      await supabase.from("usernames").upsert({
        username: oldUsername,
        user_id: userId,
      });
    }

    // 6. Update all comments in the database to the new username
    try {
      await supabase
        .from("qr_comments")
        .update({
          user_name: `@${sanitized}`,
          user_username: sanitized,
          updated_at: nowIso,
        })
        .eq("user_id", userId);
    } catch (commentErr) {
      console.warn("[username-service] updating comments in qr_comments:", commentErr);
    }
  }

  return {
    pastUsernames: pastList,
    newChangedAt: nowIso,
  };
}
