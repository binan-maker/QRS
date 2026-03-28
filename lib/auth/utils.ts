import { db } from "@/lib/db";

export function getAuthErrorMessage(code: string): string {
  switch (code) {
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Incorrect email or password. Please try again.";
    case "auth/user-not-found":
      return "No account found with this email. Please sign up first.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/weak-password":
      return "Password must be at least 6 characters.";
    case "auth/too-many-requests":
      return "Too many failed attempts. Please wait a moment and try again.";
    case "auth/network-request-failed":
      return "Network error. Please check your internet connection and try again.";
    case "auth/user-disabled":
      return "This account has been disabled. Please contact support.";
    case "auth/requires-recent-login":
      return "For security, please sign out and sign back in before making this change.";
    case "auth/email-not-verified":
      return "Please verify your email address before signing in. Check your inbox for a verification link.";
    case "auth/operation-not-allowed":
      return "This sign-in method is not enabled. Please contact support.";
    case "auth/popup-closed-by-user":
    case "auth/cancelled-popup-request":
      return "Sign-in was cancelled. Please try again.";
    case "auth/account-exists-with-different-credential":
      return "An account already exists with this email using a different sign-in method.";
    case "ACCOUNT_DELETED":
      return "This account has been deleted.";
    default:
      return "Something went wrong. Please try again.";
  }
}

export function mapFirebaseError(e: any): Error {
  const code = e?.code ?? e?.message ?? "";
  return new Error(getAuthErrorMessage(code));
}

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
