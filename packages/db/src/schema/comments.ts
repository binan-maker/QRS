/**
 * @binro/db — Comments domain schema
 * Tables: qr_comments, comment_likes, comment_reports
 * Source: qrCodes/{id}/comments/{id} and sub-collections
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  index,
  uniqueIndex,
  primaryKey,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { qrCodes, unifiedQrs } from "./qr-codes";

// ─── QR Comments ─────────────────────────────────────────────────────────────
// Self-referential parentId supports reply threads.
// Supports both legacy (qr_code_id) and new (unified_qr_id) QRs.

export const qrComments = pgTable(
  "qr_comments",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    firebaseId: text("firebase_id").unique(),
    qrCodeId: text("qr_code_id").references(() => qrCodes.id, { onDelete: "cascade" }),
    unifiedQrId: text("unified_qr_id").references(() => unifiedQrs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    userName: text("user_name").notNull(),
    parentId: text("parent_id"), // self-ref added via ALTER after table creation
    text: text("text").notNull(),
    likes: integer("likes").notNull().default(0),
    reportCount: integer("report_count").notNull().default(0),
    isHidden: boolean("is_hidden").notNull().default(false),
    isDeleted: boolean("is_deleted").notNull().default(false),
    isPinned: boolean("is_pinned").notNull().default(false),
    isVerifiedOwner: boolean("is_verified_owner").notNull().default(false),
    isEdited: boolean("is_edited").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    qrCodeIdx: index("qr_comments_qr_code_id_idx").on(t.qrCodeId),
    unifiedQrIdx: index("qr_comments_unified_qr_id_idx").on(t.unifiedQrId),
    userIdx: index("qr_comments_user_id_idx").on(t.userId),
    parentIdx: index("qr_comments_parent_id_idx").on(t.parentId),
    createdAtIdx: index("qr_comments_created_at_idx").on(t.createdAt),
  }),
);

// ─── Comment Likes ────────────────────────────────────────────────────────────

export const commentLikes = pgTable(
  "comment_likes",
  {
    commentId: text("comment_id")
      .notNull()
      .references(() => qrComments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.commentId, t.userId] }),
    userIdx: index("comment_likes_user_id_idx").on(t.userId),
  }),
);

// ─── Comment Reports ──────────────────────────────────────────────────────────

export const commentReports = pgTable(
  "comment_reports",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    commentId: text("comment_id")
      .notNull()
      .references(() => qrComments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    commentIdx: index("comment_reports_comment_id_idx").on(t.commentId),
    uniq: uniqueIndex("comment_reports_comment_user_uniq").on(t.commentId, t.userId),
  }),
);

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type QrComment = typeof qrComments.$inferSelect;
export type NewQrComment = typeof qrComments.$inferInsert;
export type CommentLike = typeof commentLikes.$inferSelect;
export type CommentReport = typeof commentReports.$inferSelect;
