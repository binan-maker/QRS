/**
 * @binro/core — Shared domain models
 *
 * These are the canonical domain model types shared across mobile, web, and API.
 * They are framework-agnostic with zero runtime dependencies.
 *
 * Import from here — not from individual type files.
 *
 * @example
 *   import type { AppUser, Scan, Notification, UserSettings } from "@binro/core";
 */

// ── Primitive value types ──────────────────────────────────────────────────────
export * from "../types/qr";
export * from "../types/user";
export * from "../types/trust";

// ── Entity models (added during production-hardening) ─────────────────────────
export * from "../types/scan";
export * from "../types/notification";
export * from "../types/donation";
export * from "../types/consent";
export * from "../types/settings";
