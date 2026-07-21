import type { Express } from "express";
import { trackRequest, getHealthStatus, SERVER_START_TIME, VERSION } from "./metrics";

export function registerHealthEndpoints(app: Express): void {
  app.get('/health', (_req, res) => {
    trackRequest();
    res.json({ status: 'ok', version: VERSION, uptime: Math.floor((Date.now() - SERVER_START_TIME) / 1000), timestamp: new Date().toISOString() });
  });

  app.get('/api/v1/health', (_req, res) => {
    trackRequest();
    res.json({ status: 'ok', version: VERSION, uptime: Math.floor((Date.now() - SERVER_START_TIME) / 1000), timestamp: new Date().toISOString() });
  });

  app.get('/health/detailed', async (_req, res) => {
    trackRequest();
    try {
      const health = await getHealthStatus();
      const statusCode = health.status === 'healthy' ? 200 : health.status === 'degraded' ? 200 : 503;
      res.status(statusCode).json(health);
    } catch (error: any) {
      res.status(500).json({ status: 'unhealthy', error: error.message, timestamp: new Date().toISOString() });
    }
  });

  app.get('/ready', async (_req, res) => {
    trackRequest();
    try {
      const health = await getHealthStatus();
      const isReady = health.checks.database.status === 'ok' && health.checks.api.status === 'ok';
      if (isReady) {
        res.json({ ready: true, timestamp: new Date().toISOString() });
      } else {
        res.status(503).json({ ready: false, reason: 'Dependencies not ready', timestamp: new Date().toISOString() });
      }
    } catch (error: any) {
      res.status(503).json({ ready: false, reason: error.message, timestamp: new Date().toISOString() });
    }
  });

  app.get('/live', (_req, res) => {
    trackRequest();
    res.json({ alive: true, uptime: Date.now() - SERVER_START_TIME });
  });

  app.get('/metrics', async (_req, res) => {
    trackRequest();
    try {
      const health = await getHealthStatus();
      const metrics = [
        '# HELP qrguard_uptime_seconds Server uptime in seconds',
        '# TYPE qrguard_uptime_seconds counter',
        `qrguard_uptime_seconds ${health.uptime}`,
        '',
        '# HELP qrguard_health_status Server health status (0=healthy, 1=degraded, 2=unhealthy)',
        '# TYPE qrguard_health_status gauge',
        `qrguard_health_status ${health.status === 'healthy' ? 0 : health.status === 'degraded' ? 1 : 2}`,
        '',
        '# HELP qrguard_database_latency_ms Database query latency in milliseconds',
        '# TYPE qrguard_database_latency_ms gauge',
        `qrguard_database_latency_ms ${health.checks.database.latencyMs || 0}`,
        '',
        '# HELP qrguard_api_latency_ms API response latency in milliseconds',
        '# TYPE qrguard_api_latency_ms gauge',
        `qrguard_api_latency_ms ${health.checks.api.latencyMs || 0}`,
        '',
        '# HELP qrguard_memory_used_mb Memory used in megabytes',
        '# TYPE qrguard_memory_used_mb gauge',
        `qrguard_memory_used_mb ${health.checks.memory.usedMb}`,
        '',
        '# HELP qrguard_memory_percent Memory usage percentage',
        '# TYPE qrguard_memory_percent gauge',
        `qrguard_memory_percent ${health.checks.memory.percentUsed}`,
        '',
        '# HELP qrguard_requests_per_minute Current request rate',
        '# TYPE qrguard_requests_per_minute gauge',
        `qrguard_requests_per_minute ${health.metrics.requestsPerMinute}`,
        '',
        '# HELP qrguard_version Server version info',
        '# TYPE qrguard_version info',
        `qrguard_version{version="${health.version}"} 1`,
      ].join('\n');
      res.setHeader('Content-Type', 'text/plain; version=0.0.4');
      res.send(metrics);
    } catch (error: any) {
      res.status(500).send(`# Error collecting metrics: ${error.message}`);
    }
  });
}

// Periodic health logging (every 5 minutes)
setInterval(() => {
  getHealthStatus().then(health => {
    console.log('[HEALTH]', {
      status: health.status,
      uptime: `${Math.floor(health.uptime / 60)}m ${health.uptime % 60}s`,
      db_latency: `${health.checks.database.latencyMs || 0}ms`,
      api_latency: `${health.checks.api.latencyMs || 0}ms`,
      memory: `${health.checks.memory.percentUsed}%`,
      rpm: health.metrics.requestsPerMinute,
    });
  }).catch(err => { console.error('[HEALTH] Check failed:', err.message); });
}, 5 * 60 * 1000);
