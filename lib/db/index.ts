// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE ENTRY POINT — Supabase provider.
// ═══════════════════════════════════════════════════════════════════════════════

import type { DbAdapter, RealtimeAdapter } from "./adapter";

function loadSupabaseDb(): DbAdapter {
  return require("./providers/supabase").supabaseDb;
}

function loadSupabaseRtdb(): RealtimeAdapter {
  return require("./providers/supabase").supabaseRtdb;
}

export const db: DbAdapter = loadSupabaseDb();
export const rtdb: RealtimeAdapter = loadSupabaseRtdb();

export type { DbAdapter, RealtimeAdapter, DbDocument, QueryOptions, QueryResult, WhereClause } from "./adapter";

export * from "./services";
