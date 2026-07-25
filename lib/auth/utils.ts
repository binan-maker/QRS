import { db } from "@/lib/db";

export function getAuthErrorMessage(code: string): string {
  switch (code) {
    // ── Legacy Firebase-style codes ──────────────────────────────────────────
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
    case "over_sms_send_rate_limit":
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
    case "phone_provider_disabled":
    case "anonymous_provider_disabled":
    case "oauth_provider_not_supported":
      return "This sign-in method is not enabled. Please contact support.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled. Please try again.";
    case "auth/account-exists-with-different-credential":
    case "identity_already_exists":
    case "email_conflict_identity_not_deletable":
      return "An account already exists with this email using a different sign-in method.";
    case "auth/credential-already-in-use":
      return "This credential is already linked to another account.";
    case "auth/expired-action-code":
    case "otp_expired":
      return "This link has expired. Please request a new one.";
    case "auth/invalid-action-code":
      return "This link is invalid or has already been used.";
    case "auth/missing-email":
      return "Please enter your email address.";
    case "auth/quota-exceeded":
      return "Service is temporarily unavailable. Please try again later.";
    case "auth/session-cookie-expired":
    case "session_expired":
    case "refresh_token_not_found":
    case "refresh_token_already_used":
      return "Your session has expired. Please sign in again.";
    // ── Supabase OAuth / Google sign-in ──────────────────────────────────────
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
    // ── App-specific ─────────────────────────────────────────────────────────
    case "ACCOUNT_DELETED":
      return "This account has been deleted.";
    default:
      return "Something went wrong. Please try again.";
  }
}

/** Map an auth error (Supabase, Google Sign-In, etc.) to a user-friendly error. */
export function mapAuthError(e: any): Error & { code?: string } {
  const code = e?.code ?? "";
  const knownMessage = getAuthErrorMessage(code);
  // If we got a known mapped message, use it. Otherwise fall back to the
  // original error message so Supabase/SDK errors aren't silently swallowed
  // as a generic "Something went wrong."
  const isMapped = knownMessage !== "Something went wrong. Please try again.";
  const message = isMapped
    ? knownMessage
    : (e?.message || "Something went wrong. Please try again.");
  const err = new Error(message) as Error & { code?: string };
  err.code = code || e?.message;
  return err;
}

/** @deprecated Use mapAuthError instead. */
export const mapFirebaseError = mapAuthError;

export async function generateUniqueUsername(displayName: string): Promise<string> {
  const base = displayName
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "")
    .slice(0, 12) || "user";
  for (let attempt = 0; attempt < 15; attempt++) {
    let candidate: string;
    if (attempt === 0 && base.length >= 3) {
      candidate = base;
    } else if (attempt < 5) {
      candidate = base.slice(0, 10) + Math.floor(100 + Math.random() * 900);
    } else {
      candidate = base.slice(0, 8) + Math.floor(10000 + Math.random() * 90000);
    }
    try {
      const data = await db.get(["usernames", candidate]);
      if (!data) return candidate;
    } catch {
      // If we can't check, skip this candidate and try the next
    }
  }
  // Final fallback: timestamp + random suffix — virtually guaranteed unique
  return "user" + Date.now().toString().slice(-6) + Math.floor(10 + Math.random() * 90);
}
