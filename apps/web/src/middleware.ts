/**
 * Next.js middleware — lightweight route protection.
 *
 * Runs on the Edge Runtime (no Node.js APIs, no firebase-admin).
 * Only checks cookie PRESENCE, not validity.
 * Full session validation happens in:
 *   - Server Components: verify via firebase-admin in the layout
 *   - API routes: GET /api/auth/me
 *
 * Auth flow:
 *   Unauthenticated request to /dashboard → redirect /login?next=/dashboard
 *   Authenticated request to /login        → redirect /dashboard
 *   All other routes                       → pass through
 */

import { NextResponse, type NextRequest } from "next/server";
import {
  SESSION_COOKIE_NAME,
  PROTECTED_PREFIXES,
  AUTH_PREFIXES,
  POST_LOGIN_REDIRECT,
  LOGIN_REDIRECT,
} from "@/lib/auth";

export function middleware(request: NextRequest): NextResponse {
  const { pathname, searchParams } = request.nextUrl;

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  const isAuthenticated = Boolean(sessionCookie?.value);

  // ── Protected routes — require auth ─────────────────────────────────────────
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isProtected && !isAuthenticated) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = LOGIN_REDIRECT;
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // ── Auth routes — redirect away if already authenticated ────────────────────
  const isAuthRoute = AUTH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
  if (isAuthRoute && isAuthenticated) {
    const nextPath = searchParams.get("next");
    const redirectUrl = request.nextUrl.clone();
    redirectUrl.pathname =
      nextPath && PROTECTED_PREFIXES.some((p) => nextPath.startsWith(p))
        ? nextPath
        : POST_LOGIN_REDIRECT;
    redirectUrl.searchParams.delete("next");
    return NextResponse.redirect(redirectUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths EXCEPT:
     * - _next/static  (static files)
     * - _next/image   (image optimisation)
     * - favicon.ico
     * - public assets (png, jpg, svg, etc.)
     * - /api/auth/*   (Next.js auth API routes — these handle their own auth)
     */
    "/((?!_next/static|_next/image|favicon\\.ico|.*\\.(?:png|jpg|jpeg|gif|webp|svg|ico|css|js)|api/auth).*)",
  ],
};
