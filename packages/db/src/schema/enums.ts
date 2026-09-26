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

