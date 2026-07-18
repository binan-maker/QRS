/**
 * GET /api/auth/me
 *
 * Validate the session cookie and return the authenticated user's basic info.
 * Used by client components that need to know who is logged in without
 * waiting for Firebase Auth to initialise.
 *
 * Response:
 *   200 { data: { uid, email, emailVerified, name, picture } }
 *   401 { error: "...", code: "AUTH_REQUIRED" | "TOKEN_INVALID" }
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { verifySessionCookie } from "@/lib/firebase-admin";
import { SESSION_COOKIE_NAME } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)?.value;

  if (!sessionCookie) {
    return NextResponse.json(
      { error: "No session cookie", code: "AUTH_REQUIRED" },
      { status: 401 },
    );
  }

  const decoded = await verifySessionCookie(sessionCookie);

  if (!decoded) {
    // Cookie present but invalid / expired — clear it
    const res = NextResponse.json(
      { error: "Session expired or invalid", code: "TOKEN_INVALID" },
      { status: 401 },
    );
    res.cookies.delete(SESSION_COOKIE_NAME);
    return res;
  }

  return NextResponse.json({
    data: {
      uid:           decoded.uid,
      email:         decoded.email ?? null,
      emailVerified: decoded.email_verified ?? false,
      name:          decoded.name ?? null,
      picture:       decoded.picture ?? null,
    },
  });
}
