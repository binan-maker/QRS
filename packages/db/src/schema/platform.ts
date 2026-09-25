/**
 * @binro/db — Platform / admin domain schema
 * Tables: categories, feature_votes
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  integer,
  jsonb,
  real,
  index,
  uniqueIndex,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// ─── Categories ───────────────────────────────────────────────────────────────

export const categories = pgTable("categories", {
  id: text("id").primaryKey().default(sql`gen_random_uuid()`),
  name: text("name").notNull(),
  slug: text("slug").notNull().unique(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
});

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

// ─── Inferred Types ───────────────────────────────────────────────────────────
export type Category = typeof categories.$inferSelect;
export type FeatureVote = typeof featureVotes.$inferSelect;
