/**
 * @binro/core — Shared domain package
 *
 * Zero runtime dependencies. Safe to import in mobile, web, and API.
 *
 * Exports:
 *   models/         Canonical entity types — import domain types from here.
 *   value-objects/  Typed, validated domain values (QrSlug, UpiId, TrustLevel…)
 *   errors/         Domain error hierarchy
 *   constants/      Business constants (tiers, limits, content types)
 *
 * NOTE: types/ is intentionally NOT re-exported from here.  All types/
 * files are already re-exported by models/index.ts, which is the single
 * canonical barrel.  Importing directly from types/ sub-files is an
 * implementation detail — consume via "@binro/core" only.
 */

export * from "./models";
export * from "./value-objects";
export * from "./errors";
export * from "./constants";
