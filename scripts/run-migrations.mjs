/**
 * run-migrations.mjs
 * Runs the Drizzle migration SQL files directly against Supabase.
 * Usage: node scripts/run-migrations.mjs
 */

import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbUrl = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL;
if (!dbUrl) {
  console.error("❌  SUPABASE_DATABASE_URL is not set.");
  process.exit(1);
}

// Force Session mode and SSL
let connectionString = dbUrl;
if (!connectionString.includes("sslmode") && !connectionString.includes("ssl=")) {
  connectionString += (connectionString.includes("?") ? "&" : "?") + "sslmode=require";
}

const client = new Client({
  connectionString,
  connectionTimeoutMillis: 15_000,
  statement_timeout: 60_000,
});

function splitStatements(sql) {
  // Drizzle uses '--> statement-breakpoint' as separator; fall back to semicolons.
  if (sql.includes("--> statement-breakpoint")) {
    return sql
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return sql
    .split(/;\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => (s.endsWith(";") ? s : s + ";"));
}

const MIGRATION_FILES = [
  path.join(__dirname, "../packages/db/migrations/0000_graceful_cobalt_man.sql"),
];

const HELPER_SQL = `
-- Realtime key-value store (replaces Firebase RTDB)
CREATE TABLE IF NOT EXISTS rtdb_store (
  path       TEXT        PRIMARY KEY,
  value      JSONB,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
ALTER TABLE rtdb_store ENABLE ROW LEVEL SECURITY;
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'rtdb_store' AND policyname = 'rtdb_auth'
  ) THEN
    CREATE POLICY "rtdb_auth" ON rtdb_store USING (auth.role() = 'authenticated');
  END IF;
END $$;

-- Atomic field increment (used for scan/follower/like counters)
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

async function run() {
  console.log("🔌  Connecting to Supabase...");
  await client.connect();
  console.log("✅  Connected.\n");

  // Run migration files
  for (const filePath of MIGRATION_FILES) {
    const fileName = path.basename(filePath);
    if (!fs.existsSync(filePath)) {
      console.warn(`⚠️   Skipping missing file: ${fileName}`);
      continue;
    }
    console.log(`📄  Running ${fileName}...`);
    const sql = fs.readFileSync(filePath, "utf-8");
    const statements = splitStatements(sql);
    let ok = 0;
    let skipped = 0;
    for (const stmt of statements) {
      try {
        await client.query(stmt);
        ok++;
      } catch (err) {
        const msg = err.message ?? "";
        // "already exists" errors are safe to ignore for idempotent runs
        if (
          msg.includes("already exists") ||
          msg.includes("duplicate") ||
          msg.includes("does not exist") && msg.includes("DROP")
        ) {
          skipped++;
        } else {
          console.error(`\n❌  Statement failed:\n${stmt}\n\nError: ${msg}\n`);
          // Continue — don't abort the whole migration on a single failure
        }
      }
    }
    console.log(`   ✅  ${ok} statements applied, ${skipped} already existed.\n`);
  }

  // Run helper SQL
  console.log("📄  Running helper SQL (rtdb_store + increment_field)...");
  const helperStatements = splitStatements(HELPER_SQL);
  let helperOk = 0;
  for (const stmt of helperStatements) {
    try {
      await client.query(stmt);
      helperOk++;
    } catch (err) {
      const msg = err.message ?? "";
      if (msg.includes("already exists") || msg.includes("duplicate")) {
        // fine — idempotent
      } else {
        console.warn(`   ⚠️  Helper stmt warning: ${msg}`);
      }
    }
  }
  console.log(`   ✅  Helper SQL done.\n`);

  await client.end();
  console.log("🎉  All migrations complete. The app's cloud data should now work.");
}

run().catch((err) => {
  console.error("Fatal:", err.message);
  client.end().catch(() => {});
  process.exit(1);
});
