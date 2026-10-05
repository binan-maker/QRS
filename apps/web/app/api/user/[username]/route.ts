import { NextRequest, NextResponse } from "next/server";
import { sanitizeUsername } from "@shared/utils/username-rules";
import { getBestServerSupabaseClient, SUPABASE_TABLES } from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ username: string }> }
) {
  try {
    const { username: rawUsername } = await params;
    const cleanUsername = sanitizeUsername(rawUsername);

    if (!cleanUsername) {
      return NextResponse.json(
        { error: "Username parameter is required" },
        { status: 400 }
      );
    }

    const supabase = getBestServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json(
        { error: "Database not configured" },
        { status: 503 }
      );
    }

    const { data: user, error } = await supabase
      .from(SUPABASE_TABLES.USERS)
      .select(
        "id, display_name, photo_url, avatar_url, username, scan_count, comment_count, total_likes_received, created_at, is_deleted"
      )
      .ilike("username", cleanUsername)
      .eq("is_deleted", false)
      .maybeSingle();

    if (error) {
      console.warn("[api/user/[username]] Error querying user:", error.message);
      return NextResponse.json({ error: "Database error" }, { status: 500 });
    }

    const targetUser = user || await (async () => {
      const { data: uRow } = await supabase
        .from(SUPABASE_TABLES.USERNAMES)
        .select("user_id")
        .ilike("username", cleanUsername)
        .maybeSingle();

      if (!uRow?.user_id) return null;

      const { data: fallbackUser } = await supabase
        .from(SUPABASE_TABLES.USERS)
        .select(
          "id, display_name, photo_url, avatar_url, username, scan_count, comment_count, total_likes_received, created_at"
        )
        .eq("id", uRow.user_id)
        .eq("is_deleted", false)
        .maybeSingle();

      return fallbackUser;
    })();

    if (!targetUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // Compute live counts from qr_scans and qr_comments so stats are always 100% accurate
    const [scansRes, commentsRes] = await Promise.all([
      supabase
        .from(SUPABASE_TABLES.QR_SCANS)
        .select("id", { count: "exact", head: true })
        .eq("user_id", targetUser.id)
        .eq("is_deleted", false),
      supabase
        .from(SUPABASE_TABLES.QR_COMMENTS)
        .select("id, likes, text")
        .eq("user_id", targetUser.id)
        .eq("is_deleted", false)
        .limit(1000),
    ]);

    const realComments = (commentsRes.data || []).filter(
      (c: any) => !String(c.text || "").startsWith("__qr_vote__:")
    );
    const liveCommentCount = realComments.length;
    const liveLikesReceived = realComments.reduce(
      (sum: number, c: any) => sum + Math.max(0, Number(c.likes) || 0),
      0
    );
    const liveScanCount = scansRes.count ?? 0;

    return NextResponse.json({
      data: {
        id: targetUser.id,
        displayName: targetUser.display_name || "User",
        username: targetUser.username || cleanUsername,
        photoUrl: targetUser.photo_url || targetUser.avatar_url || null,
        scanCount: Math.max(targetUser.scan_count ?? 0, liveScanCount),
        commentCount: Math.max(targetUser.comment_count ?? 0, liveCommentCount),
        totalLikesReceived: Math.max(targetUser.total_likes_received ?? 0, liveLikesReceived),
        createdAt: targetUser.created_at,
      },
    });
  } catch (err: any) {
    console.error("[api/user/[username]] Exception:", err);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
