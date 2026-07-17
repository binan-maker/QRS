// ─── Re-export shim ───────────────────────────────────────────────────────────
// Source of truth has moved to packages/db/src/schema.ts
// All existing imports of "@shared/schema" or "@/shared/schema" continue to
// work through this shim — no changes needed in consuming files.
// ─────────────────────────────────────────────────────────────────────────────
export * from "../packages/db/src/schema";
