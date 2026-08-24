// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE PROVIDER CONFIGURATION
// ───────────────────────────────────────────────────────────────────────────────
// This app uses Firebase for all data storage and authentication.
//
//   Cloud Firestore      → primary document database (QR scans, user data)
//   Realtime Database    → notifications and live updates
//   Firebase Auth        → user authentication (email + Google OAuth)
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
