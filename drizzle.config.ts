// ─── Root drizzle.config.ts ───────────────────────────────────────────────────
// This file delegates to packages/db/drizzle.config.ts.
// Run migrations from the root: npm run db:push
// ─────────────────────────────────────────────────────────────────────────────
import { defineConfig } from "drizzle-kit";

// DATABASE_URL is reserved by Replit's managed Postgres.
// For Supabase, use SUPABASE_DATABASE_URL (Settings → Database → Connection string → URI mode).
let dbUrl = process.env.SUPABASE_DATABASE_URL ?? process.env.DATABASE_URL ?? "";

if (!dbUrl) {
  console.warn(
    "⚠️  SUPABASE_DATABASE_URL is not set. Add it to Replit Secrets before running drizzle-kit commands.\n" +
    "    Find it in your Supabase dashboard → Settings → Database → Connection string (URI mode).\n" +
    "    Use the 'Session' mode connection string (port 5432).",
  );
} else {
  // Supabase requires SSL. Append sslmode=require if not already present.
  if (!dbUrl.includes("sslmode") && !dbUrl.includes("ssl=")) {
    dbUrl += (dbUrl.includes("?") ? "&" : "?") + "sslmode=require";
  }
}

export default defineConfig({
  out: "./packages/db/migrations",
  schema: "./packages/db/src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl,
  },
});
