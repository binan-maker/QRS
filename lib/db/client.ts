// ═══════════════════════════════════════════════════════════════════════════════
// DATABASE CLIENT — re-exports the active Firebase DB + Realtime adapters.
//
// All reads/writes go through the adapter interface (DbAdapter / RealtimeAdapter)
// so switching providers in the future only requires changing this file.
// ═══════════════════════════════════════════════════════════════════════════════

export { firebaseDb as db, firebaseRtdb as rtdb } from "./providers/firebase";
export type { DbAdapter, RealtimeAdapter } from "./adapter";
