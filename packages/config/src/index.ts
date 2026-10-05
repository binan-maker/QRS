// ─── @binro/config ────────────────────────────────────────────────────────────
// Zod-validated environment schemas for mobile, API, and web targets.
// Usage:
//   import { validateEnv, apiEnvSchema } from "@binro/config";
//   export const env = validateEnv(apiEnvSchema);
// ─────────────────────────────────────────────────────────────────────────────

export {
  mobileEnvSchema,
  apiEnvSchema,
  webEnvSchema,
  validateEnv,
} from "./env";

export type { MobileEnv, ApiEnv, WebEnv } from "./env";
