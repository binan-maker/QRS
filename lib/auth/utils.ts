import type { AuthUser } from "./types";
import { generateUniqueUsername } from "@/services/user/username";
import { validateEmail } from "@shared/utils/email-validator";

// Re-export generateUniqueUsername so any legacy imports remain satisfied without duplication
export { generateUniqueUsername };

export async function serverValidateEmail(
  email: string,
): Promise<{ valid: boolean; error?: string }> {
  const result = validateEmail(email);
  return { valid: result.valid, error: result.reason };
}

export function getAuthErrorMessage(code: string): string {
  switch (code) {
    // ── Supabase & Standard Auth Credentials ──────────────────────────────────
    case "auth/wrong-password":
    case "auth/invalid-credential":
    case "invalid_credentials":
      return "Incorrect email or password. Please try again.";
    case "auth/user-not-found":
    case "user_not_found":
      return "No account found with this email. Please sign up first.";
    case "auth/invalid-email":
    case "email_address_invalid":
      return "Please enter a valid email address.";
    case "auth/email-already-in-use":
    case "email_exists":
    case "user_already_exists":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/weak-password":
    case "weak_password":
      return "Password must be at least 8 characters and include a number.";
    case "auth/too-many-requests":
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "Too many attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
    case "request_timeout":
      return "Network error. Please check your internet connection and try again.";
    case "auth/user-disabled":
    case "user_banned":
      return "This account has been disabled. Please contact support.";
    case "auth/requires-recent-login":
    case "reauthentication_needed":
      return "For security, please sign out and sign back in before making this change.";
    case "auth/email-not-verified":
    case "email_not_confirmed":
    case "provider_email_needs_verification":
      return "Please verify your email address before signing in. Check your inbox for a verification link.";
    case "auth/operation-not-allowed":
    case "provider_disabled":
    case "email_provider_disabled":
    case "oauth_provider_not_supported":
      return "This sign-in method is not enabled. Please contact support.";
    case "auth/account-exists-with-different-credential":
    case "identity_already_exists":
    case "email_conflict_identity_not_deletable":
      return "An account already exists with this email using a different sign-in method.";
    case "auth/expired-action-code":
    case "otp_expired":
      return "This link has expired. Please request a new one.";
    case "auth/invalid-action-code":
      return "This link is invalid or has already been used.";
    case "auth/missing-email":
      return "Please enter your email address.";
    case "auth/session-cookie-expired":
    case "session_expired":
    case "refresh_token_not_found":
    case "refresh_token_already_used":
      return "Your session has expired. Please sign in again.";

    // ── Google OAuth & Identity Provider ──────────────────────────────────────
    case "bad_oauth_state":
    case "bad_oauth_callback":
      return "Google sign-in could not be completed. Please try again.";
    case "bad_jwt":
    case "no_authorization":
      return "Authentication failed. Please sign in again.";
    case "signup_disabled":
      return "New sign-ups are not allowed at this time.";
    case "captcha_failed":
      return "Captcha check failed. Please try again.";
    case "unexpected_failure":
      return "An unexpected error occurred. Please try again.";

    // ── App-specific Status Codes ─────────────────────────────────────────────
    case "ACCOUNT_DELETED":
      return "This account has been deleted.";
    default:
      return "Something went wrong. Please try again.";
  }
}

/** Map an auth error from Supabase or Google Sign-In to a user-friendly error. */
export function mapAuthError(e: any): Error & { code?: string } {
  const code = e?.code ?? "";
  const knownMessage = getAuthErrorMessage(code);
  const isMapped = knownMessage !== "Something went wrong. Please try again.";
  const message = isMapped
    ? knownMessage
    : (e?.message || "Something went wrong. Please try again.");
  const err = new Error(message) as Error & { code?: string };
  err.code = code || e?.message;
  return err;
}

/**
 * Builds the canonical AuthUser representation from adapter user details
 * and optional synced/cached profile data. Avoids duplicate fallback resolution.
 */
export function buildAuthUser(
  adapterUser: {
    uid: string;
    email?: string | null;
    displayName?: string | null;
    photoURL?: string | null;
    emailVerified?: boolean;
  },
  syncedProfile?: {
    displayName?: string | null;
    photoURL?: string | null;
    username?: string | null;
  } | null,
  cachedProfile?: {
    displayName?: string | null;
    photoURL?: string | null;
    avatarUrl?: string | null;
    username?: string | null;
  } | null,
): AuthUser {
  return {
    id: adapterUser.uid,
    email: adapterUser.email ?? "",
    displayName:
      syncedProfile?.displayName ||
      cachedProfile?.displayName ||
      adapterUser.displayName ||
      adapterUser.email?.split("@")[0] ||
      "User",
    photoURL:
      syncedProfile?.photoURL !== undefined
        ? syncedProfile.photoURL
        : (cachedProfile?.photoURL ?? cachedProfile?.avatarUrl ?? adapterUser.photoURL ?? null),
    emailVerified: adapterUser.emailVerified ?? false,
    username: syncedProfile?.username || cachedProfile?.username || undefined,
  };
}
