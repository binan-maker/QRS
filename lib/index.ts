// ═══════════════════════════════════════════════════════════════════════════════
// BINRO LIB — Unified Barrel Export
// ───────────────────────────────────────────────────────────────────────────────
// Clean single barrel export exposing:
//   - auth: all auth adapters, providers, hooks, and helpers
//   - db: all database clients, adapters, distributed counter, and services
//   - storage: all storage adapters and avatar upload providers
//   - core: all low-level system utilities in ONE place
//   - user: dedicated user account operations & username service
//   - errors: centralized application typed error hierarchy & crash handlers
//   - data-service: primary data query gateway facade for mobile screens
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. Core System Utilities ─────────────────────────────────────────────────
export * from "./core";

// ── 2. Authentication ────────────────────────────────────────────────────────
export * from "./auth";

// ── 3. Database & Distributed Counter ─────────────────────────────────────────
export * from "./db";

// ── 4. Storage ───────────────────────────────────────────────────────────────
export * from "./storage";

// ── 5. User Account Operations ───────────────────────────────────────────────
export * from "./user";

// ── 6. Errors & Diagnostics ──────────────────────────────────────────────────
export * from "./errors";

// ── 7. Primary Data Service Gateway Facade ───────────────────────────────────
export * from "./data-service";
