// ═══════════════════════════════════════════════════════════════════════════════
// LIB CORE BARREL — Low-Level System Utilities & Client Instances
// ───────────────────────────────────────────────────────────────────────────────
// Foundational system layer providing:
//   - supabase: Supabase client & environment configuration
//   - query-client: TanStack React Query client & API utilities
//   - startup-prefs: Startup cache prewarmer & persistent preference keys
//   - logger: Centralized structured logger
//   - security: Input sanitization & ECDSA verification
//   - analytics: Telemetry & event tracking
// ═══════════════════════════════════════════════════════════════════════════════

export * from "./supabase";
export * from "./query-client";
export * from "./startup-prefs";
export * from "./logger";
export * from "./security";
export * from "./analytics";
export * from "./push-notifications";

