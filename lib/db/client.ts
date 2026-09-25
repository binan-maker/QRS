// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE CLIENT — re-exports the active Supabase DB + Realtime adapters.
//
// All reads/writes go through the adapter interface (DbAdapter / RealtimeAdapter)
// so switching providers in the future only requires changing this file.
// ═══════════════════════════════════════════════════════════════════════════════

export { supabaseDb as db, supabaseRtdb as rtdb } from "./providers/supabase";
export type { DbAdapter, RealtimeAdapter } from "./adapter";
