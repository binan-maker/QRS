import { webcrypto } from "node:crypto";

const { subtle } = webcrypto as unknown as Crypto;

let _signingKey: CryptoKey | null = null;

async function getSigningKey(): Promise<CryptoKey | null> {
  if (_signingKey) return _signingKey;
  const keyB64 = process.env.THREATS_SIGNING_KEY;
  if (!keyB64) return null;
  try {
    const keyDer = Buffer.from(keyB64, "base64");
    _signingKey = await subtle.importKey(
      "pkcs8",
      keyDer,
      { name: "ECDSA", namedCurve: "P-256" },
      false,
      ["sign"]
    );
    return _signingKey;
  } catch {
    return null;
  }
}

export async function signPayload(payload: string): Promise<string | null> {
  const key = await getSigningKey();
  if (!key) return null;
  try {
    const msgBytes = new TextEncoder().encode(payload);
    const sigBytes = await subtle.sign(
      { name: "ECDSA", hash: "SHA-256" },
      key,
      msgBytes
    );
    return Buffer.from(sigBytes).toString("base64");
  } catch {
    return null;
  }
}
