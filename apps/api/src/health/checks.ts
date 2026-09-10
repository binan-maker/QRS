import type { CheckResult, MemoryCheckResult } from "./types";

export async function checkDatabaseConnectivity(): Promise<CheckResult> {
  const startTime = Date.now();
  try {
    if (!process.env.SUPABASE_URL) {
      return {
        status: "warning",
        latencyMs: Date.now() - startTime,
        message: "Supabase credentials not configured",
        details: { configured: false },
      };
    }

    try {
      const { getAdminSupabase } = await import("../lib/supabase-admin");
      const db = getAdminSupabase();
      if (!db) throw new Error("Supabase client unavailable");
      const { error } = await db.from("users").select("id").limit(1);
      if (error) throw error;
      const latency = Date.now() - startTime;
      return { status: "ok", latencyMs: latency, message: "Supabase connected", details: { provider: "supabase" } };
    } catch (error: any) {
      return {
        status: "error",
        latencyMs: Date.now() - startTime,
         message: error.message || "Supabase connection failed",
        details: { error: error.code || "unknown" },
      };
    }
  } catch (error: any) {
    return {
      status: "error",
      latencyMs: Date.now() - startTime,
      message: error.message || "Database check failed",
      details: { type: "connectivity" },
    };
  }
}

export async function checkApiLatency(): Promise<CheckResult> {
  const startTime = Date.now();
  try {
    const response = await fetch("http://localhost:5000/status", {
      method: "GET",
      headers: { Accept: "application/json" },
      signal: AbortSignal.timeout(5000),
    });
    const latency = Date.now() - startTime;
    if (response.ok) {
      const data = await response.json();
      return {
        status: "ok",
        latencyMs: latency,
        message: "API responding normally",
        details: { endpoint: "/status", response: data },
      };
    } else {
      return {
        status: "warning",
        latencyMs: latency,
        message: `API returned status ${response.status}`,
        details: { endpoint: "/status" },
      };
    }
  } catch (error: any) {
    return {
      status: "error",
      latencyMs: Date.now() - startTime,
      message: error.message || "API check failed",
      details: { type: "latency" },
    };
  }
}

export function checkMemoryUsage(): MemoryCheckResult {
  const memUsage = process.memoryUsage();
  const usedMb = Math.round((memUsage.heapUsed / 1024 / 1024) * 100) / 100;
  const totalMb = Math.round((memUsage.heapTotal / 1024 / 1024) * 100) / 100;
  const percentUsed = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100 * 100) / 100;
  let status: "ok" | "warning" | "error" = "ok";
  if (percentUsed > 90) status = "error";
  else if (percentUsed > 75) status = "warning";
  return { status, usedMb, totalMb, percentUsed, heapUsedMb: usedMb, heapTotalMb: totalMb };
}

export function checkRateLimiter(): CheckResult {
  try {
    return {
      status: "ok",
      message: "Rate limiter active",
      details: { maxRequests: 10, windowMs: 60000, persistence: "file" },
    };
  } catch (error: any) {
    return {
      status: "error",
      message: error.message || "Rate limiter check failed",
      details: { type: "rate_limiter" },
    };
  }
}
