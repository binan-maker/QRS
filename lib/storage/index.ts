// ═══════════════════════════════════════════════════════════════════════════════
// STORAGE ENTRY POINT — single import for all file-storage operations.
// ───────────────────────────────────────────────────────────────────────────────
// To switch your entire storage backend, edit ONE line here:
//   import { firebaseStorageProvider } from "./providers/firebase";
//   change to: import { s3StorageProvider } from "./providers/s3";
//
// No other files need changing.
// ═══════════════════════════════════════════════════════════════════════════════

import { firebaseStorageProvider } from "./providers/firebase";

export const storageAdapter = firebaseStorageProvider;
export type { StorageAdapter } from "./adapter";
