import { defineConfig } from "drizzle-kit";

const dbUrl = process.env.DATABASE_URL;

if (!dbUrl) {
  // Soft warning — the config file is loaded by drizzle-kit CLI only,
  // never at server startup. Provide DATABASE_URL before running migrations.
  console.warn(
    "⚠️  DATABASE_URL is not set. Set it before running drizzle-kit commands.",
  );
}

export default defineConfig({
  out: "./migrations",
  schema: "./src/schema.ts",
  dialect: "postgresql",
  dbCredentials: {
    url: dbUrl ?? "",
  },
});
