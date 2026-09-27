import type { HealthStatus } from "./types";
import { checkDatabaseConnectivity, checkApiLatency, checkMemoryUsage, checkRateLimiter } from "./checks";

export const SERVER_START_TIME = Date.now();
export const VERSION = process.env.npm_package_version || '2.0.0';

let requestCount = 0;
let lastRequestReset = Date.now();

export function trackRequest(): void {
  requestCount++;
}

function getRequestsPerMinute(): number {
  const now = Date.now();
  const elapsedMinutes = (now - lastRequestReset) / 60000;
  if (elapsedMinutes >= 1) {
    const rpm = requestCount / elapsedMinutes;
    requestCount = 0;
    lastRequestReset = now;
    return rpm;
  }
  return requestCount / (elapsedMinutes || 1);
}

export async function getHealthStatus(): Promise<HealthStatus> {
  const [database, api, memory, rateLimiter] = await Promise.all([
    checkDatabaseConnectivity(),
    checkApiLatency(),
    Promise.resolve(checkMemoryUsage()),
    Promise.resolve(checkRateLimiter()),
  ]);

  const allChecks = [database, api, memory, rateLimiter];
  const errorCount = allChecks.filter(c => c.status === 'error').length;
  const warningCount = allChecks.filter(c => c.status === 'warning').length;

  let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
  if (errorCount > 0) status = 'unhealthy';
  else if (warningCount > 0) status = 'degraded';

  return {
    status,
    uptime: Math.floor((Date.now() - SERVER_START_TIME) / 1000),
    version: VERSION,
    timestamp: new Date().toISOString(),
    checks: { database, api, memory, rateLimiter },
    metrics: {
      requestsPerMinute: Math.round(getRequestsPerMinute() * 100) / 100,
      activeConnections: 0,
      cacheHitRate: 0,
    },
  };
}
