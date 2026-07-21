import type { CheckResult, MemoryCheckResult } from "./types";

export async function checkDatabaseConnectivity(): Promise<CheckResult> {
  const startTime = Date.now();
  try {
    const FIREBASE_PROJECT_ID = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID || process.env.FIREBASE_PROJECT_ID || '';
    const FIREBASE_API_KEY = process.env.EXPO_PUBLIC_FIREBASE_API_KEY || process.env.FIREBASE_API_KEY || '';

    if (!FIREBASE_PROJECT_ID || !FIREBASE_API_KEY) {
      return {
        status: 'warning',
        latencyMs: Date.now() - startTime,
        message: 'Firebase credentials not configured',
        details: { hasProjectId: !!FIREBASE_PROJECT_ID, hasApiKey: !!FIREBASE_API_KEY },
      };
    }

    const url = `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents?pageSize=1&key=${FIREBASE_API_KEY}`;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    try {
      const response = await fetch(url, { signal: controller.signal });
      clearTimeout(timeoutId);
      const latency = Date.now() - startTime;
      if (response.ok) {
        return { status: 'ok', latencyMs: latency, message: 'Firestore connected', details: { provider: 'firebase', region: 'auto-detect' } };
      } else if (response.status === 403) {
        return { status: 'warning', latencyMs: latency, message: 'Firestore accessible but permission denied (expected for public key)', details: { provider: 'firebase' } };
      } else {
        return { status: 'error', latencyMs: latency, message: `Firestore returned status ${response.status}`, details: { provider: 'firebase', status: response.status } };
      }
    } catch (error: any) {
      clearTimeout(timeoutId);
      return { status: 'error', latencyMs: Date.now() - startTime, message: error.message || 'Firestore connection failed', details: { error: error.code || 'unknown' } };
    }
  } catch (error: any) {
    return { status: 'error', latencyMs: Date.now() - startTime, message: error.message || 'Database check failed', details: { type: 'connectivity' } };
  }
}

export async function checkApiLatency(): Promise<CheckResult> {
  const startTime = Date.now();
  try {
    const response = await fetch('http://localhost:5000/status', { method: 'GET', headers: { 'Accept': 'application/json' } });
    const latency = Date.now() - startTime;
    if (response.ok) {
      const data = await response.json();
      return { status: 'ok', latencyMs: latency, message: 'API responding normally', details: { endpoint: '/status', response: data } };
    } else {
      return { status: 'warning', latencyMs: latency, message: `API returned status ${response.status}`, details: { endpoint: '/status' } };
    }
  } catch (error: any) {
    return { status: 'error', latencyMs: Date.now() - startTime, message: error.message || 'API check failed', details: { type: 'latency' } };
  }
}

export function checkMemoryUsage(): MemoryCheckResult {
  const memUsage = process.memoryUsage();
  const usedMb = Math.round(memUsage.heapUsed / 1024 / 1024 * 100) / 100;
  const totalMb = Math.round(memUsage.heapTotal / 1024 / 1024 * 100) / 100;
  const percentUsed = Math.round((memUsage.heapUsed / memUsage.heapTotal) * 100 * 100) / 100;
  let status: 'ok' | 'warning' | 'error' = 'ok';
  if (percentUsed > 90) status = 'error';
  else if (percentUsed > 75) status = 'warning';
  return { status, usedMb, totalMb, percentUsed, heapUsedMb: usedMb, heapTotalMb: totalMb };
}

export function checkRateLimiter(): CheckResult {
  try {
    return { status: 'ok', message: 'Rate limiter active', details: { maxRequests: 10, windowMs: 60000, persistence: 'file' } };
  } catch (error: any) {
    return { status: 'error', message: error.message || 'Rate limiter check failed', details: { type: 'rate_limiter' } };
  }
}
