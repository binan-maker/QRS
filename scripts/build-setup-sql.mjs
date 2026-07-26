/**
 * Transforms the Drizzle migration SQL into a fully idempotent Supabase setup
 * script that can be run multiple times without errors.
 *
 * Transformations applied:
 *  - CREATE TYPE → wrapped in DO $$ BEGIN ... EXCEPTION WHEN duplicate_object THEN NULL; END $$;
 *  - CREATE TABLE → CREATE TABLE IF NOT EXISTS
 *  - CREATE INDEX / CREATE UNIQUE INDEX → CREATE INDEX/UNIQUE INDEX IF NOT EXISTS
 *  - ALTER TABLE ... ADD CONSTRAINT → wrapped in exception handler
 *  - ALTER TABLE ... ADD COLUMN → wrapped in exception handler
 *  - Removes Drizzle-specific "--> statement-breakpoint" markers
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const migrationPath = path.join(
  __dirname,
  "../packages/db/migrations/0000_graceful_cobalt_man.sql"
);

const raw = fs.readFileSync(migrationPath, "utf-8");

// Split on Drizzle's statement-breakpoint marker or double newlines
const rawStatements = raw
  .split(/--> statement-breakpoint/)
  .map((s) => s.trim())
  .filter(Boolean);

function wrapInDoBlock(sql) {
  // Escape any $$ inside the sql first (unlikely but safe)
  const escaped = sql.replace(/\$\$/g, "\\$\\$");
  return `DO $idempotent$
BEGIN
  ${sql}
EXCEPTION WHEN duplicate_object OR duplicate_table THEN
  -- already exists, skip
END;
$idempotent$;`;
}

function transformStatement(stmt) {
  const s = stmt.replace(/;$/, "").trim();

  // ── CREATE TYPE ─────────────────────────────────────────────────────────────
  if (/^CREATE TYPE\b/i.test(s)) {
    return `DO $idempotent$ BEGIN
  ${s};
EXCEPTION WHEN duplicate_object THEN NULL;
END $idempotent$;`;
  }

  // ── CREATE TABLE ─────────────────────────────────────────────────────────────
  if (/^CREATE TABLE\b/i.test(s)) {
    return s.replace(/^CREATE TABLE\b/i, "CREATE TABLE IF NOT EXISTS") + ";";
  }

  // ── CREATE UNIQUE INDEX ───────────────────────────────────────────────────────
  if (/^CREATE UNIQUE INDEX\b/i.test(s)) {
    return (
      s.replace(/^CREATE UNIQUE INDEX\b/i, "CREATE UNIQUE INDEX IF NOT EXISTS") + ";"
    );
  }

  // ── CREATE INDEX ─────────────────────────────────────────────────────────────
  if (/^CREATE INDEX\b/i.test(s)) {
    return s.replace(/^CREATE INDEX\b/i, "CREATE INDEX IF NOT EXISTS") + ";";
  }

  // ── ALTER TABLE ... ADD CONSTRAINT ───────────────────────────────────────────
  if (/^ALTER TABLE\b/i.test(s) && /ADD CONSTRAINT\b/i.test(s)) {
    return `DO $idempotent$ BEGIN
  ${s};
EXCEPTION WHEN duplicate_object THEN NULL;
END $idempotent$;`;
  }

  // ── ALTER TABLE ... ENABLE ROW LEVEL SECURITY ────────────────────────────────
  if (/^ALTER TABLE\b/i.test(s) && /ENABLE ROW LEVEL SECURITY/i.test(s)) {
    return s + ";"; // idempotent by default
  }

  // ── ALTER TABLE ... ADD COLUMN ───────────────────────────────────────────────
  if (/^ALTER TABLE\b/i.test(s) && /ADD COLUMN\b/i.test(s)) {
    return `DO $idempotent$ BEGIN
  ${s};
EXCEPTION WHEN duplicate_column THEN NULL;
END $idempotent$;`;
  }

  // ── Everything else — keep as-is ─────────────────────────────────────────────
  return s + ";";
}

const transformed = rawStatements.map(transformStatement).join("\n\n");

const helperSQL = `
-- ═══════════════════════════════════════════════════════════════════════
-- HELPER: Realtime key-value store (replaces Firebase RTDB)
-- ═══════════════════════════════════════════════════════════════════════
CREATE TABLE IF NOT EXISTS rtdb_store (
  path       TEXT        PRIMARY KEY,
  value      JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE rtdb_store ENABLE ROW LEVEL SECURITY;

DO $idempotent$ BEGIN
  CREATE POLICY "rtdb_auth" ON rtdb_store USING (auth.role() = 'authenticated');
EXCEPTION WHEN duplicate_object THEN NULL;
END $idempotent$;

-- ═══════════════════════════════════════════════════════════════════════
-- HELPER: Atomic field increment (scan / follower / like counters)
-- ═══════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION increment_field(
  p_table TEXT, p_id TEXT, p_field TEXT, p_delta NUMERIC DEFAULT 1
) RETURNS VOID LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  EXECUTE format(
    'UPDATE %I SET %I = COALESCE(%I, 0) + $1 WHERE id = $2',
    p_table, p_field, p_field
  ) USING p_delta, p_id;
END;
$$;
`;

const header = `-- ═══════════════════════════════════════════════════════════════════════
-- BinRo — Supabase Database Setup (fully idempotent, safe to re-run)
-- Generated: ${new Date().toISOString().slice(0, 10)}
-- Paste the entire contents of this file into the Supabase SQL Editor
-- and click Run. "already exists" cases are handled gracefully.
-- ═══════════════════════════════════════════════════════════════════════

`;

const output = header + transformed + "\n" + helperSQL;
const outPath = path.join(__dirname, "supabase-setup.sql");
fs.writeFileSync(outPath, output, "utf-8");

const lines = output.split("\n").length;
const statements = rawStatements.length;
console.log(`✅  Generated scripts/supabase-setup.sql`);
console.log(`   ${lines} lines, ${statements} source statements transformed`);
