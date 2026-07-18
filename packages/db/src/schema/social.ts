/**
 * @binro/db — Social domain schema
 * Tables: user_friends, creator_follows, notifications
 * Source: users/{uid}/friends, users/{uid}/creatorFollowing, RTDB notifications
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  index,
  primaryKey,
} from "drizzle-orm/pg-core";
import { friendStatusEnum } from "./enums";
import { users } from "./users";

// ─── User Friends ─────────────────────────────────────────────────────────────
// One-directional rows; the inverse is written separately.

export const userFriends = pgTable(
  "user_friends",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    friendId: text("friend_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: friendStatusEnum("status").notNull().default("pending"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.friendId] }),
    friendIdx: index("user_friends_friend_id_idx").on(t.friendId),
    statusIdx: index("user_friends_status_idx").on(t.status),
  }),
);

// ─── Creator Follows ──────────────────────────────────────────────────────────

export const creatorFollows = pgTable(
  "creator_follows",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    creatorId: text("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followedAt: timestamp("followed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.creatorId] }),
    creatorIdx: index("creator_follows_creator_id_idx").on(t.creatorId),
  }),
);

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

export type UserFriend = typeof userFriends.$inferSelect;
export type CreatorFollow = typeof creatorFollows.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
