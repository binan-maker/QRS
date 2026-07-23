// ── Server-side email validation ──────────────────────────────────────────────
// Validates an email address via the BinRo API before signup.
// Falls back to local validation on any network error or non-200 response,
// so signup is never blocked by backend unavailability.

import { validateEmail } from "@/validators";
import { API_BASE_URL } from "@/config/api";
import { RTDB_TIMEOUT_MS } from "@/config/app";

export async function serverValidateEmail(
  email: string,
): Promise<{ valid: boolean; error?: string }> {
  try {
    const res = await fetch(`${API_BASE_URL}/api/validate-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
      signal: AbortSignal.timeout(RTDB_TIMEOUT_MS),
    });
    // Only treat the server verdict as authoritative on an explicit HTTP 200.
    // Any 4xx / 5xx / proxy 502 falls back to local validation.
    if (res.status === 200) {
      const json = (await res.json()) as { valid: boolean; reason?: string };
      return { valid: json.valid, error: json.reason };
    }
    return validateEmail(email);
  } catch {
    return validateEmail(email);
  }
}
