// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE ENTRY POINT — single import for all file-storage operations.
// ───────────────────────────────────────────────────────────────────────────────
// All storage consumers use this adapter so the provider is isolated here.
// ═══════════════════════════════════════════════════════════════════════════════

import { supabaseStorageProvider } from "./providers/supabase";

export const storageAdapter = supabaseStorageProvider;
export type { StorageAdapter } from "./adapter";
