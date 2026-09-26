/**
 * Consumer-owned records: user favorites and feedback.
 * All friend/follow relationships removed completely.
 */

import { sql } from "drizzle-orm";
import {
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";
import { qrCodes } from "./qr-codes";

export const userFavorites = pgTable(
  "user_favorites",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    qrId: text("qr_id").notNull(),
    qrCodeId: text("qr_code_id").references(() => qrCodes.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userQrUniq: uniqueIndex("user_favorites_user_qr_uniq").on(t.userId, t.qrId),
    userIdx: index("user_favorites_user_id_idx").on(t.userId),
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
export type Feedback = typeof feedback.$inferSelect;
