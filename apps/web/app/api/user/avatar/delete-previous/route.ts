import { NextRequest, NextResponse } from "next/server";
import {
  createServerSupabaseClient,
  createAdminSupabaseClient,
  SUPABASE_BUCKETS,
} from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get("authorization") || "";
    const token = authHeader.replace(/^Bearer\s+/i, "").trim();

    const body = await req.json().catch(() => ({}));
    const excludeFileName = typeof body.excludeFileName === "string" ? body.excludeFileName : "";

    const userClient = createServerSupabaseClient(token);
    const adminClient = createAdminSupabaseClient();
    const supabase = adminClient || userClient;

    if (!supabase) {
      return NextResponse.json({ error: "Supabase not configured" }, { status: 503 });
    }

    let userId: string | null = null;
    if (token && userClient) {
      const { data: userData } = await userClient.auth.getUser(token);
      if (userData?.user?.id) {
        userId = userData.user.id;
      }
    }
    if (!userId && typeof body.userId === "string" && adminClient) {
      userId = body.userId;
    }

    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    let totalDeleted = 0;

    try {
      const { data: fileList, error: listErr } = await supabase.storage
        .from(SUPABASE_BUCKETS.AVATARS)
        .list(userId, { limit: 100 });

      if (!listErr && Array.isArray(fileList) && fileList.length > 0) {
        const filesToDelete = fileList
          .filter((f) => f.name && f.name !== excludeFileName)
          .map((f) => `${userId}/${f.name}`);

        if (filesToDelete.length > 0) {
          const { error: delErr } = await supabase.storage
            .from(SUPABASE_BUCKETS.AVATARS)
            .remove(filesToDelete);

          if (!delErr) {
            totalDeleted += filesToDelete.length;
          }
        }
      }
    } catch (bucketErr) {
      console.warn("[avatar/delete-previous] Error cleaning avatars bucket:", bucketErr);
    }

    return NextResponse.json({ success: true, deletedCount: totalDeleted });
  } catch (err: any) {
    console.warn("[avatar/delete-previous] Exception:", err);
    return NextResponse.json({ success: false, error: err?.message }, { status: 500 });
  }
}
