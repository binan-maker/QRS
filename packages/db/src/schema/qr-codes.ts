/**
 * @binro/db — QR Codes domain schema
 * Tables: qr_codes (legacy), unified_qrs (new), guard_links, guard_link_changes,
 *         standard_links, user_generated_qrs, qr_followers, user_favorites
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  index,
  uniqueIndex,
  serial,
} from "drizzle-orm/pg-core";
import { qrTypeEnum, unifiedQrStatusEnum } from "./enums";
import { users } from "./users";

// ─── Legacy QR Codes ─────────────────────────────────────────────────────────

export const qrCodes = pgTable(
  "qr_codes",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    firebaseId: text("firebase_id").unique(),
    content: text("content").notNull(),
    contentType: text("content_type").notNull().default("text"),
    ownerId: text("owner_id").references(() => users.id, { onDelete: "set null" }),
    ownerName: text("owner_name").notNull().default(""),
    qrType: qrTypeEnum("qr_type").notNull().default("individual"),
    uuid: text("uuid").unique(),
    brandedUuid: text("branded_uuid"),
    isBranded: boolean("is_branded").notNull().default(false),
    businessName: text("business_name"),
    templateKey: text("template_key"),
    signature: text("signature"),
    isActive: boolean("is_active").notNull().default(true),
    deactivationMessage: text("deactivation_message"),
    privateMode: boolean("private_mode").notNull().default(false),
    customLogoUri: text("custom_logo_uri"),
    logoPosition: text("logo_position").default("center"),
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
    contentTypeIdx: index("qr_codes_content_type_idx").on(t.contentType),
    uuidIdx: index("qr_codes_uuid_idx").on(t.uuid),
    firebaseIdIdx: index("qr_codes_firebase_id_idx").on(t.firebaseId),
  }),
);

// ─── Unified QRs (new model) ──────────────────────────────────────────────────

export const unifiedQrs = pgTable(
  "unified_qrs",
  {
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ownerName: text("owner_name").notNull(),
    qrType: qrTypeEnum("qr_type").notNull().default("individual"),
    template: text("template"),
    title: text("title"),
    isDynamic: boolean("is_dynamic").notNull().default(false),
    destination: text("destination").notNull(),
    rawDestination: text("raw_destination").notNull(),
    contentType: text("content_type").notNull().default("text"),
    businessName: text("business_name"),
    status: unifiedQrStatusEnum("status").notNull().default("active"),
    scanCount: integer("scan_count").notNull().default(0),
    downloads: integer("downloads").notNull().default(0),
    shares: integer("shares").notNull().default(0),
    scanLimit: integer("scan_limit"),
    expiryDate: text("expiry_date"),
    expiryPreset: text("expiry_preset"),
    design: jsonb("design").notNull().default(sql`'{"fgColor":"#0A0E17","bgColor":"#F8FAFC","logoPosition":"center","logoUri":null,"label":null}'::jsonb`),
    formValues: jsonb("form_values"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerIdx: index("unified_qrs_owner_id_idx").on(t.ownerId),
    statusIdx: index("unified_qrs_status_idx").on(t.status),
    contentTypeIdx: index("unified_qrs_content_type_idx").on(t.contentType),
    createdAtIdx: index("unified_qrs_created_at_idx").on(t.createdAt),
  }),
);

// ─── Guard Links (legacy dynamic QRs) ────────────────────────────────────────

export const guardLinks = pgTable(
  "guard_links",
  {
    id: text("id").primaryKey(),
    currentDestination: text("current_destination").notNull(),
    previousDestination: text("previous_destination"),
    businessName: text("business_name"),
    ownerName: text("owner_name").notNull(),
    ownerId: text("owner_id").references(() => users.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),
    destinationChangedAt: timestamp("destination_changed_at", { withTimezone: true }),
    scanCount: integer("scan_count").notNull().default(0),
    scanLimit: integer("scan_limit"),
    expiryDate: text("expiry_date"),
    contentType: text("content_type"),
    templateKey: text("template_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerIdx: index("guard_links_owner_id_idx").on(t.ownerId),
  }),
);

// ─── Guard Link Change Log ────────────────────────────────────────────────────

export const guardLinkChanges = pgTable(
  "guard_link_changes",
  {
    id: serial("id").primaryKey(),
    guardLinkId: text("guard_link_id")
      .notNull()
      .references(() => guardLinks.id, { onDelete: "cascade" }),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull(),
    fromDestination: text("from_destination").notNull(),
    toDestination: text("to_destination").notNull(),
    changedBy: text("changed_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => ({
    guardLinkIdx: index("guard_link_changes_guard_link_id_idx").on(t.guardLinkId),
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

// ─── User Generated QRs ───────────────────────────────────────────────────────

export const userGeneratedQrs = pgTable(
  "user_generated_qrs",
  {
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    qrCodeId: text("qr_code_id").references(() => qrCodes.id, { onDelete: "set null" }),
    unifiedQrId: text("unified_qr_id").references(() => unifiedQrs.id, { onDelete: "set null" }),
    name: text("name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("user_generated_qrs_user_id_idx").on(t.userId),
  }),
);

// ─── QR Followers ─────────────────────────────────────────────────────────────

export const qrFollowers = pgTable(
  "qr_followers",
  {
    qrCodeId: text("qr_code_id").references(() => qrCodes.id, { onDelete: "cascade" }),
    unifiedQrId: text("unified_qr_id").references(() => unifiedQrs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followedAt: timestamp("followed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    legacyPk: uniqueIndex("qr_followers_legacy_uniq").on(t.qrCodeId, t.userId),
    unifiedPk: uniqueIndex("qr_followers_unified_uniq").on(t.unifiedQrId, t.userId),
    userIdx: index("qr_followers_user_id_idx").on(t.userId),
  }),
);

// ─── User Favorites ───────────────────────────────────────────────────────────

export const userFavorites = pgTable(
  "user_favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    qrCodeId: text("qr_code_id").references(() => qrCodes.id, { onDelete: "cascade" }),
    unifiedQrId: text("unified_qr_id").references(() => unifiedQrs.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    legacyPk: uniqueIndex("user_favorites_legacy_uniq").on(t.userId, t.qrCodeId),
    unifiedPk: uniqueIndex("user_favorites_unified_uniq").on(t.userId, t.unifiedQrId),
    userIdx: index("user_favorites_user_id_idx").on(t.userId),
  }),
);

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type QrCode = typeof qrCodes.$inferSelect;
export type NewQrCode = typeof qrCodes.$inferInsert;
export type UnifiedQr = typeof unifiedQrs.$inferSelect;
export type NewUnifiedQr = typeof unifiedQrs.$inferInsert;
export type GuardLink = typeof guardLinks.$inferSelect;
export type GuardLinkChange = typeof guardLinkChanges.$inferSelect;
export type StandardLink = typeof standardLinks.$inferSelect;
export type UserGeneratedQr = typeof userGeneratedQrs.$inferSelect;
export type QrFollower = typeof qrFollowers.$inferSelect;
export type UserFavorite = typeof userFavorites.$inferSelect;
