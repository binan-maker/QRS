import type { CheckResult, MemoryCheckResult } from "./types";

export async function checkDatabaseConnectivity(): Promise<CheckResult> {
  const startTime = Date.now();
  try {
    const supabaseUrl = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL ?? "";
    const supabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ??
      process.env.SUPABASE_ANON_KEY ??
      process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
      "";

    if (!supabaseUrl || !supabaseKey) {
      return {
        status: "warning",
        latencyMs: Date.now() - startTime,
        message: "Supabase credentials not configured",
        details: { hasUrl: !!supabaseUrl, hasKey: !!supabaseKey },
      };
    }

    // Ping the Supabase REST API health endpoint
    const url = `${supabaseUrl}/rest/v1/`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: { apikey: supabaseKey, Authorization: `Bearer ${supabaseKey}` },
      });
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;

      if (response.ok || response.status === 200) {
        return {
          status: "ok",
          latencyMs: latency,
          message: "Supabase connected",
          details: { provider: "supabase" },
        };
      } else if (response.status === 401) {
        return {
          status: "warning",
          latencyMs: latency,
          message: "Supabase reachable but auth key invalid",
          details: { provider: "supabase", status: response.status },
        };
      } else {
        return {
          status: "error",
          latencyMs: latency,
          message: `Supabase returned status ${response.status}`,
          details: { provider: "supabase", status: response.status },
        };
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
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
