const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE62_INDEX = new Map([...BASE62].map((character, index) => [character, index]));
const QR_ID_HEX_LENGTH = 20;
export const BINRO_SITE_URL = "https://binro.in";

const SHA256_K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x: number, n: number): number {
  return (x >>> n) | (x << (32 - n));
}

/**
 * Pure TypeScript synchronous SHA-256 implementation (FIPS 180-4).
 * Guarantees identical 20-character QR IDs across SSR, HTTPS, HTTP, and offline contexts.
 */
export function sha256HexSync(input: string): string {
  const bytes = new TextEncoder().encode(input);
  const bitLen = bytes.length * 8;
  const totalBytes = (((bytes.length + 8) >> 6) + 1) << 6;
  const buf = new Uint8Array(totalBytes);
  buf.set(bytes);
  buf[bytes.length] = 0x80;

  const view = new DataView(buf.buffer);
  view.setUint32(totalBytes - 8, Math.floor(bitLen / 0x100000000), false);
  view.setUint32(totalBytes - 4, bitLen >>> 0, false);

  let h0 = 0x6a09e667;
  let h1 = 0xbb67ae85;
  let h2 = 0x3c6ef372;
  let h3 = 0xa54ff53a;
  let h4 = 0x510e527f;
  let h5 = 0x9b05688c;
  let h6 = 0x1f83d9ab;
  let h7 = 0x5be0cd19;

  const w = new Uint32Array(64);

  for (let offset = 0; offset < totalBytes; offset += 64) {
    for (let i = 0; i < 16; i += 1) {
      w[i] = view.getUint32(offset + i * 4, false);
    }
    for (let i = 16; i < 64; i += 1) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    let f = h5;
    let g = h6;
    let h = h7;

    for (let i = 0; i < 64; i += 1) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + SHA256_K[i] + w[i]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;

      h = g;
      g = f;
      f = e;
      e = (d + temp1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (temp1 + temp2) >>> 0;
    }

    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
    h5 = (h5 + f) >>> 0;
    h6 = (h6 + g) >>> 0;
    h7 = (h7 + h) >>> 0;
  }

  return [h0, h1, h2, h3, h4, h5, h6, h7]
    .map((word) => word.toString(16).padStart(8, "0"))
    .join("");
}

/**
 * Synchronously computes the deterministic 20-character hex QR ID from raw QR content.
 */
export function getQrIdFromContentSync(content: string): string {
  return sha256HexSync(content.trim()).slice(0, QR_ID_HEX_LENGTH);
}

/**
 * Converts the QR's 80-bit hexadecimal ID into a compact Base62 path segment.
 * The conversion is reversible, so no share-code document or lookup table is
 * needed and two QR IDs cannot produce the same code.
 */
export function encodeQrShareCode(qrId: string): string | null {
  const normalized = qrId.trim().toLowerCase();
  if (!/^[0-9a-f]{1,20}$/.test(normalized)) return null;

  const digits = [0];
  for (const character of normalized) {
    let carry = Number.parseInt(character, 16);
    for (let index = 0; index < digits.length; index += 1) {
      const value = digits[index] * 16 + carry;
      digits[index] = value % 62;
      carry = Math.floor(value / 62);
    }
    while (carry > 0) {
      digits.push(carry % 62);
      carry = Math.floor(carry / 62);
    }
  }

  return digits
    .reverse()
    .map((digit) => BASE62[digit])
    .join("");
}

export function decodeQrShareCode(code: string): string | null {
  const normalized = code.trim();
  if (/^[0-9a-f]{20}$/i.test(normalized)) return normalized.toLowerCase();
  if (/^[0-9a-f]{64}$/i.test(normalized)) return normalized.slice(0, 20).toLowerCase();
  // 62^14 is the first Base62 range that safely covers all 80-bit IDs.
  if (!/^[0-9a-zA-Z]{1,14}$/.test(normalized)) return null;

  const nibbles = [0];
  for (const character of normalized) {
    const value = BASE62_INDEX.get(character);
    if (value === undefined) return null;

    let carry = value;
    for (let index = 0; index < nibbles.length; index += 1) {
      const next = nibbles[index] * 62 + carry;
      nibbles[index] = next % 16;
      carry = Math.floor(next / 16);
    }
    while (carry > 0) {
      nibbles.push(carry % 16);
      carry = Math.floor(carry / 16);
    }
  }

  const hex = nibbles
    .reverse()
    .map((nibble) => nibble.toString(16))
    .join("")
    .padStart(QR_ID_HEX_LENGTH, "0");

  return hex.length <= QR_ID_HEX_LENGTH ? hex : null;
}

export function getQrShareUrl(qrId: string): string | null {
  const code = encodeQrShareCode(qrId);
  return code ? `${BINRO_SITE_URL}/qr/${code}` : null;
}

/**
 * Resolves a 20-char hex QR ID, 64-char hex hash, Base62 share code, or raw QR content
 * into the canonical Base62 share code (e.g. "3E7TEeNFD7e7tA").
 */
export function resolveQrShareCode(
  idOrCode?: string | null,
  content?: string | null
): string | null {
  const candidate = (idOrCode || "").trim();

  // 1. 20-char or 64-char hex QR ID -> encode directly to Base62
  if (/^[0-9a-f]{20}$/i.test(candidate)) {
    return encodeQrShareCode(candidate.toLowerCase());
  }
  if (/^[0-9a-f]{64}$/i.test(candidate)) {
    return encodeQrShareCode(candidate.slice(0, 20).toLowerCase());
  }

  // 2. If content is provided and candidate is missing, "custom", or a UUID, compute from content
  if (content && content.trim()) {
    const qrId = getQrIdFromContentSync(content.trim());
    const encoded = encodeQrShareCode(qrId);
    if (encoded) return encoded;
  }

  // 3. Already a valid Base62 share code (1-14 alphanumeric chars, not "custom")
  if (
    candidate &&
    candidate.toLowerCase() !== "custom" &&
    /^[0-9a-zA-Z]{1,14}$/.test(candidate) &&
    decodeQrShareCode(candidate)
  ) {
    return candidate;
  }

  return null;
}