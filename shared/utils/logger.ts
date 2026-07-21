/**
 * Production-safe logger — thin re-export of the canonical logger in lib/logger.
 *
 * Prefer importing from `@/lib/logger` directly for new code.
 * This file exists as a compatibility shim for older imports that use
 * `@/shared/utils/logger`.
 *
 * Usage (existing callers — unchanged):
 *   import { logger } from '@/shared/utils/logger';
 *   logger.warn('[db] retry attempt 2/3:', err);
 *
 * Usage (new code — preferred):
 *   import { createLogger } from '@/lib/logger';
 *   const log = createLogger('my-service');
 *   log.warn('retry attempt 2/3', err);
 */

export { logger, createLogger } from "@/lib/logger";
export type { Logger, LogLevel } from "@/lib/logger";
