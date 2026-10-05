/**
 * Web Security utilities for BinRo Next.js application.
 */

import { USERNAME_REGEX, sanitizeUsername } from "@shared/utils/username-rules";

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
  return USERNAME_REGEX.test(username);
}

export function isValidQrId(qrId?: string | null): boolean {
  if (!qrId) return false;
  return /^[a-zA-Z0-9_-]{1,64}$/.test(qrId);
}
