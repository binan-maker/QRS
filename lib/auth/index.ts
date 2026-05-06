// ═══════════════════════════════════════════════════════════════════════════════
// AUTH ENTRY POINT — single import for all auth operations.
// ───────────────────────────────────────────────────────────────────────────────
// To switch your entire auth backend, edit ONE line here:
//   import { firebaseAuthProvider } from "./providers/firebase";
//   change to: import { supabaseAuthProvider } from "./providers/supabase";
//
// No other files need changing.
// ═══════════════════════════════════════════════════════════════════════════════

import { firebaseAuthProvider } from "./providers/firebase";

export const authAdapter = firebaseAuthProvider;
export type { AuthAdapter, AuthAdapterUser } from "./adapter";
