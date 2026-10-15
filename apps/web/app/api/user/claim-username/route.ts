import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createAdminSupabaseClient,
  SUPABASE_TABLES,
} from "@/lib/supabase";
import {
  sanitizeUsername,
  validateUsername,
  RESERVED_USERNAMES,
} from "@shared/utils/username-rules";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return NextResponse.json(
        { error: "Missing authentication token. Please sign in." },
        { status: 401 }
      );
    }

    const userClient = createServerSupabaseClient(token);
    if (!userClient) {
      return NextResponse.json(
        { error: "Database service is not configured." },
        { status: 500 }
      );
    }

    // Verify authenticated user
    const { data: userData, error: userError } = await userClient.auth.getUser(token);
    if (userError || !userData?.user) {
      return NextResponse.json(
        { error: "Invalid or expired session. Please sign in again." },
        { status: 401 }
      );
    }

    const userId = userData.user.id;
    const body = await req.json().catch(() => ({}));
    const rawUsername = typeof body.username === "string" ? body.username : "";

    const sanitized = sanitizeUsername(rawUsername);
    if (!sanitized) {
      return NextResponse.json(
        { error: "Username cannot be empty." },
        { status: 400 }
      );
    }

    const validation = validateUsername(sanitized);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.error || "Must be 3–20 characters, lowercase letters, numbers, or underscores" },
        { status: 400 }
      );
    }

    if (RESERVED_USERNAMES.has(sanitized)) {
      return NextResponse.json(
        { error: "This username is reserved and cannot be claimed." },
        { status: 400 }
      );
    }

    const adminClient = createAdminSupabaseClient();
    const dbClient = adminClient || userClient;
    const nowIso = new Date().toISOString();

    // 1. Dual-Table check: usernames table (case-insensitive)
    const { data: existingUname } = await dbClient
      .from(SUPABASE_TABLES.USERNAMES)
      .select("username, user_id")
      .ilike("username", sanitized)
      .maybeSingle();

    if (existingUname && existingUname.user_id !== userId) {
      return NextResponse.json(
        {
          error: `@${sanitized} is already claimed by another eco-member`,
          code: "23505",
        },
        { status: 409 }
      );
    }

    // 2. Dual-Table check: users table (case-insensitive)
    const { data: existingUser } = await dbClient
      .from(SUPABASE_TABLES.USERS)
      .select("id, username")
      .ilike("username", sanitized)
      .neq("id", userId)
      .maybeSingle();

    if (existingUser) {
      return NextResponse.json(
        {
          error: `@${sanitized} is already claimed by another eco-member`,
          code: "23505",
        },
        { status: 409 }
      );
    }

    // 3. Check past_usernames permanent reservations across all users
    const { data: pastRows } = await dbClient
      .from(SUPABASE_TABLES.USERS)
      .select("id, past_usernames")
      .contains("past_usernames", [sanitized]);

    if (pastRows && pastRows.length > 0) {
      const ownedByOther = pastRows.some((r: any) => r.id !== userId);
      if (ownedByOther) {
        return NextResponse.json(
          {
            error: `@${sanitized} is already claimed by another eco-member`,
            code: "23505",
          },
          { status: 409 }
        );
      }
    }

    // 4. Atomic PostgreSQL claim into public.usernames registry table
    // PostgreSQL primary key / unique index strictly prevents race conditions & guarantees serial writes
    if (existingUname && existingUname.user_id === userId) {
      // User already successfully owns this handle
    } else {
      const { error: unameInsertErr } = await dbClient
        .from(SUPABASE_TABLES.USERNAMES)
        .insert({
          username: sanitized,
          user_id: userId,
          claimed_at: nowIso,
        });

      if (unameInsertErr) {
        const isViolation =
          unameInsertErr.code === "23505" ||
          unameInsertErr.message?.toLowerCase().includes("unique") ||
          unameInsertErr.message?.toLowerCase().includes("duplicate");

        if (isViolation) {
          return NextResponse.json(
            {
              error: "Someone just claimed that handle a moment ago.",
              code: "23505",
            },
            { status: 409 }
          );
        }

        console.warn("[claim-username] usernames insert error:", unameInsertErr);
        return NextResponse.json(
          { error: "Failed to reserve handle. Please try again." },
          { status: 500 }
        );
      }
    }

    // 5. Update public.users table with confirmed handle
    const displayName =
      userData.user.user_metadata?.display_name ||
      userData.user.user_metadata?.full_name ||
      userData.user.user_metadata?.name ||
      "User";

    const { error: userUpdateErr } = await dbClient
      .from(SUPABASE_TABLES.USERS)
      .upsert(
        {
          id: userId,
          username: sanitized,
          display_name: displayName,
          email: userData.user.email || "",
          updated_at: nowIso,
        },
        { onConflict: "id" }
      );

    if (userUpdateErr) {
      console.warn("[claim-username] users update error:", userUpdateErr);
    }

    // 6. Update auth.users metadata so session state immediately reflects handle
    if (adminClient) {
      try {
        await adminClient.auth.admin.updateUserById(userId, {
          user_metadata: {
            ...userData.user.user_metadata,
            username: sanitized,
            user_name: sanitized,
            onboarding_completed: true,
          },
        });
      } catch (adminErr) {
        console.warn("[claim-username] admin metadata update error:", adminErr);
      }
    } else {
      try {
        await userClient.auth.updateUser({
          data: {
            username: sanitized,
            user_name: sanitized,
            onboarding_completed: true,
          },
        });
      } catch {}
    }

    return NextResponse.json({
      success: true,
      username: sanitized,
      message: "Handle claimed successfully.",
    });
  } catch (err: any) {
    console.error("[claim-username] Exception:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error." },
      { status: 500 }
    );
  }
}
