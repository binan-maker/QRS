/**
 * @binro/db — QR domain schema
 * Clean, universal QR table: qr_codes
 * Stripped of: owner_id, owner_name, is_active, deactivation_message, expiry_date.
 */

import {
  pgTable,
  text,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";

export const qrCodes = pgTable(
  "qr_codes",
  {
    id: text("id").primaryKey(),
    content: text("content").notNull(),
    contentType: text("content_type").notNull().default("text"),
    qrType: text("qr_type").notNull().default("qr"),
    displayDestination: text("display_destination"),
    scanCount: integer("scan_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    scanLimit: integer("scan_limit"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

export type QrCode = typeof qrCodes.$inferSelect;
export type NewQrCode = typeof qrCodes.$inferInsert;
