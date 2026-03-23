// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE ENTRY POINT — Firebase only.
// ───────────────────────────────────────────────────────────────────────────────
// This app uses Firebase exclusively. Postgres and Supabase providers exist
// as code stubs for a future migration but are never loaded at runtime.
// ═══════════════════════════════════════════════════════════════════════════════

import type { DbAdapter, RealtimeAdapter } from "./adapter";
import { firebaseDb } from "./providers/firebase";
import { firebaseRtdb } from "./providers/firebase";

export const db: DbAdapter = firebaseDb;
export const rtdb: RealtimeAdapter = firebaseRtdb;

export type { DbAdapter, RealtimeAdapter, DbDocument, QueryOptions, QueryResult, WhereClause } from "./adapter";

export * from "./firebase";
