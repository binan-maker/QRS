/**
 * Migration runner — applies schema + RLS policies to Supabase.
 * Run with: node scripts/run-migrations.mjs
 */
import pg from "pg";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const { Client } = pg;
const __dirname = path.dirname(fileURLToPath(import.meta.url));

const dbUrl = process.env.SUPABASE_DATABASE_URL;
if (!dbUrl) {
  console.error("❌ SUPABASE_DATABASE_URL is not set.");
  process.exit(1);
}

const client = new Client({
  connectionString: dbUrl,
  ssl: { rejectUnauthorized: false },
});

async function tableExists(client, tableName) {
  const res = await client.query(
    `SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = $1
    )`,
    [tableName]
  );
  return res.rows[0].exists;
}

async function policyExists(client, tableName, policyName) {
  const res = await client.query(
    `SELECT EXISTS (
      SELECT FROM pg_policies
      WHERE schemaname = 'public' AND tablename = $1 AND policyname = $2
    )`,
    [tableName, policyName]
  );
  return res.rows[0].exists;
}

async function run() {
  console.log("🔌 Connecting to Supabase...");
  await client.connect();
  console.log("✅ Connected.\n");

  // ── 1. Check which key tables already exist ──────────────────────────────
  const keyTables = ["users", "qr_codes", "qr_scans", "qr_comments", "notifications", "donations"];
  const existingTables = {};
  for (const t of keyTables) {
    existingTables[t] = await tableExists(client, t);
  }
  console.log("📋 Table status:");
  for (const [t, exists] of Object.entries(existingTables)) {
    console.log(`   ${exists ? "✅" : "❌"} ${t}`);
  }
  console.log();

  // ── 2. Run schema migration if needed ────────────────────────────────────
  if (!existingTables["qr_codes"]) {
    console.log("📦 Running schema migration (0000_graceful_cobalt_man.sql)...");
    const schemaSQL = fs.readFileSync(
      path.join(__dirname, "../packages/db/migrations/0000_graceful_cobalt_man.sql"),
      "utf8"
    );
    // Drizzle uses --> statement-breakpoint as separator
    const statements = schemaSQL
      .split("--> statement-breakpoint")
      .map((s) => s.trim())
      .filter(Boolean);

    let ok = 0, skipped = 0, failed = 0;
    for (const stmt of statements) {
      try {
        await client.query(stmt);
        ok++;
      } catch (err) {
        if (err.message.includes("already exists")) {
          skipped++;
        } else {
          console.warn(`   ⚠️  ${err.message.slice(0, 120)}`);
          failed++;
        }
      }
    }
    console.log(`   ✅ Schema: ${ok} ok, ${skipped} skipped (already exist), ${failed} warnings\n`);
  } else {
    console.log("✅ Schema already applied — skipping.\n");
  }

  // ── 3. Check if RLS policies are already set ──────────────────────────────
  const testPolicy = await policyExists(client, "qr_codes", "qr_codes: authenticated can read all");
  if (!testPolicy) {
    console.log("🔒 Applying RLS policies (rls_policies.sql)...");
    const rlsSQL = fs.readFileSync(
      path.join(__dirname, "../packages/db/migrations/rls_policies.sql"),
      "utf8"
    );
    // Split on semicolons, keeping each statement
    const statements = rlsSQL
      .split(/;\s*\n/)
      .map((s) => s.trim())
      .filter((s) => s && !s.startsWith("--"));

    let ok = 0, skipped = 0, failed = 0;
    for (const stmt of statements) {
      const fullStmt = stmt.endsWith(";") ? stmt : stmt + ";";
      try {
        await client.query(fullStmt);
        ok++;
      } catch (err) {
        if (
          err.message.includes("already exists") ||
          err.message.includes("already enabled")
        ) {
          skipped++;
        } else {
          console.warn(`   ⚠️  ${err.message.slice(0, 120)}`);
          failed++;
        }
      }
    }
    console.log(`   ✅ RLS: ${ok} ok, ${skipped} skipped, ${failed} warnings\n`);
  } else {
    console.log("✅ RLS policies already applied — skipping.\n");
  }

  // ── 4. rtdb_store helper table + increment_field function ─────────────────
  console.log("🔧 Ensuring rtdb_store and increment_field...");
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS public.rtdb_store (
        key   text PRIMARY KEY,
        value jsonb NOT NULL DEFAULT '{}'::jsonb,
        updated_at timestamptz NOT NULL DEFAULT now()
      );
    `);
    console.log("   ✅ rtdb_store table OK");
  } catch (err) {
    console.warn(`   ⚠️  rtdb_store: ${err.message.slice(0, 120)}`);
  }

  try {
    await client.query(`
      CREATE OR REPLACE FUNCTION public.increment_field(
        table_name text,
        row_id     text,
        field_name text,
        amount     integer DEFAULT 1
      ) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
      BEGIN
        EXECUTE format(
          'UPDATE public.%I SET %I = COALESCE(%I, 0) + $1 WHERE id = $2',
          table_name, field_name, field_name
        ) USING amount, row_id;
      END;
      $$;
    `);
    console.log("   ✅ increment_field function OK");
  } catch (err) {
    console.warn(`   ⚠️  increment_field: ${err.message.slice(0, 120)}`);
  }

  // ── 5. Storage bucket reminder ────────────────────────────────────────────
  console.log("\n📁 Storage bucket:");
  console.log("   ℹ️  Cannot create storage buckets via SQL.");
  console.log("   → Go to Supabase Dashboard → Storage → New bucket");
  console.log("   → Name: binro-assets  |  Public: ON");

  // ── 6. Realtime reminder ──────────────────────────────────────────────────
  console.log("\n📡 Realtime:");
  console.log("   ℹ️  Cannot enable realtime via SQL.");
  console.log("   → Go to Supabase Dashboard → Database → Replication");
  console.log("   → Toggle ON: qr_codes, qr_scans, qr_comments, user_favorites, creator_follows");

  await client.end();
  console.log("\n🎉 Migration complete!");
}

run().catch((err) => {
  console.error("❌ Migration failed:", err.message);
  process.exit(1);
});
