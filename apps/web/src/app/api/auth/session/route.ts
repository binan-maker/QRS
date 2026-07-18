/**
 * /api/auth/session
 *
 * POST — Exchange a Firebase ID token for a long-lived httpOnly session cookie.
 *         Called client-side immediately after Firebase signIn().
 *
 * DELETE — Clear the session cookie (sign out server-side).
 */

import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { z } from "zod";
import { createSessionCookie } from "@/lib/firebase-admin";
import { SESSION_COOKIE_NAME, SESSION_COOKIE_MAX_AGE } from "@/lib/auth";

const postSchema = z.object({
  idToken: z.string().min(1),
});

// ─── POST /api/auth/session ───────────────────────────────────────────────────

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON", code: "BAD_REQUEST" }, { status: 400 });
  }

  const parsed = postSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "idToken is required", code: "VALIDATION_ERROR" },
      { status: 400 },
    );
  }

  const sessionCookie = await createSessionCookie(
    parsed.data.idToken,
    SESSION_COOKIE_MAX_AGE * 1000, // convert seconds → ms
  );

  if (!sessionCookie) {
    return NextResponse.json(
      { error: "Failed to create session — Firebase Admin SDK may not be configured", code: "SESSION_ERROR" },
      { status: 500 },
    );
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, sessionCookie, {
    maxAge: SESSION_COOKIE_MAX_AGE,
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
  });

  return NextResponse.json({ ok: true });
}

// ─── DELETE /api/auth/session ─────────────────────────────────────────────────

export async function DELETE() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
  return NextResponse.json({ ok: true });
}
