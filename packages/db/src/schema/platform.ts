/**
 * @binro/db — Platform / admin domain schema
 * Tables: categories, donations, moderation_queue, verification_requests,
 *         feature_votes, business_accounts
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  jsonb,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import {
  donationStatusEnum,
  moderationStatusEnum,
  moderationContentTypeEnum,
  verificationStatusEnum,
  verificationMethodEnum,
} from "./enums";
import { users } from "./users";

// ─── Categories ───────────────────────────────────────────────────────────────

export const categories = pgTable("categories", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

// ─── Donations ────────────────────────────────────────────────────────────────

export const donations = pgTable(
  "donations",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    orderId: text("order_id").notNull().unique(),
    paymentId: text("payment_id").unique(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    amountPaise: integer("amount_paise").notNull(),
    currency: text("currency").notNull().default("INR"),
    donorName: text("donor_name"),
    donorEmail: text("donor_email"),
    status: donationStatusEnum("status").notNull().default("pending"),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("donations_user_id_idx").on(t.userId),
    statusIdx: index("donations_status_idx").on(t.status),
  }),
);

// ─── Moderation Queue ─────────────────────────────────────────────────────────

export const moderationQueue = pgTable(
  "moderation_queue",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    contentType: moderationContentTypeEnum("content_type").notNull(),
    contentId: text("content_id").notNull(),
    reason: text("reason").notNull(),
    reporterId: text("reporter_id").references(() => users.id, { onDelete: "set null" }),
    status: moderationStatusEnum("status").notNull().default("pending"),
    reviewedBy: text("reviewed_by").references(() => users.id, { onDelete: "set null" }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    reviewerNotes: text("reviewer_notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    statusIdx: index("moderation_queue_status_idx").on(t.status),
    contentIdx: index("moderation_queue_content_id_idx").on(t.contentId),
    createdAtIdx: index("moderation_queue_created_at_idx").on(t.createdAt),
  }),
);

// ─── Verification Requests ────────────────────────────────────────────────────

export const verificationRequests = pgTable(
  "verification_requests",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: verificationStatusEnum("status").notNull().default("none"),
    method: verificationMethodEnum("method").notNull().default("none"),
    businessName: text("business_name"),
    documents: jsonb("documents"),
    pendingReview: boolean("pending_review").notNull().default(false),
    reviewerNotes: text("reviewer_notes"),
    submittedAt: timestamp("submitted_at", { withTimezone: true }),
    reviewedAt: timestamp("reviewed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("verification_requests_user_id_idx").on(t.userId),
    statusIdx: index("verification_requests_status_idx").on(t.status),
  }),
);

// ─── Feature Votes ────────────────────────────────────────────────────────────

export const featureVotes = pgTable(
  "feature_votes",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    featureKey: text("feature_key").notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    value: jsonb("value"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    featureKeyIdx: index("feature_votes_feature_key_idx").on(t.featureKey),
    userIdx: index("feature_votes_user_id_idx").on(t.userId),
    uniq: uniqueIndex("feature_votes_feature_user_uniq").on(t.featureKey, t.userId),
  }),
);

// ─── Business Accounts ────────────────────────────────────────────────────────

export const businessAccounts = pgTable(
  "business_accounts",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .unique()
      .references(() => users.id, { onDelete: "cascade" }),
    displayName: text("display_name").notNull(),
    plan: text("plan").notNull().default("free"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("business_accounts_user_id_idx").on(t.userId),
  }),
);

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type Category = typeof categories.$inferSelect;
export type Donation = typeof donations.$inferSelect;
export type ModerationQueueItem = typeof moderationQueue.$inferSelect;
export type VerificationRequest = typeof verificationRequests.$inferSelect;
export type FeatureVote = typeof featureVotes.$inferSelect;
export type BusinessAccount = typeof businessAccounts.$inferSelect;
