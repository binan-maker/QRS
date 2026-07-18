/**
 * @binro/core — Shared domain package
 *
 * Zero runtime dependencies. Safe to import in mobile, web, and API.
 *
 * Exports:
 *   models/         Shared entity types
 *   types/          Raw TypeScript interfaces (legacy — prefer models/)
 *   value-objects/  Typed, validated domain values (QrSlug, UpiId, TrustLevel…)
 *   errors/         Domain error hierarchy
 *   constants/      Business constants (tiers, limits, content types)
 */

export * from "./types";
export * from "./models";
export * from "./value-objects";
export * from "./errors";
export * from "./constants";
