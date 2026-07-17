// ─── @binro/db ────────────────────────────────────────────────────────────────
// Drizzle schema, table definitions, and PostgreSQL client factory.
// ─────────────────────────────────────────────────────────────────────────────

export * from "./schema";
export { getDb } from "./client";
export type { Database } from "./client";
