// ═══════════════════════════════════════════════════════════════════════════════
// POSTGRESQL PROVIDER STUB
// ───────────────────────────────────────────────────────────────────────────────
// To activate: set DB_PROVIDER = "postgres" in lib/db/config.ts
//
// Setup steps:
//  1. Install:  npm install pg  (already in package.json)
//  2. Add env var:
//       DATABASE_URL=postgresql://user:password@host:5432/dbname
//  3. Run migrations (shared/schema.ts has your Drizzle schema — run db:push).
//  4. Use your Express backend as a REST proxy: the mobile app calls your
//     /api/* endpoints, which use pg/drizzle on the server side. That way
//     DATABASE_URL stays server-side only.
//  5. OR use Drizzle ORM directly if running in a Node.js environment.
//
// Suggested table schema → see shared/schema.ts (Drizzle definitions are ready).
// ═══════════════════════════════════════════════════════════════════════════════

import type { DbAdapter, RealtimeAdapter, QueryOptions, QueryResult } from "../adapter";

function notImplemented(method: string): never {
  throw new Error(`[postgres] ${method} not yet implemented. Fill in lib/db/providers/postgres.ts`);
}

export const postgresDb: DbAdapter = {
  async get(path) { notImplemented("get"); },
  async set(path, data) { notImplemented("set"); },
  async add(path, data) { notImplemented("add"); },
  async update(path, data) { notImplemented("update"); },
  async delete(path) { notImplemented("delete"); },
  async query(collectionPath, opts): Promise<QueryResult> { notImplemented("query"); },
  async increment(docPath, field, delta) { notImplemented("increment"); },
  onDoc(path, cb) { notImplemented("onDoc"); },
  onQuery(collectionPath, opts, cb) { notImplemented("onQuery"); },
  timestamp() { return new Date().toISOString(); },
};

export const postgresRtdb: RealtimeAdapter = {
  async push(path, data) { notImplemented("rtdb.push"); },
  async remove(path) { notImplemented("rtdb.remove"); },
  async get(path) { notImplemented("rtdb.get"); },
  async update(updates) { notImplemented("rtdb.update"); },
  onValue(path, cb) { notImplemented("rtdb.onValue"); },
  offValue(path, cb) {},
};
