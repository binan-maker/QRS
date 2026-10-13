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

// ── 2. Authentication & User Session ─────────────────────────────────────────
export * from "../auth";

// ── 3. Database & Storage Adapters ────────────────────────────────────────────
export * from "../db";
export * from "../storage";

// ── 4. Analytics & Metrics ────────────────────────────────────────────────────
export * from "./analytics";

// ── 5. Network & React Query ──────────────────────────────────────────────────
export { queryClient } from "./query-client";

// ── 6. Security & Data Protection ─────────────────────────────────────────────
export * from "./security";

// ── 7. Startup Preferences & Cache Prewarming ─────────────────────────────────
export * from "./startup-prefs";

// ── 8. Direct Supabase Client ────────────────────────────────────────────────
export { supabase } from "./supabase";
