// ================================================================
// DATABASE ADAPTER — single entry point for all data operations.
//
// To swap your backend (e.g., Firebase → Supabase or PostgreSQL):
//   1. Create a new implementation file, e.g.:
//        lib/db/supabase.ts  — Supabase implementation
//        lib/db/postgres.ts  — PostgreSQL implementation
//      Make it export the exact same function names.
//   2. Change ONLY the import line below to point to your new file.
//   3. That's it — no other files need to change.
//
// Current backend: Firebase (Firestore + Realtime Database)
// ================================================================

export * from "./firebase";
