// ═══════════════════════════════════════════════════════════════════════════════
// SECURITY — ECDSA response-signature verification.
// ───────────────────────────────────────────────────────────────────────────────
// Used to verify that threat-pattern payloads returned by the API were signed
// with the server's private key. Prevents man-in-the-middle tampering.
// ═══════════════════════════════════════════════════════════════════════════════

const PUBLIC_KEY_B64 =
  "MFkwEwYHKoZIzj0CAQYIKoZIzj0DAQcDQgAEH06cFBC8yBhAdlw3KBExytCQLbKGKURAdcr+8fyOBCBOIhSlT803TeD//JAImGn59Jr3ENFIZlC+3V6VL4g1qA==";

let _publicKey: CryptoKey | null = null;

async function getPublicKey(): Promise<CryptoKey> {
  if (_publicKey) return _publicKey;
  const der = Uint8Array.from(atob(PUBLIC_KEY_B64), (c) => c.charCodeAt(0));
  _publicKey = await crypto.subtle.importKey(
    "spki",
    der.buffer as ArrayBuffer,
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["verify"]
  );
  return _publicKey;
}

export async function verifyThreatSignature(
  payload: string,
  signatureB64: string
): Promise<boolean> {
  try {
    const key = await getPublicKey();
    const sigBytes = Uint8Array.from(atob(signatureB64), (c) => c.charCodeAt(0));
    const msgBytes = new TextEncoder().encode(payload);
    return await crypto.subtle.verify(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      sigBytes.buffer as ArrayBuffer,
      msgBytes.buffer as ArrayBuffer
    );
  } catch {
    return false;
  }
}

const DANGEROUS_PROTOCOLS = ["javascript:", "data:", "vbscript:", "file:"];

export function sanitizeUrl(url?: string | null): string {
  if (!url) return "";
  const trimmed = url.trim();
  const lower = trimmed.toLowerCase();

  for (const proto of DANGEROUS_PROTOCOLS) {
    if (lower.startsWith(proto)) {
      return "#";
    }
  }

  if (
    lower.startsWith("http://") ||
    lower.startsWith("https://") ||
    lower.startsWith("upi://") ||
    lower.startsWith("/")
  ) {
    return trimmed;
  }

  return "#";
}

export function sanitizeTextInput(input?: string | null, maxLength = 500): string {
  if (!input) return "";
  const stripped = input
    .replace(/<[^>]*>?/gm, "")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "")
    .trim();
  return stripped.slice(0, maxLength);
}

export function isValidUsername(username: string): boolean {
  return /^[a-zA-Z0-9_]{3,20}$/.test(username);
}

export function isValidQrId(qrId?: string | null): boolean {
  if (!qrId) return false;
  return /^[a-zA-Z0-9_-]{1,64}$/.test(qrId);
}
