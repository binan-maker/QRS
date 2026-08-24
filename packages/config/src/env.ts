import { z } from "zod";

// ─── Mobile (Expo) environment ────────────────────────────────────────────────
// All EXPO_PUBLIC_* vars are bundled into the JS bundle at build time.
// Never put secrets here — they are visible to end users.

export const mobileEnvSchema = z.object({
  // Firebase client configuration (public — safe to bundle)
  EXPO_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().min(1),
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),
  EXPO_PUBLIC_FIREBASE_APP_ID: z.string().min(1),

  // Google Sign-In
  EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID: z.string().optional(),
  EXPO_PUBLIC_ANDROID_CLIENT_ID: z.string().optional(),
  EXPO_PUBLIC_IOS_CLIENT_ID: z.string().optional(),

  // Runtime
  EXPO_PUBLIC_DOMAIN: z.string().optional(),
});

// ─── API (Node.js / Express) environment ──────────────────────────────────────

export const apiEnvSchema = z.object({
  PORT: z.coerce.number().int().min(1).max(65535).default(5000),
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),

  // Firebase Admin service account JSON (server-only)
  FIREBASE_SERVICE_ACCOUNT: z.string().optional(),

  // Auth / security
  SESSION_SECRET: z.string().min(32).optional(),
  THREATS_SIGNING_KEY: z.string().optional(),


  // External APIs
  GOOGLE_SAFE_BROWSING_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
});

// ─── Web (Next.js) environment ────────────────────────────────────────────────

export const webEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_APP_ID: z.string().optional(),
  DATABASE_URL: z.string().url().optional(),
  SESSION_SECRET: z.string().min(32).optional(),
});

// ─── Inferred types ───────────────────────────────────────────────────────────

export type MobileEnv = z.infer<typeof mobileEnvSchema>;
export type ApiEnv = z.infer<typeof apiEnvSchema>;
export type WebEnv = z.infer<typeof webEnvSchema>;

// ─── Validation helper ────────────────────────────────────────────────────────

/**
 * Parses and validates environment variables against a given schema.
 * Throws a descriptive error at startup if required vars are missing.
 *
 * @example
 * import { validateEnv, apiEnvSchema } from "@binro/config";
 * export const env = validateEnv(apiEnvSchema);
 */
export function validateEnv<T extends z.ZodTypeAny>(
  schema: T,
  source: Record<string, string | undefined> = process.env,
): z.infer<T> {
  const result = schema.safeParse(source);
  if (!result.success) {
    const messages = result.error.issues
      .map((i) => `  • ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Environment validation failed:\n${messages}`);
  }
  return result.data;
}
