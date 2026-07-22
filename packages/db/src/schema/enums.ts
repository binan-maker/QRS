/**
 * @binro/db — PostgreSQL enums
 * All pgEnum definitions, imported by every domain schema file.
 */

import { pgEnum } from "drizzle-orm/pg-core";

export const qrTypeEnum = pgEnum("qr_type", [
  "individual",
  "business",
  "government",
]);

export const unifiedQrStatusEnum = pgEnum("unified_qr_status", [
  "active",
  "inactive",
  "expired",
  "limit_reached",
]);


export const verificationStatusEnum = pgEnum("verification_status", [
  "none",
  "pending",
  "approved",
  "rejected",
]);

export const verificationMethodEnum = pgEnum("verification_method", [
  "email",
  "phone",
  "document",
  "manual",
  "none",
]);

// "captured" matches Razorpay's payment lifecycle terminology and aligns with
// the DonationStatus type in @binro/core.  The previous value "success" was
// inconsistent with the domain layer.
export const donationStatusEnum = pgEnum("donation_status", [
  "pending",
  "captured",
  "failed",
  "refunded",
]);

export const scanSourceEnum = pgEnum("scan_source", [
  "camera",
  "gallery",
  "viewed",
]);

export const platformEnum = pgEnum("platform", [
  "android",
  "ios",
  "web",
  "unknown",
]);

export const scanVerdictEnum = pgEnum("scan_verdict", [
  "safe",
  "flagged",
  "unknown",
]);

export const moderationStatusEnum = pgEnum("moderation_status", [
  "pending",
  "reviewed",
  "dismissed",
  "actioned",
]);

export const moderationContentTypeEnum = pgEnum("moderation_content_type", [
  "qr",
  "comment",
  "user",
]);
