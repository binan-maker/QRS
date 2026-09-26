// ═══════════════════════════════════════════════════════════════════════════════
// SHARED MODULE — Root Barrel Export
// ───────────────────────────────────────────────────────────────────────────────
// Single, centralized point of access for all cross-cutting domain primitives:
//
// 1. components/  UI elements, modals, toasts, skeletons, error boundaries
// 2. constants/   Colors, typography, limits, collections, layouts
// 3. contexts/    Auth, Theme, Avatar, TabBar scroll state
// 4. hooks/       Lifecycle, responsive, network, scrolling hooks
// 5. types/       Domain-wide types and entity definitions
// 6. utils/       Formatting, parsing, security analysis, haptics
// ═══════════════════════════════════════════════════════════════════════════════

export * from "./components";
export * from "./constants";
export * from "./contexts";
export * from "./hooks";
export * from "./types";
export * from "./utils";
