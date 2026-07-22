/**
 * @binro/core — Value Objects
 *
 * Immutable domain values with validation built-in.
 * Each value object wraps a primitive and enforces invariants at construction.
 *
 * Phase 3 target: all domain entities use these value objects instead of raw strings.
 */

import { ValidationError } from "../errors";

// ─── QR Slug ─────────────────────────────────────────────────────────────────

export class QrSlug {
  private readonly value: string;

  private constructor(slug: string) {
    this.value = slug;
  }

  static create(raw: string): QrSlug {
    const slug = raw.trim().toLowerCase().replace(/[^a-z0-9-]/g, "-");
    if (slug.length < 3 || slug.length > 64) {
      throw new ValidationError(`QrSlug must be 3–64 characters, got: "${slug}"`, "slug");
    }
    return new QrSlug(slug);
  }

  toString(): string {
    return this.value;
  }
}

// ─── UPI VPA ─────────────────────────────────────────────────────────────────

export class UpiId {
  private readonly value: string;
  private static readonly PATTERN = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9]+$/;

  private constructor(vpa: string) {
    this.value = vpa.toLowerCase().trim();
  }

  static create(raw: string): UpiId {
    const vpa = raw.toLowerCase().trim();
    if (!UpiId.PATTERN.test(vpa)) {
      throw new ValidationError(`Invalid UPI VPA format: "${raw}"`, "upiId");
    }
    return new UpiId(vpa);
  }

  static isValid(raw: string): boolean {
    return UpiId.PATTERN.test(raw.toLowerCase().trim());
  }

  toString(): string {
    return this.value;
  }
}

// ─── Trust Level ─────────────────────────────────────────────────────────────

export type TrustLevelValue = "safe" | "caution" | "flagged" | "unknown";

export class TrustLevel {
  private constructor(readonly value: TrustLevelValue) {}

  static readonly SAFE    = new TrustLevel("safe");
  static readonly CAUTION = new TrustLevel("caution");
  static readonly FLAGGED = new TrustLevel("flagged");
  static readonly UNKNOWN = new TrustLevel("unknown");

  static fromScore(score: number): TrustLevel {
    if (score >= 0.7) return TrustLevel.SAFE;
    if (score >= 0.4) return TrustLevel.CAUTION;
    if (score >= 0)   return TrustLevel.FLAGGED;
    return TrustLevel.UNKNOWN;
  }

  isSafe():    boolean { return this.value === "safe"; }
  isFlagged(): boolean { return this.value === "flagged"; }

  toString(): string {
    return this.value;
  }
}

// ─── Content Type ─────────────────────────────────────────────────────────────

export const CONTENT_TYPES = [
  "url", "upi", "text", "wifi", "email",
  "phone", "sms", "vcard", "location", "event",
] as const;

export type ContentTypeValue = (typeof CONTENT_TYPES)[number];

export class ContentType {
  private constructor(readonly value: ContentTypeValue) {}

  static create(raw: string): ContentType {
    const found = CONTENT_TYPES.find((t) => t === raw.toLowerCase().trim());
    if (!found) throw new ValidationError(`Unknown content type: "${raw}"`, "contentType");
    return new ContentType(found);
  }

  static isValid(raw: string): raw is ContentTypeValue {
    return CONTENT_TYPES.includes(raw as ContentTypeValue);
  }

  isPayment(): boolean { return this.value === "upi"; }
  isUrl():     boolean { return this.value === "url"; }

  toString(): string {
    return this.value;
  }
}
