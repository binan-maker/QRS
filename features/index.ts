// ═══════════════════════════════════════════════════════════════════════════════
// FEATURES: MASTER BARREL EXPORT
// ───────────────────────────────────────────────────────────────────────────────
// Centralized export of all feature screens, hooks, subcomponents, and feature state.
// Cleanly segmented by domain so developers can quickly compose navigation
// and UI views.
// ═══════════════════════════════════════════════════════════════════════════════

// ── 1. Authentication ─────────────────────────────────────────────────────────
export * from "./auth";

// ── 2. Home & Discovery ───────────────────────────────────────────────────────
export * from "./home";

// ── 3. Scanner & Camera ───────────────────────────────────────────────────────
export * from "./scanner";

// ── 4. QR Details & Verification ──────────────────────────────────────────────
export * from "./qr-detail";

// ── 5. History & Search ───────────────────────────────────────────────────────
export * from "./history";
export * from "./search";
export * from "./favorites";

// ── 6. Profile & Account ──────────────────────────────────────────────────────
export * from "./profile";
export * from "./account";

// ── 7. Settings & Preferences ─────────────────────────────────────────────────
export * from "./settings";

// ── 8. Legal & Help ───────────────────────────────────────────────────────────
export * from "./legal";
