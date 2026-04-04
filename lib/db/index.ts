// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE ENTRY POINT — Firebase only.
// ───────────────────────────────────────────────────────────────────────────────
// Uses lazy require() instead of static imports to avoid creating a hard
// circular-dependency at module-evaluation time.
// (lib/db/firebase.ts re-exports service functions that import lib/db/index.ts —
// CommonJS lazy-require handles that cycle gracefully; static ESM imports cannot.)
// ═══════════════════════════════════════════════════════════════════════════════

import type { DbAdapter, RealtimeAdapter } from "./adapter";

function loadFirebaseDb(): DbAdapter {
  return require("./providers/firebase").firebaseDb;
}

function loadFirebaseRtdb(): RealtimeAdapter {
  return require("./providers/firebase").firebaseRtdb;
}

export const db: DbAdapter = loadFirebaseDb();
export const rtdb: RealtimeAdapter = loadFirebaseRtdb();

export type { DbAdapter, RealtimeAdapter, DbDocument, QueryOptions, QueryResult, WhereClause } from "./adapter";

export * from "./firebase";
