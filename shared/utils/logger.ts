/**
 * Production-safe logger.
 *
 * Rules:
 *  - `log`   → suppressed in production builds (debug/operational only)
 *  - `warn`  → always emitted (service degradation, retries, non-fatal issues)
 *  - `error` → always emitted (failures requiring attention)
 *  - `debug` → suppressed in production builds
 *
 * Usage:
 *   import { logger } from '@/shared/utils/logger';
 *   logger.warn('[db] retry attempt 2/3:', err);
 */

const isProd = typeof __DEV__ !== "undefined" ? !__DEV__ : process.env.NODE_ENV === "production";

/* eslint-disable no-console */
export const logger = {
  /** Operational info — suppressed in production. */
  log: (...args: unknown[]): void => {
    if (!isProd) console.log(...args);
  },
  /** Non-fatal warning — always visible. */
  warn: (...args: unknown[]): void => console.warn(...args),
  /** Error — always visible. */
  error: (...args: unknown[]): void => console.error(...args),
  /** Debug trace — suppressed in production. */
  debug: (...args: unknown[]): void => {
    if (!isProd) console.debug(...args);
  },
};
/* eslint-enable no-console */
