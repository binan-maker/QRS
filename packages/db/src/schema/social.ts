/**
 * @binro/db — Social domain schema
 * Tables: notifications
 * Source: RTDB notifications
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

// ─── Notifications ────────────────────────────────────────────────────────────
// TTL: 30 days (enforced by app-level cleanup or a DB maintenance worker).

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    message: text("message").notNull(),
    qrCodeId: text("qr_code_id"),
    fromUserId: text("from_user_id").references(() => users.id, { onDelete: "set null" }),
    fromUsername: text("from_username"),
    isRead: boolean("is_read").notNull().default(false),
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("notifications_user_id_idx").on(t.userId),
    userReadIdx: index("notifications_user_read_idx").on(t.userId, t.isRead),
    createdAtIdx: index("notifications_created_at_idx").on(t.createdAt),
  }),
);

// ─── Inferred Types ───────────────────────────────────────────────────────────
// NOTE: Named with "Db" prefix to avoid collision with the @binro/core domain
// type "Notification" (a plain interface) when both packages are imported together.

export type DbNotification = typeof notifications.$inferSelect;
export type NewDbNotification = typeof notifications.$inferInsert;
