import { supabaseAuthProvider } from "./providers/supabase";

export const authAdapter = supabaseAuthProvider;
export type { AuthAdapter, AuthAdapterUser } from "./adapter";
export type { AuthUser } from "./types";
