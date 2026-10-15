import { NextRequest, NextResponse } from "next/server";
import {
  sanitizeUsername,
  validateUsername,
  RESERVED_USERNAMES,
} from "@shared/utils/username-rules";
import { getBestServerSupabaseClient, SUPABASE_TABLES } from "@/lib/supabase";

export const dynamic = "force-dynamic";

// In-memory sliding window rate limiter: max 30 checks per 60 seconds per IP
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitStore = new Map<string, RateLimitRecord>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 30;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitStore.get(ip);

  if (!record || now > record.resetAt) {
    rateLimitStore.set(ip, {
      count: 1,
      resetAt: now + RATE_LIMIT_WINDOW_MS,
    });

    // Prune stale records if store exceeds 1000 items
    if (rateLimitStore.size > 1000) {
      for (const [key, item] of rateLimitStore.entries()) {
        if (now > item.resetAt) rateLimitStore.delete(key);
      }
    }
    return true; // allowed
  }

  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return false; // blocked
  }

  record.count += 1;
  return true; // allowed
}

export async function POST(req: NextRequest) {
  try {
    // 1. IP extraction & Rate limiting check (anti-enumeration & scraping defense)
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : req.headers.get("x-real-ip") || "127.0.0.1";

    if (!checkRateLimit(ip)) {
      return NextResponse.json(
        {
          available: false,
          error: "Too many username checks. Please wait a moment before trying again.",
        },
        {
          status: 429,
          headers: { "Retry-After": "60" },
        }
      );
    }

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
        error: validation.error || "Must be 3–20 characters, lowercase letters, numbers, or underscores",
      });
    }

    // 2. Early check against platform reserved handles
    if (RESERVED_USERNAMES.has(sanitized)) {
      return NextResponse.json({
        available: false,
        error: "This username is reserved and cannot be claimed.",
      });
    }

    const supabase = getBestServerSupabaseClient();
    if (!supabase) {
      return NextResponse.json({
        available: true,
        message: "Username is available",
      });
    }

    // 3. Check usernames table (claimed handles and reservations)
    try {
      const { data: unameRow } = await supabase
        .from(SUPABASE_TABLES.USERNAMES)
        .select("username, user_id")
        .ilike("username", sanitized)
        .maybeSingle();

      if (unameRow && (!currentUserId || unameRow.user_id !== currentUserId)) {
        return NextResponse.json({
          available: false,
          error: `@${sanitized} is already claimed by another eco-member`,
        });
      }
    } catch {}

    // 4. Check public.users table (active handles)
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
          error: `@${sanitized} is already claimed by another eco-member`,
        });
      }
    } catch {}

    // 5. Check past_usernames across all users (permanently reserved handles)
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
            error: `@${sanitized} is already claimed by another eco-member`,
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
