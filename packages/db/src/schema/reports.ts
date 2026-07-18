/**
 * @binro/db — Reports & Audit domain schema
 * Tables: qr_reports, audit_logs
 * Source: qrCodes/{id}/reports/{userId}, auditLogs/{month}/{id}
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  real,
  jsonb,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { qrCodes, unifiedQrs } from "./qr-codes";

// ─── QR Trust Reports ─────────────────────────────────────────────────────────
// One row per (qr, user) pair. user_removed=true means the user withdrew their report.

export const qrReports = pgTable(
  "qr_reports",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    qrCodeId: text("qr_code_id").references(() => qrCodes.id, { onDelete: "cascade" }),
    unifiedQrId: text("unified_qr_id").references(() => unifiedQrs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reportType: text("report_type").notNull(),
    /** Server-authoritative vote weight (0.01–2.0). */
    weight: real("weight").notNull().default(0.1),
    accountAgeDays: integer("account_age_days").notNull().default(0),
    emailVerified: boolean("email_verified").notNull().default(false),
    userRemoved: boolean("user_removed").notNull().default(false),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    qrCodeUserUniq: uniqueIndex("qr_reports_qr_code_user_uniq").on(t.qrCodeId, t.userId),
    unifiedQrUserUniq: uniqueIndex("qr_reports_unified_qr_user_uniq").on(t.unifiedQrId, t.userId),
    qrCodeIdx: index("qr_reports_qr_code_id_idx").on(t.qrCodeId),
    unifiedQrIdx: index("qr_reports_unified_qr_id_idx").on(t.unifiedQrId),
    userIdx: index("qr_reports_user_id_idx").on(t.userId),
  }),
);

// ─── Audit Logs ───────────────────────────────────────────────────────────────

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    qrId: text("qr_id"),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    voteWeight: real("vote_weight"),
    accountTier: integer("account_tier"),
    accountAgeDays: integer("account_age_days"),
    emailVerified: boolean("email_verified"),
    collusionFlags: jsonb("collusion_flags"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("audit_logs_user_id_idx").on(t.userId),
    qrIdx: index("audit_logs_qr_id_idx").on(t.qrId),
    createdAtIdx: index("audit_logs_created_at_idx").on(t.createdAt),
  }),
);

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type QrReport = typeof qrReports.$inferSelect;
export type NewQrReport = typeof qrReports.$inferInsert;
export type AuditLog = typeof auditLogs.$inferSelect;
