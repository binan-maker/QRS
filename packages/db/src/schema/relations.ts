/**
 * @binro/db — Drizzle ORM relations
 * All relation definitions in one file to avoid circular imports.
 * Imports from every domain schema file.
 */

import { relations } from "drizzle-orm";
import { users, usernames } from "./users";
import {
  qrCodes,
  unifiedQrs,
  guardLinks,
  guardLinkChanges,
  qrFollowers,
  userFavorites,
  userGeneratedQrs,
} from "./qr-codes";
import { qrScans } from "./scans";
import { qrComments, commentLikes, commentReports } from "./comments";
import { qrReports, auditLogs } from "./reports";
import { userFriends, creatorFollows, notifications } from "./social";
import {
  donations,
  moderationQueue,
  verificationRequests,
  featureVotes,
  businessAccounts,
} from "./platform";

export const usersRelations = relations(users, ({ many, one }) => ({
  usernames: many(usernames),
  qrCodes: many(qrCodes),
  unifiedQrs: many(unifiedQrs),
  guardLinks: many(guardLinks),
  qrScans: many(qrScans),
  qrComments: many(qrComments),
  qrReports: many(qrReports),
  qrFollowers: many(qrFollowers),
  userFavorites: many(userFavorites),
  userGeneratedQrs: many(userGeneratedQrs),
  friendsInitiated: many(userFriends, { relationName: "friendsInitiated" }),
  friendsReceived: many(userFriends, { relationName: "friendsReceived" }),
  creatorFollowsInitiated: many(creatorFollows, { relationName: "following" }),
  creatorFollowsReceived: many(creatorFollows, { relationName: "followers" }),
  notifications: many(notifications),
  donations: many(donations),
  auditLogs: many(auditLogs),
  moderationReported: many(moderationQueue, { relationName: "reporter" }),
  moderationReviewed: many(moderationQueue, { relationName: "reviewer" }),
  verificationRequests: many(verificationRequests),
  featureVotes: many(featureVotes),
  businessAccount: one(businessAccounts),
}));

export const qrCodesRelations = relations(qrCodes, ({ one, many }) => ({
  owner: one(users, { fields: [qrCodes.ownerId], references: [users.id] }),
  scans: many(qrScans),
  comments: many(qrComments),
  reports: many(qrReports),
  followers: many(qrFollowers),
  favorites: many(userFavorites),
  generatedQrs: many(userGeneratedQrs),
}));

export const unifiedQrsRelations = relations(unifiedQrs, ({ one, many }) => ({
  owner: one(users, { fields: [unifiedQrs.ownerId], references: [users.id] }),
  scans: many(qrScans),
  comments: many(qrComments),
  reports: many(qrReports),
  followers: many(qrFollowers),
  favorites: many(userFavorites),
  generatedQrs: many(userGeneratedQrs),
}));

export const guardLinksRelations = relations(guardLinks, ({ one, many }) => ({
  owner: one(users, { fields: [guardLinks.ownerId], references: [users.id] }),
  changes: many(guardLinkChanges),
  scans: many(qrScans),
}));

export const qrCommentsRelations = relations(qrComments, ({ one, many }) => ({
  qrCode: one(qrCodes, { fields: [qrComments.qrCodeId], references: [qrCodes.id] }),
  unifiedQr: one(unifiedQrs, { fields: [qrComments.unifiedQrId], references: [unifiedQrs.id] }),
  user: one(users, { fields: [qrComments.userId], references: [users.id] }),
  likes: many(commentLikes),
  reports: many(commentReports),
}));
