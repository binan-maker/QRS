/**
 * @binro/db — QR Codes domain schema
 * Tables: standard_links
 */

import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { qrTypeEnum, unifiedQrStatusEnum } from "./enums";

// ─── Legacy QR codes ──────────────────────────────────────────────────────────

export const qrCodes = pgTable(
  "qr_codes",
  {
    id: text("id").primaryKey(),
    content: text("content"),
    contentType: text("content_type"),
    ownerId: text("owner_id").references(() => users.id, { onDelete: "set null" }),
    ownerName: text("owner_name"),
    qrType: qrTypeEnum("qr_type"),
    uuid: text("uuid").unique(),
    brandedUuid: text("branded_uuid"),
    isBranded: boolean("is_branded").default(false),
    businessName: text("business_name"),
    templateKey: text("template_key"),
    signature: text("signature"),
    isActive: boolean("is_active").notNull().default(true),
    deactivationMessage: text("deactivation_message"),
    privateMode: boolean("private_mode").notNull().default(false),
    customLogoUri: text("custom_logo_uri"),
    logoPosition: text("logo_position"),
    displayDestination: text("display_destination"),
    formValues: jsonb("form_values"),
    scanCount: integer("scan_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    ownerScanCount: integer("owner_scan_count").notNull().default(0),
    scanCountFrozen: boolean("scan_count_frozen").notNull().default(false),
    scanCountFreezeReason: text("scan_count_freeze_reason"),
    ownerVerified: boolean("owner_verified").notNull().default(false),
    scanLimit: integer("scan_limit"),
    expiryDate: text("expiry_date"),
    expiryPreset: text("expiry_preset"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerIdx: index("qr_codes_owner_id_idx").on(t.ownerId),
    uuidIdx: index("qr_codes_uuid_idx").on(t.uuid),
  }),
);

// ─── Unified QR codes ──────────────────────────────────────────────────────────

export const unifiedQrs = pgTable(
  "unified_qrs",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    ownerName: text("owner_name"),
    qrType: qrTypeEnum("qr_type"),
    template: text("template"),
    title: text("title"),
    isDynamic: boolean("is_dynamic").notNull().default(false),
    destination: text("destination"),
    rawDestination: text("raw_destination"),
    contentType: text("content_type"),
    businessName: text("business_name"),
    status: unifiedQrStatusEnum("status").notNull().default("active"),
    scanCount: integer("scan_count").notNull().default(0),
    downloads: integer("downloads").notNull().default(0),
    shares: integer("shares").notNull().default(0),
    scanLimit: integer("scan_limit"),
    expiryDate: text("expiry_date"),
    expiryPreset: text("expiry_preset"),
    design: jsonb("design"),
    formValues: jsonb("form_values"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerIdx: index("unified_qrs_owner_id_idx").on(t.ownerId),
    statusIdx: index("unified_qrs_status_idx").on(t.status),
  }),
);

// ─── Standard Links (legacy static QRs) ──────────────────────────────────────

export const standardLinks = pgTable(
  "standard_links",
  {
    id: text("id").primaryKey(),
    rawContent: text("raw_content").notNull(),
    contentType: text("content_type").notNull().default("text"),
    ownerName: text("owner_name").notNull().default(""),
    ownerId: text("owner_id").references(() => users.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),
    scanLimit: integer("scan_limit"),
    scanCount: integer("scan_count").notNull().default(0),
    expiryDate: text("expiry_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerIdx: index("standard_links_owner_id_idx").on(t.ownerId),
  }),
);

export type StandardLink = typeof standardLinks.$inferSelect;
