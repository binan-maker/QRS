import { sql } from "drizzle-orm";
import { pgTable, text, varchar, timestamp, integer, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const authTokens = pgTable("auth_tokens", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  token: text("token").notNull().unique(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const qrCodes = pgTable("qr_codes", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  content: text("content").notNull().unique(),
  contentType: text("content_type").notNull().default("text"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const comments = pgTable("comments", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  qrCodeId: varchar("qr_code_id")
    .notNull()
    .references(() => qrCodes.id),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  text: text("text").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const reports = pgTable("reports", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  qrCodeId: varchar("qr_code_id")
    .notNull()
    .references(() => qrCodes.id),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id),
  reportType: text("report_type").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const scans = pgTable("scans", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  qrCodeId: varchar("qr_code_id")
    .notNull()
    .references(() => qrCodes.id),
  userId: varchar("user_id")
    .references(() => users.id),
  isAnonymous: boolean("is_anonymous").default(false),
  scannedAt: timestamp("scanned_at").defaultNow().notNull(),
});

export const registerSchema = z.object({
  email: z.string().email(),
  displayName: z.string().min(2).max(50),
  password: z.string().min(6),
});

export const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

export type User = typeof users.$inferSelect;
export type QrCode = typeof qrCodes.$inferSelect;
export type Comment = typeof comments.$inferSelect;
export type Report = typeof reports.$inferSelect;
export type Scan = typeof scans.$inferSelect;
