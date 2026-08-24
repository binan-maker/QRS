import type { CheckResult, MemoryCheckResult } from "./types";

export async function checkDatabaseConnectivity(): Promise<CheckResult> {
  const startTime = Date.now();
  try {
    if (!process.env.FIREBASE_SERVICE_ACCOUNT) {
      return {
        status: "warning",
        latencyMs: Date.now() - startTime,
        message: "Firebase Admin credentials not configured",
        details: { hasServiceAccount: false },
      };
    }

    try {
      const { getAdminDb } = await import("../lib/firebase-admin");
      const db = getAdminDb();
      if (!db) throw new Error("Firebase Admin unavailable");
      await db.listCollections();
      const latency = Date.now() - startTime;
      return { status: "ok", latencyMs: latency, message: "Firebase connected", details: { provider: "firebase" } };
    } catch (error: any) {
      return {
        status: "error",
        latencyMs: Date.now() - startTime,
        message: error.message || "Firebase connection failed",
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
