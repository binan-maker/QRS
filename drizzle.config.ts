// ─── Root drizzle.config.ts ───────────────────────────────────────────────────
// This file delegates to packages/db/drizzle.config.ts.
// Run migrations from the root: npm run db:push
// ─────────────────────────────────────────────────────────────────────────────
import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  // Soft warning — this file is loaded by drizzle-kit CLI only,
  // never at server startup. The throw has been removed so that
  // TypeScript compilation and server boot are not affected.
  console.warn(
    "⚠️  DATABASE_URL is not set. Provide it before running drizzle-kit commands.",
  );
}

export default defineConfig({
  out: "./packages/db/migrations",
  schema: "./packages/db/src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl ?? "",
  },
});
