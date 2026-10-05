import { NextRequest, NextResponse } from "next/server";
import { sanitizeUsername, validateUsername } from "@shared/utils/username-rules";
import { getBestServerSupabaseClient, SUPABASE_TABLES } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const rawUsername = typeof body.username === "string" ? body.username : "";
    const currentUserId = typeof body.currentUserId === "string" ? body.currentUserId : undefined;

    const sanitized = sanitizeUsername(rawUsername);
    if (!sanitized) {
      return NextResponse.json({
        available: false,
        error: "Username cannot be empty.",
      });
    }

    const validation = validateUsername(sanitized);
    if (!validation.valid) {
      return NextResponse.json({
        available: false,
        error: validation.error || "Invalid username format.",
      });
    }

    const supabase = getBestServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({
        available: true,
        message: "Username is available",
      });
    }

    // 1. Check usernames table (claimed handles and reservations)
    try {
      const { data: unameRow } = await supabase
        .from(SUPABASE_TABLES.USERNAMES)
        .select("username, user_id")
        .ilike("username", sanitized)
        .maybeSingle();

      if (unameRow && (!currentUserId || unameRow.user_id !== currentUserId)) {
        return NextResponse.json({
          available: false,
          error: "This username is taken.",
        });
      }
    } catch {}

    // 2. Check public.users table (active handles)
    try {
      let userQuery = supabase
        .from(SUPABASE_TABLES.USERS)
        .select("id, username")
        .ilike("username", sanitized)
        .eq("is_deleted", false);

      if (currentUserId) {
        userQuery = userQuery.neq("id", currentUserId);
      }

      const { data: userRow } = await userQuery.maybeSingle();

      if (userRow) {
        return NextResponse.json({
          available: false,
          error: "This username is taken.",
        });
      }
    } catch {}

    // 3. Check past_usernames across all users (permanently reserved handles)
    try {
      const { data: pastRows } = await supabase
        .from(SUPABASE_TABLES.USERS)
        .select("id, past_usernames")
        .contains("past_usernames", [sanitized]);

      if (pastRows && pastRows.length > 0) {
        const ownedByOther = currentUserId
          ? pastRows.some((r) => r.id !== currentUserId)
          : true;

        if (ownedByOther) {
          return NextResponse.json({
            available: false,
            error: "This username is taken (reserved).",
          });
        }
      }
    } catch {}

    return NextResponse.json({
      available: true,
      message: "Username is available",
    });
  } catch (err: any) {
    console.warn("[api/user/check-username] Error checking username:", err);
    return NextResponse.json({
      available: false,
      error: "Unable to verify username right now.",
    });
  }
}
