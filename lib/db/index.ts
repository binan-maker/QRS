// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE ENTRY POINT — single import for all services.
// ───────────────────────────────────────────────────────────────────────────────
// To switch your entire backend, edit ONE line in lib/db/config.ts:
//   export const DB_PROVIDER = "firebase"   ← change to "supabase" or "postgres"
//
// No other files need changing.
// ═══════════════════════════════════════════════════════════════════════════════

import { DB_PROVIDER } from "./config";
import { firebaseDb, firebaseRtdb } from "./providers/firebase";
import { supabaseDb, supabaseRtdb } from "./providers/supabase";
import { postgresDb, postgresRtdb } from "./providers/postgres";
import type { DbAdapter, RealtimeAdapter } from "./adapter";

function selectDb(): DbAdapter {
  switch (DB_PROVIDER) {
    case "firebase": return firebaseDb;
    case "supabase": return supabaseDb;
    case "postgres": return postgresDb;
    default:         return firebaseDb;
  }
}

function selectRtdb(): RealtimeAdapter {
  switch (DB_PROVIDER) {
    case "firebase": return firebaseRtdb;
    case "supabase": return supabaseRtdb;
    case "postgres": return postgresRtdb;
    default:         return firebaseRtdb;
  }
}

export const db = selectDb();
export const rtdb = selectRtdb();

export type { DbAdapter, RealtimeAdapter, DbDocument, QueryOptions, QueryResult, WhereClause } from "./adapter";

// Re-export all service-level API so nothing else in the app needs to change.
export * from "./firebase";
