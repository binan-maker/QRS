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
// ═══════════════════════════════════════════════════════════════════════════════

export const DB_PROVIDER = "firebase" as const;

export const AUTH_PROVIDER = "firebase" as const;
