// ─── Service barrel ───────────────────────────────────────────────────────────
// Re-exports every service function so that `import { getUserProfile } from
// "@/lib/db"` works as a single convenience import.
//
// NOTE: This file does NOT export database primitives. All data access uses the
// Firebase provider via the DbAdapter / RealtimeAdapter interfaces in:
//   lib/db/providers/firebase.ts
//
// Circular-import note: services/ import from lib/db/client, and lib/db/index
// lazy-requires this file. The lazy require() in lib/db/index.ts is what
// breaks the ESM circular-import chain — do not convert to a static import.
// ─────────────────────────────────────────────────────────────────────────────

export * from "@/services/types";
export * from "@/services/utils";
export * from "@/services/trust/trust-service";
export * from "@/services/qr/qr-service";
export * from "@/services/qr/qr-detail-service";
export * from "@/services/scan-history";
export * from "@/services/user";
export * from "@/services/moderation/report-service";
export * from "@/services/social/follow-service";
export * from "@/services/comments";
export * from "@/services/generator";
export * from "@/services/notifications/notification-service";
export * from "@/services/guard/guard-service";
export * from "@/services/messaging/message-service";
