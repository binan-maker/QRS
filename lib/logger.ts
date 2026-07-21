// ═══════════════════════════════════════════════════════════════════════════════
// CENTRALIZED LOGGER — replaces scattered console.log calls.
// ───────────────────────────────────────────────────────────────────────────────
// Usage:
//   import { createLogger } from "@/lib/logger";
//   const log = createLogger("user-service");
//   log.debug("Profile loaded", { userId });
//   log.error("Upload failed", error);
//
// Levels:
//   debug — verbose tracing, dev-only
//   info  — significant events, dev-only
//   warn  — recoverable issues, always emitted
//   error — failures, always emitted (+ future Crashlytics hook)
//
// In production (IS_DEV = false), debug and info are suppressed.
// To route errors to Crashlytics/Sentry, uncomment the TODO blocks below.
// ═══════════════════════════════════════════════════════════════════════════════

export type LogLevel = "debug" | "info" | "warn" | "error";

// `__DEV__` is a Metro/RN global; fall back to NODE_ENV for Jest/Node contexts.
const IS_DEV: boolean =
  typeof __DEV__ !== "undefined"
    ? Boolean(__DEV__)
    : process.env.NODE_ENV !== "production";

function emit(
  level: LogLevel,
  tag: string,
  message: string,
  data?: unknown
): void {
  // Suppress verbose levels in production builds.
  if (!IS_DEV && (level === "debug" || level === "info")) return;

  const prefix = `[${tag}]`;
  const extras = data !== undefined ? [data] : [];

  switch (level) {
    case "debug":
      // eslint-disable-next-line no-console
      console.debug(prefix, message, ...extras);
      break;
    case "info":
      // eslint-disable-next-line no-console
      console.info(prefix, message, ...extras);
      break;
    case "warn":
      // eslint-disable-next-line no-console
      console.warn(prefix, message, ...extras);
      break;
    case "error":
      // eslint-disable-next-line no-console
      console.error(prefix, message, ...extras);
      // TODO: Forward to Crashlytics / Sentry in production:
      // if (!IS_DEV && data instanceof Error) {
      //   crashlytics().recordError(data);
      // }
      break;
  }
}

export interface Logger {
  debug(message: string, data?: unknown): void;
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
  /** Create a child logger with a sub-tag: `[parent:child]`. */
  child(subtag: string): Logger;
}

/**
 * Create a logger scoped to a specific module or service.
 *
 * @example
 *   const log = createLogger("scan-service");
 *   log.info("Scan recorded", { scanId });
 */
export function createLogger(tag: string): Logger {
  return {
    debug: (msg, data) => emit("debug", tag, msg, data),
    info:  (msg, data) => emit("info",  tag, msg, data),
    warn:  (msg, data) => emit("warn",  tag, msg, data),
    error: (msg, data) => emit("error", tag, msg, data),
    child: (subtag) => createLogger(`${tag}:${subtag}`),
  };
}

/** App-wide root logger. Prefer `createLogger("my-tag")` for scoped logging. */
export const logger = createLogger("app");
