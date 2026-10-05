// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE PROVIDER CONFIGURATION
// ───────────────────────────────────────────────────────────────────────────────
// This app uses Supabase for all data storage and authentication.
//
//   PostgreSQL           → primary relational database (QR scans, user data)
//   Supabase Realtime    → notifications and live updates
//   Supabase Auth        → user authentication (email + Google OAuth)
//
// To switch providers, edit the ONE import line in:
//   lib/auth/index.ts       (auth)
//   lib/db/index.ts         (database / realtime)
//   lib/storage/index.ts    (storage)
// ═══════════════════════════════════════════════════════════════════════════════

// NOTE: These constants are informational. The active provider is determined
// by the import in each lib/*/index.ts entry point, not by these values.
export const DB_PROVIDER = "supabase" as const;
export const AUTH_PROVIDER = "supabase" as const;
