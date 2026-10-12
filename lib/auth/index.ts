import { supabaseAuthProvider, getCurrentToken } from "./providers/supabase";

export const authAdapter = supabaseAuthProvider;
export { getCurrentToken };
export type { AuthAdapter, AuthAdapterUser } from "./adapter";
export type { AuthUser } from "./types";
