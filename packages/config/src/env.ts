import { z } from "zod";

// ─── Mobile (Expo) environment ────────────────────────────────────────────────
// All EXPO_PUBLIC_* vars are bundled into the JS bundle at build time.
// Never put secrets here — they are visible to end users.

export const mobileEnvSchema = z.object({
  // Firebase
  EXPO_PUBLIC_FIREBASE_API_KEY: z.string().min(1),
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: z.string().min(1),
  EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET: z.string().min(1),
  EXPO_PUBLIC_FIREBASE_DATABASE_URL: z.string().url(),
  EXPO_PUBLIC_FIREBASE_APP_ID: z.string().min(1),
  EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID: z.string().min(1),

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

  // Database — optional until Phase 2 PostgreSQL migration
  DATABASE_URL: z.string().url().optional(),

  // Auth / security
  SESSION_SECRET: z.string().min(32).optional(),
  THREATS_SIGNING_KEY: z.string().optional(),

  // External APIs
  GOOGLE_SAFE_BROWSING_API_KEY: z.string().optional(),
  OPENAI_API_KEY: z.string().optional(),
  RAZORPAY_KEY_ID: z.string().optional(),
  RAZORPAY_KEY_SECRET: z.string().optional(),

  // Firebase (server-side — Admin SDK uses service account, not these keys)
  EXPO_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
  EXPO_PUBLIC_FIREBASE_API_KEY: z.string().optional(),

  // Firebase Admin SDK — optional; enables QR analytics, report toggling, push.
  // Set FIREBASE_SERVICE_ACCOUNT_JSON to a stringified service-account JSON object.
  FIREBASE_SERVICE_ACCOUNT_JSON: z.string().optional(),
  FIREBASE_DATABASE_URL: z.string().url().optional(),
});

// ─── Web (Next.js) environment ────────────────────────────────────────────────
// Populated in Phase 4 when apps/web is bootstrapped.

export const webEnvSchema = z.object({
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_FIREBASE_API_KEY: z.string().optional(),
  NEXT_PUBLIC_FIREBASE_PROJECT_ID: z.string().optional(),
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
