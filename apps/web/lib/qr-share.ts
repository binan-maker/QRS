const BASE62 = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
const BASE62_INDEX = new Map([...BASE62].map((character, index) => [character, index]));
const QR_ID_HEX_LENGTH = 20;

/**
 * This is intentionally kept byte-for-byte equivalent to the mobile app's
 * shared/utils/qr-share.ts implementation. Share codes are derived from the
 * QR document id; there is no web-only lookup table.
 */
export function decodeQrShareCode(code: string): string | null {
  const normalized = code.trim();
  if (/^[0-9a-f]{20}$/i.test(normalized)) return normalized.toLowerCase();
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