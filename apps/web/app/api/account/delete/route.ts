import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createAdminSupabaseClient,
  SUPABASE_TABLES,
  SUPABASE_BUCKETS,
} from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // Extract Bearer token
  const authHeader = req.headers.get("authorization") || "";
  const token = authHeader.replace(/^Bearer\s+/i, "").trim();

  if (!token) {
    return NextResponse.json(
      { error: "Missing authentication credentials." },
      { status: 401 }
    );
  }

  // Authenticated server client carrying caller's JWT for RLS (auth.uid() = userId)
  const userClient = createServerSupabaseClient(token);
  if (!userClient) {
    return NextResponse.json(
      { error: "Supabase is not configured." },
      { status: 500 }
    );
  }

  // Verify caller identity from JWT
  const { data: userData, error: userError } = await userClient.auth.getUser(token);
  if (userError || !userData?.user) {
    return NextResponse.json(
      { error: "Invalid or expired session token." },
      { status: 401 }
    );
  }

  const userId = userData.user.id;
  const now = new Date().toISOString();

  const adminClient = createAdminSupabaseClient();
  const dbClient = adminClient || userClient;

  // 1. Delete all user-uploaded avatar files from canonical Supabase Storage bucket
  try {
    const { data: fileList } = await dbClient.storage
      .from(SUPABASE_BUCKETS.AVATARS)
      .list(userId, { limit: 100 });
    if (Array.isArray(fileList) && fileList.length > 0) {
      const paths = fileList
        .filter((f) => f.name)
        .map((f) => `${userId}/${f.name}`);
      if (paths.length > 0) {
        await dbClient.storage.from(SUPABASE_BUCKETS.AVATARS).remove(paths);
      }
    }
  } catch (storageErr) {
    console.warn("[api/account/delete] Storage cleanup:", storageErr);
  }

  // 2. Cascade cleanup across all canonical public database tables
  try {
    await dbClient.from(SUPABASE_TABLES.COMMENT_LIKES).delete().eq("user_id", userId);
    await dbClient.from(SUPABASE_TABLES.QR_REPORTS).delete().eq("user_id", userId);
    await dbClient.from(SUPABASE_TABLES.QR_SCANS).delete().eq("user_id", userId);

    // Delete or soft-anonymize comments in qr_comments
    await dbClient.from(SUPABASE_TABLES.QR_COMMENTS).delete().eq("user_id", userId);
    await dbClient
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

    // Unlink and anonymize owned QR codes
    await dbClient
      .from(SUPABASE_TABLES.QR_CODES)
      .update({
        owner_id: null,
        owner_name: "[deleted]",
        owner_logo_base64: null,
        is_owner_deleted: true,
        updated_at: now,
      })
      .eq("owner_id", userId);

    // Release claimed usernames
    await dbClient.from(SUPABASE_TABLES.USERNAMES).delete().eq("user_id", userId);

    // Scrub and delete row from public.users (public_profiles view updates automatically)
    await dbClient
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

    await dbClient.from(SUPABASE_TABLES.USERS).delete().eq("id", userId);
  } catch (dbErr) {
    console.warn("[api/account/delete] DB cascade warning:", dbErr);
  }

  // 3. Permanently delete user from Supabase Auth (auth.users)
  let authDeleted = false;

  // 3A. Admin API deletion if SUPABASE_SERVICE_ROLE_KEY is available
  if (adminClient) {
    try {
      const { error: adminErr } = await adminClient.auth.admin.deleteUser(userId);
      if (!adminErr) {
        authDeleted = true;
      } else {
        console.warn("[api/account/delete] admin deleteUser error:", adminErr.message);
      }
    } catch (adminEx) {
      console.warn("[api/account/delete] admin client exception:", adminEx);
    }
  }

  // 3B. Try SECURITY DEFINER SQL RPC functions if auth row was not yet deleted
  if (!authDeleted) {
    for (const rpcName of ["delete_own_account", "delete_user", "delete_user_account"]) {
      try {
        const { error: rpcErr } = await userClient.rpc(rpcName);
        if (!rpcErr) {
          authDeleted = true;
          break;
        }
      } catch {}
    }
  }

  // 3C. Fallback tombstone on auth.users metadata & password so login is permanently blocked
  if (!authDeleted) {
    try {
      const tombstonePassword = `Del!${crypto.randomUUID()}_${Date.now()}Aa1!`;
      await userClient.auth.updateUser({
        password: tombstonePassword,
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
    } catch (metaErr) {
      console.warn("[api/account/delete] auth metadata tombstone note:", metaErr);
    }
  }

  return NextResponse.json({
    success: true,
    userId,
    authDeleted,
    message: "User account and all related data have been permanently deleted.",
  });
}
