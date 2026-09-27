/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * BINRO API: HTTP ROUTE REGISTRATION & SERVER FACTORY
 * ───────────────────────────────────────────────────────────────────────────────
 * Mounts the versioned API routers, domain controllers, and health endpoints.
 *
 * Route Hierarchy:
 * - /api/v1/*   All primary REST endpoints (users, qr, comments, feedback, etc.)
 * - /api/push   Mobile push notification device registration and token tracking
 * - /status     Quick liveness ping for container probes
 * ═══════════════════════════════════════════════════════════════════════════════
 */

import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { registerV1Routes } from "./routes/index";
import { registerIfscRoute } from "./routes/ifsc";
import { pushRouter } from "./routes/push";
import { securityRouter } from "./routes/security";

/**
 * Registers all application routes and returns the configured Node HTTP server.
 *
 * @param app Express application instance
 * @returns Configured Node HTTP server instance
 */
export async function registerRoutes(app: Express): Promise<Server> {
  // ── 1. Versioned REST API (/api/v1/*) ───────────────────────────────────────
  registerV1Routes(app);

  // ── 2. Specialized Domain Modules ──────────────────────────────────────────
  registerIfscRoute(app);
  app.use("/api/push", pushRouter);

  // ── 3. Unversioned Aliases for Client Compatibility ─────────────────────────
  app.use("/api", securityRouter);

  // ── 4. Quick Liveness Health Probe ──────────────────────────────────────────
  app.get("/status", (_req, res) => {
    res.json({
      status: "ok",
      timestamp: new Date().toISOString(),
      service: "binro-api",
    });
  });

  const httpServer = createServer(app);
  return httpServer;
}
