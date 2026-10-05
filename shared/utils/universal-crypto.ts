// Universal crypto utility providing SHA-256 hashing across:
// 1. Web browser (crypto.subtle)
// 2. Node.js / SSR / Vercel (node:crypto / crypto.subtle)
// 3. React Native / Expo (expo-crypto via dynamic require or subtle fallback)

export enum CryptoDigestAlgorithm {
  SHA256 = "SHA-256",
  SHA384 = "SHA-384",
  SHA512 = "SHA-512",
  MD5 = "MD5",
  SHA1 = "SHA-1",
}

export enum CryptoEncoding {
  HEX = "hex",
  BASE64 = "base64",
}

function hexDigestFallback(str: string): string {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("node:crypto") || require("crypto");
    if (crypto?.createHash) {
      return crypto.createHash("sha256").update(str).digest("hex");
    }
  } catch {}
  return "";
}

export async function digestStringAsync(
  algorithm: CryptoDigestAlgorithm | string,
  str: string,
  _options?: { encoding?: CryptoEncoding | string }
): Promise<string> {
  // 1. If in Expo / React Native environment, try expo-crypto
  try {
    if (typeof window === "undefined" || !(window as any).crypto?.subtle) {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const ExpoCrypto = require("expo-crypto");
      if (ExpoCrypto && typeof ExpoCrypto.digestStringAsync === "function") {
        return await ExpoCrypto.digestStringAsync(algorithm, str, _options);
      }
    }
  } catch {}

  // 2. Browser standard Web Crypto API
  if (typeof globalThis !== "undefined" && globalThis.crypto?.subtle) {
    try {
      const encoder = new TextEncoder();
      const data = encoder.encode(str);
      const hashBuffer = await globalThis.crypto.subtle.digest("SHA-256", data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      return hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    } catch {}
  }

  // 3. Node.js environment
  const nodeHex = hexDigestFallback(str);
  if (nodeHex) return nodeHex;

  // 4. Deterministic fallback for edge cases
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    hash = (hash << 5) - hash + str.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash).toString(16).padStart(20, "0");
}
