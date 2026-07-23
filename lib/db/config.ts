// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE PROVIDER CONFIGURATION
// ───────────────────────────────────────────────────────────────────────────────
// This app uses Firebase exclusively for all data storage and authentication.
//
//   Firebase Firestore   → primary document database (QR scans, user data)
//   Firebase Realtime DB → notifications, velocity tracking
//   Firebase Auth        → user authentication (email + Google OAuth)
//
// Postgres and Supabase providers exist as shims for a future migration
// (~10k users) but are NOT connected and will never be loaded at runtime.
//
// To switch providers, edit the ONE import line in:
//   lib/auth/index.ts       (auth)
//   lib/db/index.ts         (database / realtime)
//   lib/storage/index.ts    (storage)
// ═══════════════════════════════════════════════════════════════════════════════

// NOTE: These constants are informational. The active provider is determined
// by the import in each lib/*/index.ts entry point, not by these values.
export const DB_PROVIDER = "firebase" as const;
export const AUTH_PROVIDER = "firebase" as const;
