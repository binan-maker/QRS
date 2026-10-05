import { NextRequest, NextResponse } from "next/server";
import {
  getBestServerSupabaseClient,
  createAdminSupabaseClient,
  SUPABASE_TABLES,
} from "@/lib/supabase";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : "";

    if (!email || !email.includes("@")) {
      return NextResponse.json({ exists: false });
    }

    const supabase = getBestServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({ exists: false });
    }

    // 1. Check in public.users table (only active non-deleted accounts)
    const { data: userInDb } = await supabase
      .from(SUPABASE_TABLES.USERS)
      .select("id")
      .ilike("email", email)
      .eq("is_deleted", false)
      .maybeSingle();

    if (userInDb) {
      return NextResponse.json({ exists: true });
    }

    // 2. If service role admin client is available, check auth.users directly
    const adminClient = createAdminSupabaseClient();
    if (adminClient) {
      try {
        const { data: listData } = await adminClient.auth.admin.listUsers({
          page: 1,
          perPage: 1000,
        });
        const found = listData?.users?.some(
          (u) =>
            u.email?.trim().toLowerCase() === email &&
            u.user_metadata?.is_deleted !== true &&
            u.user_metadata?.account_deleted !== true
        );
        if (found) {
          return NextResponse.json({ exists: true });
        }
      } catch {}
    }

    return NextResponse.json({ exists: false });
  } catch {
    return NextResponse.json({ exists: false });
  }
}
