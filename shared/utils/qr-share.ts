const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE62_INDEX = new Map([...BASE62].map((character, index) => [character, index]));
const QR_ID_HEX_LENGTH = 20;
export const BINRO_SITE_URL = "https://binro.xyz";

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