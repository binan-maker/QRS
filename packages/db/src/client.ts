// ─── PostgreSQL client factory ────────────────────────────────────────────────
// This module is intentionally NOT imported by the app yet.
// The app runs on Firebase / Firestore as the primary store.
// Activate this client when DATABASE_URL is provisioned and the PostgreSQL
// migration (roadmap Phase 2) begins.
// ─────────────────────────────────────────────────────────────────────────────

import { drizzle } from "drizzle-orm/node-postgres";
import * as schema from "./schema";

let _instance: ReturnType<typeof drizzle<typeof schema>> | null = null;

/**
 * Returns a lazily-initialised Drizzle client.
 * Throws clearly if DATABASE_URL has not been set.
 */
export function getDb(): ReturnType<typeof drizzle<typeof schema>> {
  if (_instance) return _instance;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      "DATABASE_URL is required to connect to PostgreSQL. " +
        "Set it in your environment before calling getDb().",
    );
  }

  _instance = drizzle(url, { schema });
  return _instance;
}

export type Database = ReturnType<typeof getDb>;
