// ═══════════════════════════════════════════════════════════════════════════════
// AUTH ENTRY POINT — single import for all auth operations.
// ───────────────────────────────────────────────────────────────────────────────
// To switch your entire auth backend, edit ONE line here:
//   import { firebaseAuthProvider } from "./providers/firebase";
//   change to: import { supabaseAuthProvider } from "./providers/supabase";
//
// No other files need changing.
// ═══════════════════════════════════════════════════════════════════════════════

import { supabaseAuthProvider } from "./providers/supabase";

export const authAdapter = supabaseAuthProvider;
export type { AuthAdapter, AuthAdapterUser } from "./adapter";
export type { AuthUser } from "./types";
