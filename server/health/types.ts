export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  version: string;
  timestamp: string;
  checks: {
    database: CheckResult;
    api: CheckResult;
    memory: MemoryCheckResult;
    rateLimiter: CheckResult;
  };
  metrics: {
    requestsPerMinute: number;
    activeConnections: number;
    cacheHitRate: number;
  };
}

export interface CheckResult {
  status: 'ok' | 'warning' | 'error';
  latencyMs?: number;
  message?: string;
  details?: Record<string, any>;
}

export interface MemoryCheckResult {
  status: 'ok' | 'warning' | 'error';
  usedMb: number;
  totalMb: number;
  percentUsed: number;
  heapUsedMb: number;
  heapTotalMb: number;
}
