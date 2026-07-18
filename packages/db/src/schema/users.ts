/**
 * @binro/db — Users domain schema
 * Tables: users, usernames
 * Source: users/{uid}, usernames/{username}
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
} from "drizzle-orm/pg-core";

// ─── Users ────────────────────────────────────────────────────────────────────

export const users = pgTable(
  "users",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    /** Original Firebase Auth / Firestore document ID. NULL after native PG registration. */
    firebaseUid: text("firebase_uid").unique(),
    email: text("email").notNull().unique(),
    emailVerified: boolean("email_verified").notNull().default(false),
    displayName: text("display_name").notNull(),
    photoUrl: text("photo_url"),
    username: text("username").unique(),
    usernameLastChangedAt: timestamp("username_last_changed_at", { withTimezone: true }),
    isDeleted: boolean("is_deleted").notNull().default(false),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    // Denormalized counters
    scanCount: integer("scan_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    followingCount: integer("following_count").notNull().default(0),
    totalLikesReceived: integer("total_likes_received").notNull().default(0),
    friendsCount: integer("friends_count").notNull().default(0),
    // Presence
    isOnline: boolean("is_online").notNull().default(false),
    lastSeen: timestamp("last_seen", { withTimezone: true }),
    // Push notifications
    pushToken: text("push_token"),
    // Consent (GDPR / privacy)
    consent: jsonb("consent"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    emailIdx: index("users_email_idx").on(t.email),
    usernameIdx: index("users_username_idx").on(t.username),
    firebaseUidIdx: index("users_firebase_uid_idx").on(t.firebaseUid),
  }),
);

// ─── Username Registry ────────────────────────────────────────────────────────

export const usernames = pgTable(
  "usernames",
  {
    username: text("username").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
    isVerified: boolean("is_verified").notNull().default(false),
  },
  (t) => ({
    userIdIdx: index("usernames_user_id_idx").on(t.userId),
  }),
);

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Username = typeof usernames.$inferSelect;
