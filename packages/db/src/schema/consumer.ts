/**
 * Consumer-owned records that were previously represented by nested document
 * collections. These tables are intentionally small and keep the original
 * document IDs so the adapter can preserve existing app references.
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  boolean,
  jsonb,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { qrCodes, unifiedQrs } from "./qr-codes";

export const userFavorites = pgTable(
  "user_favorites",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    qrId: text("qr_id").notNull(),
    qrCodeId: text("qr_code_id").references(() => qrCodes.id, { onDelete: "cascade" }),
    unifiedQrId: text("unified_qr_id").references(() => unifiedQrs.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userQrUniq: uniqueIndex("user_favorites_user_qr_uniq").on(t.userId, t.qrId),
    userIdx: index("user_favorites_user_id_idx").on(t.userId),
  }),
);

export const userGeneratedQrs = pgTable(
  "user_generated_qrs",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    qrCodeId: text("qr_code_id").references(() => qrCodes.id, { onDelete: "cascade" }),
    unifiedQrId: text("unified_qr_id").references(() => unifiedQrs.id, { onDelete: "cascade" }),
    title: text("title"),
    content: text("content"),
    contentType: text("content_type"),
    data: jsonb("data"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("user_generated_qrs_user_id_idx").on(t.userId),
  }),
);

export const userFriends = pgTable(
  "user_friends",
  {
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    friendId: text("friend_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    isFollowing: boolean("is_following").notNull().default(true),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userFriendUniq: uniqueIndex("user_friends_user_friend_uniq").on(t.userId, t.friendId),
  }),
);

export const feedback = pgTable(
  "feedback",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    email: text("email"),
    message: text("message"),
    errorMessage: text("error_message"),
    errorStack: text("error_stack"),
    userMessage: text("user_message"),
    deviceInfo: text("device_info"),
    appVersion: text("app_version"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("feedback_user_id_idx").on(t.userId),
  }),
);

export type UserFavorite = typeof userFavorites.$inferSelect;
export type UserGeneratedQr = typeof userGeneratedQrs.$inferSelect;
export type UserFriend = typeof userFriends.$inferSelect;
export type Feedback = typeof feedback.$inferSelect;