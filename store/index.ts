// ═══════════════════════════════════════════════════════════════════════════════
// GLOBAL STORES (BARREL EXPORT)
// ───────────────────────────────────────────────────────────────────────────────
// Zustand stores for global state management:
// - authStore: Mirrors active authentication state & provides fine-grained selectors
// - notificationStore: Manages unread notification counter & badges
// - uiStore: Controls global loading indicators, modals, and toasts
// ═══════════════════════════════════════════════════════════════════════════════

export * from "./authStore";
export * from "./notificationStore";
export * from "./uiStore";
