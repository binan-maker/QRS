/**
 * @binro/db — Schema barrel
 *
 * Import order follows the FK dependency graph:
 *   enums → users → qr-codes → reports → platform → relations
 *
 * External consumers should import from "@binro/db" (which re-exports from here).
 * To import a specific domain's tables directly, use e.g.:
 *   import { users } from "@binro/db/schema/users"
 */

export * from "./enums";
export * from "./users";
export * from "./qr-codes";
export * from "./comments";
export * from "./scans";
export * from "./reports";
export * from "./platform";
export * from "./social";
export * from "./consumer";
export * from "./relations";
