// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE PROVIDER CONFIGURATION
// ───────────────────────────────────────────────────────────────────────────────
// Change DB_PROVIDER to switch the entire backend in one line.
//
//   "firebase"  → Firebase Firestore + Realtime Database (current)
//   "supabase"  → Supabase Postgres + Realtime (fill in lib/db/providers/supabase.ts)
//   "postgres"  → Direct PostgreSQL via REST API (fill in lib/db/providers/postgres.ts)
//
// ═══════════════════════════════════════════════════════════════════════════════

export const DB_PROVIDER = "firebase" as "firebase" | "supabase" | "postgres";

// ─── Auth Provider ────────────────────────────────────────────────────────────
// Controls which auth system is used. Usually matches DB_PROVIDER, but can differ.
//   "firebase"  → Firebase Auth (email + Google OAuth, email verification)
//   "supabase"  → Supabase Auth
//   "custom"    → Your own JWT/session auth
// ─────────────────────────────────────────────────────────────────────────────
export const AUTH_PROVIDER = "firebase" as "firebase" | "supabase" | "custom";
