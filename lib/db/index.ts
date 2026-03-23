// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE ENTRY POINT — single import for all services.
// ───────────────────────────────────────────────────────────────────────────────
// To switch your entire backend, edit ONE line in lib/db/config.ts:
//   export const DB_PROVIDER = "firebase"   ← change to "supabase" or "postgres"
//
// No other files need changing.
// ═══════════════════════════════════════════════════════════════════════════════

import { DB_PROVIDER } from "./config";
import type { DbAdapter, RealtimeAdapter } from "./adapter";

// Lazy-load only the active provider so that Node-only packages (e.g. "pg")
// are never bundled into the React Native / Expo app unless they are actually
// the selected provider.
function selectDb(): DbAdapter {
  switch (DB_PROVIDER) {
    case "supabase": {
      const { supabaseDb } = require("./providers/supabase");
      return supabaseDb;
    }
    case "postgres": {
      const { postgresDb } = require("./providers/postgres");
      return postgresDb;
    }
    default: {
      const { firebaseDb } = require("./providers/firebase");
      return firebaseDb;
    }
  }
}

function selectRtdb(): RealtimeAdapter {
  switch (DB_PROVIDER) {
    case "supabase": {
      const { supabaseRtdb } = require("./providers/supabase");
      return supabaseRtdb;
    }
    case "postgres": {
      const { postgresRtdb } = require("./providers/postgres");
      return postgresRtdb;
    }
    default: {
      const { firebaseRtdb } = require("./providers/firebase");
      return firebaseRtdb;
    }
  }
}

export const db = selectDb();
export const rtdb = selectRtdb();

export type { DbAdapter, RealtimeAdapter, DbDocument, QueryOptions, QueryResult, WhereClause } from "./adapter";

// Re-export all service-level API so nothing else in the app needs to change.
export * from "./firebase";
