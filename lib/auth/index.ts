// ═══════════════════════════════════════════════════════════════════════════════
import { firebaseAuthProvider } from "./providers/firebase";

export const authAdapter = firebaseAuthProvider;
export type { AuthAdapter, AuthAdapterUser } from "./adapter";
export type { AuthUser } from "./types";
