// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE ENTRY POINT — single import for all file-storage operations.
// ───────────────────────────────────────────────────────────────────────────────
// All storage consumers use this adapter so the provider is isolated here.
// ═══════════════════════════════════════════════════════════════════════════════

import { firebaseStorageProvider } from "./providers/firebase";

export const storageAdapter = firebaseStorageProvider;
export type { StorageAdapter } from "./adapter";
