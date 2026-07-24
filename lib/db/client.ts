// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE CLIENT — re-exports the active Supabase DB + Realtime adapters.
// ───────────────────────────────────────────────────────────────────────────────
// Previously this file conditionally loaded Firebase or firebase-admin based on
// the runtime environment. Now that the app is fully on Supabase, this is a
// simple re-export of the Supabase provider.
//
// All reads/writes go through the adapter interface (DbAdapter / RealtimeAdapter)
// so switching providers in the future only requires changing this file.
// ═══════════════════════════════════════════════════════════════════════════════

export { supabaseDb as db, supabaseRtdb as rtdb } from "./providers/supabase";
export type { DbAdapter, RealtimeAdapter } from "./adapter";
