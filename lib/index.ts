// ═══════════════════════════════════════════════════════════════════════════════
// LIB ROOT BARREL — Core Infrastructure & System Libraries
// ───────────────────────────────────────────────────────────────────────────────
// This file serves as the unified entry point for all core utilities,
// database clients, auth adapters, storage providers, and system services.
//
// Designed so any developer (even someone looking at the codebase for the
// first time) can easily locate and reuse system-level modules.
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. Logging & Diagnostics ──────────────────────────────────────────────────
export { logger, createLogger, type Logger, type LogLevel } from "./logger";

// ── 2. Error Handling ────────────────────────────────────────────────────────
export * from "./errors";
export * from "./error-handlers";

// ── 3. Authentication & User Session ─────────────────────────────────────────
export * from "./auth";

// ── 4. Database & Storage Adapters ────────────────────────────────────────────
export * from "./db";
export * from "./storage";

// ── 5. Analytics & Metrics ────────────────────────────────────────────────────
export * from "./analytics";

// ── 6. Push Notifications ─────────────────────────────────────────────────────
export * from "./push-notifications";

// ── 7. Network & React Query ──────────────────────────────────────────────────
export { queryClient } from "./query-client";

// ── 8. Security & Data Protection ─────────────────────────────────────────────
export * from "./security";

// ── 9. Startup Preferences & Cache Prewarming ─────────────────────────────────
export * from "./startup-prefs";

// ── 10. Direct Supabase Client ────────────────────────────────────────────────
export { supabase } from "./supabase";
