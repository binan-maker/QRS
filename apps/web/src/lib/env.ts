/**
 * Validated environment variables for apps/web.
 *
 * Replaces Firebase config with Supabase config.
 *
 * Usage:
 *   import { env, publicEnv } from "@/lib/env";
 *   console.log(env.SESSION_SECRET);              // server-only
 *   console.log(publicEnv.supabase.url);          // safe to use anywhere
 */

import { z } from "zod";

// ─── Server-only (never sent to browser) ─────────────────────────────────────

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  SESSION_SECRET: z.string().min(32).optional(),
  INTERNAL_API_URL: z.string().url().default("http://localhost:5000"),
  DATABASE_URL: z.string().url().optional(),
  // Supabase admin — server-only, never expose to browser
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
});

// ─── Public (safe to expose to browser) ──────────────────────────────────────

const publicSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:5000"),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  NEXT_PUBLIC_GOOGLE_CLIENT_ID: z.string().optional(),
});

// ─── Parse ────────────────────────────────────────────────────────────────────

function parseEnv() {
  const serverResult = serverSchema.safeParse(process.env);
  const publicResult = publicSchema.safeParse(process.env);

  if (!serverResult.success || !publicResult.success) {
    const serverErrors = serverResult.success ? [] : serverResult.error.issues;
    const publicErrors = publicResult.success ? [] : publicResult.error.issues;
    const all = [...serverErrors, ...publicErrors];
    console.error(
      "[env] Environment validation warnings:\n" +
      all.map((i) => `  • ${i.path.join(".")}: ${i.message}`).join("\n"),
    );
  }

  return {
    server: serverResult.success ? serverResult.data : ({} as z.infer<typeof serverSchema>),
    public: publicResult.success ? publicResult.data : ({} as z.infer<typeof publicSchema>),
  };
}

const parsed = parseEnv();

/** Server-only environment — do NOT import into client components or pass to props. */
export const env = parsed.server;

/** Browser-safe public config, derived from NEXT_PUBLIC_* vars. */
export const publicEnv = {
  apiUrl: parsed.public.NEXT_PUBLIC_API_URL,
  supabase: {
    url:     parsed.public.NEXT_PUBLIC_SUPABASE_URL ?? "",
    anonKey: parsed.public.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "",
  },
  google: {
    clientId: parsed.public.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
  },
} as const;
