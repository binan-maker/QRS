/**
 * @binro/db — Drizzle ORM relations for retained tables.
 */

import { relations } from "drizzle-orm";
import { users, usernames } from "./users";
import { auditLogs, qrReports } from "./reports";
import { featureVotes } from "./platform";

export const usersRelations = relations(users, ({ many }) => ({
  usernames: many(usernames),
  qrReports: many(qrReports),
  auditLogs: many(auditLogs),
  featureVotes: many(featureVotes),
}));
