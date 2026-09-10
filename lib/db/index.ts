// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE ENTRY POINT — Firebase database and realtime adapters.
// ═══════════════════════════════════════════════════════════════════════════════

import type { DbAdapter, RealtimeAdapter } from "./adapter";

import { firebaseDb, firebaseRtdb } from "./providers/firebase";

export const db: DbAdapter = firebaseDb;
export const rtdb: RealtimeAdapter = firebaseRtdb;

export type { DbAdapter, RealtimeAdapter, DbDocument, QueryOptions, QueryResult, WhereClause } from "./adapter";

export * from "./services";
