// ─── Compatibility barrel ─────────────────────────────────────────────────────
// Provides a stable `@/lib/firestore-service` import path for consumers that
// existed before the service layer was reorganised under services/.
// All service implementations live in services/ — nothing here.
// ─────────────────────────────────────────────────────────────────────────────

export * from "@/services/index";
