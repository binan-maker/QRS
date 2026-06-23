import * as crypto from "crypto";

const GOOGLE_PUBLIC_KEYS_URL =
  "https://www.googleapis.com/robot/v1/metadata/x509/securetoken@system.gserviceaccount.com";
const FIREBASE_ISSUER_PREFIX = "https://securetoken.google.com/";

interface CachedKeys {
  keys: Record<string, string>;
  expiresAt: number;
}
let _keyCache: CachedKeys | null = null;

async function getPublicKeys(): Promise<Record<string, string>> {
  if (_keyCache && Date.now() < _keyCache.expiresAt) return _keyCache.keys;

  const res = await fetch(GOOGLE_PUBLIC_KEYS_URL);
  if (!res.ok) throw new Error(`Failed to fetch Firebase public keys: ${res.status}`);

  const cacheControl = res.headers.get("cache-control") || "";
  const maxAgeMatch = cacheControl.match(/max-age=(\d+)/);
  const maxAgeMs = maxAgeMatch ? parseInt(maxAgeMatch[1]) * 1000 : 3_600_000;

  const keys = (await res.json()) as Record<string, string>;
  _keyCache = { keys, expiresAt: Date.now() + maxAgeMs };
  return keys;
}

function b64urlToBuffer(str: string): Buffer {
  return Buffer.from(str.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

export interface DecodedFirebaseToken {
  uid: string;
  email?: string;
  email_verified?: boolean;
  name?: string;
  picture?: string;
}

export async function verifyFirebaseIdToken(
  idToken: string
): Promise<DecodedFirebaseToken> {
  const projectId = process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID;
  if (!projectId) throw new Error("EXPO_PUBLIC_FIREBASE_PROJECT_ID is not set");

  const parts = idToken.split(".");
  if (parts.length !== 3) {
    const err: any = new Error("Malformed token");
    err.code = "auth/argument-error";
    throw err;
  }

  const [headerB64, payloadB64, sigB64] = parts;
  const header = JSON.parse(b64urlToBuffer(headerB64).toString("utf8"));
  const payload = JSON.parse(b64urlToBuffer(payloadB64).toString("utf8"));

  const nowSec = Math.floor(Date.now() / 1000);
  if (payload.exp < nowSec) {
    const err: any = new Error("Token has expired");
    err.code = "auth/id-token-expired";
    throw err;
  }

  if (payload.iss !== `${FIREBASE_ISSUER_PREFIX}${projectId}`) {
    const err: any = new Error("Invalid token issuer");
    err.code = "auth/argument-error";
    throw err;
  }
  if (payload.aud !== projectId) {
    const err: any = new Error("Invalid token audience");
    err.code = "auth/argument-error";
    throw err;
  }

  const keys = await getPublicKeys();
  const certPem = keys[header.kid];
  if (!certPem) {
    const err: any = new Error("Unknown signing key — key may have rotated");
    err.code = "auth/argument-error";
    throw err;
  }

  const verifier = crypto.createVerify("RSA-SHA256");
  verifier.update(`${headerB64}.${payloadB64}`);
  const valid = verifier.verify(certPem, b64urlToBuffer(sigB64));
  if (!valid) {
    const err: any = new Error("Invalid token signature");
    err.code = "auth/argument-error";
    throw err;
  }

  return {
    uid: payload.sub as string,
    email: payload.email,
    email_verified: payload.email_verified,
    name: payload.name,
    picture: payload.picture,
  };
}
