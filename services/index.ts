// ═══════════════════════════════════════════════════════════════════════════════
// SERVICES: MASTER BARREL EXPORT
// ───────────────────────────────────────────────────────────────────────────────
// This file serves as the unified entry point for all business logic,
// fraud detection, trust scoring, caching, data services, and offline sync.
//
// Organized by domain with clear sections so any engineer can immediately find
// and reuse services without hunting through subdirectories.
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. Common Types & Base Utilities ──────────────────────────────────────────
export * from "./types";
export * from "./utils";

// ── 2. QR Analysis & Safety Verification ──────────────────────────────────────
export * from "./analysis";

// ── 3. Trust Scoring & Community Verifications ────────────────────────────────
export * from "./trust";

// ── 4. QR Code Management & Details ───────────────────────────────────────────
export * from "./qr";
export * from "./qr-display";
export * from "./qr-content-type";

// ── 5. Scan History & Scan Event Logging ──────────────────────────────────────
export * from "./scan-history";

// ── 6. User Profiles, Settings & Favorites ────────────────────────────────────
export * from "./user";

// ── 7. Comments, Feedback & Community Discussions ─────────────────────────────
export * from "./comments";

// ── 8. Content Moderation & Abuse Reporting ───────────────────────────────────
export * from "./moderation";

// ── 9. Cache Prewarming & Local Storage ────────────────────────────────────────
export * from "./cache";
export * from "./storage";

// ── 10. Notifications & Alerts ────────────────────────────────────────────────
export * from "./notifications";

// ── 11. Offline Sync & Network Resilience ─────────────────────────────────────
export * from "./offline";

// ── 12. Community Feature Voting ──────────────────────────────────────────────
export * from "./votes";

// ── 13. Audit & Compliance ───────────────────────────────────────────────────
export * from "./audit";
