/**
 * GET /api/health — web app health check.
 * Used by deployment platforms and load balancers.
 */

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export function GET() {
  return NextResponse.json({
    status: "ok",
    app: "@binro/web",
    timestamp: new Date().toISOString(),
  });
}
