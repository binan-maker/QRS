// ═══════════════════════════════════════════════════════════════════════════════
// SHARED COMPONENTS — Root Barrel
// ───────────────────────────────────────────────────────────────────────────────
// Central access point for:
// - ui/           Shared generic UI components (buttons, headers, modals, toasts)
// - feedback/     Error boundaries and error fallback views
// - consent/      DPDP/privacy consent screens and option toggles
// - notifications/ Notifications modal and alerts
// ═══════════════════════════════════════════════════════════════════════════════

export * from "./ui";
export { ErrorBoundary } from "./feedback/ErrorBoundary";
export { ScreenErrorBoundary } from "./feedback/ScreenErrorBoundary";
export { default as ConsentModal } from "./consent/ConsentModal";
export { default as ConsentManager } from "./consent/ConsentManager";
export { NotificationsModal } from "./notifications/NotificationsModal";
