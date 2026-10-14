import { supabaseAuthProvider, getCurrentToken } from "./providers/supabase";

export const authAdapter = supabaseAuthProvider;
export { getCurrentToken };

// Types
export type { AuthAdapter, AuthAdapterUser } from "./adapter";
export type { AuthUser } from "./types";
export type { SyncedUserProfile } from "./user-sync";

// Utilities & Validation
export {
  buildAuthUser,
  getAuthErrorMessage,
  mapAuthError,
  generateUniqueUsername,
  serverValidateEmail,
} from "./utils";

// Session Cache & User Sync
export { syncUserToDb } from "./user-sync";
export {
  cacheAuthUser,
  clearCachedAuthUser,
  getCachedAuthUser,
} from "./session-cache";

// Headless Hooks
export { useAuthSession } from "./hooks/useAuthSession";
export { useGoogleAuth } from "./hooks/useGoogleAuth";
export { useAuthActions } from "./hooks/useAuthActions";
