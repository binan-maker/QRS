/**
 * @binro/db — Drizzle ORM relations for retained tables.
 */

import { relations } from "drizzle-orm";
import { users, usernames } from "./users";
import { standardLinks } from "./qr-codes";
import { auditLogs, qrReports } from "./reports";
import { featureVotes } from "./platform";

export const usersRelations = relations(users, ({ many }) => ({
  usernames: many(usernames),
  qrReports: many(qrReports),
  auditLogs: many(auditLogs),
  featureVotes: many(featureVotes),
}));

export const standardLinksRelations = relations(standardLinks, ({ one }) => ({
  owner: one(users, { fields: [standardLinks.ownerId], references: [users.id] }),
}));