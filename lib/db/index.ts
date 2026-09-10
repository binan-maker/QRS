// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE ENTRY POINT — Supabase database and realtime adapters.
// ═══════════════════════════════════════════════════════════════════════════════

import type { DbAdapter, RealtimeAdapter } from "./adapter";

import { supabaseDb, supabaseRtdb } from "./providers/supabase";

export const db: DbAdapter = supabaseDb;
export const rtdb: RealtimeAdapter = supabaseRtdb;

export type { DbAdapter, RealtimeAdapter, DbDocument, QueryOptions, QueryResult, WhereClause } from "./adapter";

export * from "./services";
