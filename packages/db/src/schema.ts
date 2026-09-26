import {
  pgTable,
  text,
  boolean,
  integer,
  real,
  jsonb,
  timestamp,
  primaryKey,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

// ── 1. Users Table ─────────────────────────────────────────────────────────────
export const users = pgTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  emailVerified: boolean("email_verified").default(false),
  displayName: text("display_name").notNull(),
  photoUrl: text("photo_url"),
  username: text("username").unique(),
  usernameLastChangedAt: timestamp("username_last_changed_at", { withTimezone: true }),
  isDeleted: boolean("is_deleted").default(false),
  deletedAt: timestamp("deleted_at", { withTimezone: true }),
  scanCount: integer("scan_count").notNull().default(0),
  commentCount: integer("comment_count").notNull().default(0),
  totalLikesReceived: integer("total_likes_received").notNull().default(0),
  consent: jsonb("consent"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 2. Usernames Table ─────────────────────────────────────────────────────────
export const usernames = pgTable("usernames", {
  username: text("username").primaryKey(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  claimedAt: timestamp("claimed_at", { withTimezone: true }).notNull().defaultNow(),
  isVerified: boolean("is_verified").default(false),
});

// ── 3. QR Codes Table ──────────────────────────────────────────────────────────
export const qrCodes = pgTable("qr_codes", {
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
});

// ── 4. QR Scans Table ──────────────────────────────────────────────────────────
export const qrScans = pgTable("qr_scans", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  qrCodeId: text("qr_code_id").references(() => qrCodes.id, { onDelete: "set null" }),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  isAnonymous: boolean("is_anonymous").notNull().default(false),
  scanSource: text("scan_source").notNull().default("camera"),
  platform: text("platform").notNull().default("unknown"),
  verdict: text("verdict").notNull().default("unknown"),
  content: text("content"),
  contentType: text("content_type"),
  scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 5. QR Comments Table ───────────────────────────────────────────────────────
export const qrComments = pgTable("qr_comments", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  qrCodeId: text("qr_code_id")
    .notNull()
    .references(() => qrCodes.id, { onDelete: "cascade" }),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  userName: text("user_name").notNull(),
  parentId: text("parent_id"),
  text: text("text").notNull(),
  likes: integer("likes").notNull().default(0),
  reportCount: integer("report_count").notNull().default(0),
  isDeleted: boolean("is_deleted").notNull().default(false),
  isPinned: boolean("is_pinned").notNull().default(false),
  isEdited: boolean("is_edited").notNull().default(false),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 6. Comment Likes Table ─────────────────────────────────────────────────────
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
  (t) => [primaryKey({ columns: [t.commentId, t.userId] })]
);

// ── 7. Comment Reports Table ───────────────────────────────────────────────────
export const commentReports = pgTable(
  "comment_reports",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    commentId: text("comment_id")
      .notNull()
      .references(() => qrComments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("comment_reports_comment_user_uniq").on(t.commentId, t.userId)]
);

// ── 8. QR Reports Table ────────────────────────────────────────────────────────
export const qrReports = pgTable(
  "qr_reports",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    qrCodeId: text("qr_code_id")
      .notNull()
      .references(() => qrCodes.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reportType: text("report_type").notNull(),
    weight: real("weight").notNull().default(0.1),
    accountAgeDays: integer("account_age_days").notNull().default(0),
    emailVerified: boolean("email_verified").notNull().default(false),
    userRemoved: boolean("user_removed").notNull().default(false),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("qr_reports_qr_code_user_uniq").on(t.qrCodeId, t.userId)]
);

// ── 9. User Favorites Table ────────────────────────────────────────────────────
export const userFavorites = pgTable(
  "user_favorites",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    qrId: text("qr_id").notNull(),
    qrCodeId: text("qr_code_id").references(() => qrCodes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("user_favorites_user_qr_uniq").on(t.userId, t.qrId)]
);

// ── 10. Notifications Table ────────────────────────────────────────────────────
export const notifications = pgTable("notifications", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  message: text("message").notNull(),
  qrCodeId: text("qr_code_id").references(() => qrCodes.id, { onDelete: "cascade" }),
  fromUserId: text("from_user_id").references(() => users.id, { onDelete: "set null" }),
  fromUsername: text("from_username"),
  isRead: boolean("is_read").notNull().default(false),
  expiresAt: timestamp("expires_at", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 11. Feedback Table ─────────────────────────────────────────────────────────
export const feedback = pgTable("feedback", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  email: text("email"),
  message: text("message"),
  errorMessage: text("error_message"),
  errorStack: text("error_stack"),
  userMessage: text("user_message"),
  deviceInfo: text("device_info"),
  appVersion: text("app_version"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 12. Audit Logs Table ───────────────────────────────────────────────────────
export const auditLogs = pgTable("audit_logs", {
  id: text("id")
    .primaryKey()
    .default(sql`gen_random_uuid()::text`),
  qrId: text("qr_id"),
  userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
  action: text("action").notNull(),
  voteWeight: real("vote_weight"),
  accountTier: integer("account_tier"),
  accountAgeDays: integer("account_age_days"),
  emailVerified: boolean("email_verified"),
  collusionFlags: jsonb("collusion_flags"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

// ── 13. Feature Votes Table ────────────────────────────────────────────────────
export const featureVotes = pgTable(
  "feature_votes",
  {
    id: text("id")
      .primaryKey()
      .default(sql`gen_random_uuid()::text`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    featureKey: text("feature_key").notNull(),
    vote: integer("vote").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [uniqueIndex("feature_votes_user_feature_uniq").on(t.userId, t.featureKey)]
);
