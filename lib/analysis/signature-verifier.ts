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
