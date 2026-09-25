/**
 * @binro/db — QR Codes domain schema
 * Tables: standard_links
 */

import {
  pgTable,
  text,
  timestamp,
  integer,
  boolean,
  index,
} from "drizzle-orm/pg-core";
import { users } from "./users";

// ─── Standard Links (legacy static QRs) ──────────────────────────────────────

export const standardLinks = pgTable(
  "standard_links",
  {
    id: text("id").primaryKey(),
    rawContent: text("raw_content").notNull(),
    contentType: text("content_type").notNull().default("text"),
    ownerName: text("owner_name").notNull().default(""),
    ownerId: text("owner_id").references(() => users.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),
    scanLimit: integer("scan_limit"),
    scanCount: integer("scan_count").notNull().default(0),
    expiryDate: text("expiry_date"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerIdx: index("standard_links_owner_id_idx").on(t.ownerId),
  }),
);

export type StandardLink = typeof standardLinks.$inferSelect;
