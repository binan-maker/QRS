/**
 * Validated environment variables for apps/web.
 *
 * Extends the webEnvSchema from @binro/config with the full set of vars
 * the Next.js app actually needs.
 *
 * Usage:
 *   import { env, publicEnv } from "@/lib/env";
 *   console.log(env.SESSION_SECRET);          // server-only
 *   console.log(publicEnv.apiUrl);            // safe to use anywhere
 */

import { z } from "zod";

// ─── Server-only (never sent to browser) ─────────────────────────────────────

const serverSchema = z.object({
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  SESSION_SECRET: z.string().min(32).optional(),
  INTERNAL_API_URL: z.string().url().default("http://localhost:5000"),
  DATABASE_URL: z.string().url().optional(),
});

// ─── Public (safe to expose to browser) ──────────────────────────────────────

const publicSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().default("http://localhost:5000"),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_DATABASE_URL: z.string().optional(),
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
  firebase: {
    apiKey:            parsed.public.NEXT_PUBLIC_FIREBASE_API_KEY ?? "",
    authDomain:        parsed.public.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN ?? "",
    projectId:         parsed.public.NEXT_PUBLIC_FIREBASE_PROJECT_ID ?? "",
    storageBucket:     parsed.public.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET ?? "",
    messagingSenderId: parsed.public.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? "",
    appId:             parsed.public.NEXT_PUBLIC_FIREBASE_APP_ID ?? "",
    databaseURL:       parsed.public.NEXT_PUBLIC_FIREBASE_DATABASE_URL ?? "",
  },
  google: {
    clientId: parsed.public.NEXT_PUBLIC_GOOGLE_CLIENT_ID ?? "",
  },
} as const;
