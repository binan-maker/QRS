/**
 * @binro/db — Scans domain schema
 * Tables: qr_scans
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { qrCodes } from "./qr-codes";

export const qrScans = pgTable(
  "qr_scans",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    qrCodeId: text("qr_code_id").references(() => qrCodes.id, { onDelete: "set null" }),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    scanSource: text("scan_source").notNull().default("camera"),
    platform: text("platform").notNull().default("unknown"),
    verdict: text("verdict").notNull().default("unknown"),
    content: text("content"),
    contentType: text("content_type"),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    qrCodeIdx: index("qr_scans_qr_code_id_idx").on(t.qrCodeId),
    userIdx: index("qr_scans_user_id_idx").on(t.userId),
    scannedAtIdx: index("qr_scans_scanned_at_idx").on(t.scannedAt),
  }),
);

export type QrScan = typeof qrScans.$inferSelect;
export type NewQrScan = typeof qrScans.$inferInsert;
