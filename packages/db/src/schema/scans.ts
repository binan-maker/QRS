/**
 * @binro/db — Scans domain schema
 * Tables: qr_scans
 * Source: qrCodes/{id}/events/{id} + users/{uid}/scans/{id}
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { scanSourceEnum, platformEnum, scanVerdictEnum } from "./enums";
import { users } from "./users";
import { qrCodes, unifiedQrs, guardLinks, standardLinks } from "./qr-codes";

// ─── QR Scans ─────────────────────────────────────────────────────────────────
// Exactly one of qr_code_id / unified_qr_id / guard_link_id / standard_link_id is set.

export const qrScans = pgTable(
  "qr_scans",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    // QR references (only one should be set per scan)
    qrCodeId: text("qr_code_id").references(() => qrCodes.id, { onDelete: "set null" }),
    unifiedQrId: text("unified_qr_id").references(() => unifiedQrs.id, { onDelete: "set null" }),
    guardLinkId: text("guard_link_id").references(() => guardLinks.id, { onDelete: "set null" }),
    standardLinkId: text("standard_link_id").references(() => standardLinks.id, { onDelete: "set null" }),
    // Scanner identity
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    // Scan metadata
    scanSource: scanSourceEnum("scan_source"),
    platform: platformEnum("platform").notNull().default("unknown"),
    verdict: scanVerdictEnum("verdict").notNull().default("unknown"),
    // Content snapshot (captured at scan time, since destination can change)
    content: text("content"),
    contentType: text("content_type"),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    qrCodeIdx: index("qr_scans_qr_code_id_idx").on(t.qrCodeId),
    unifiedQrIdx: index("qr_scans_unified_qr_id_idx").on(t.unifiedQrId),
    userIdx: index("qr_scans_user_id_idx").on(t.userId),
    scannedAtIdx: index("qr_scans_scanned_at_idx").on(t.scannedAt),
  }),
);

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type QrScan = typeof qrScans.$inferSelect;
export type NewQrScan = typeof qrScans.$inferInsert;
