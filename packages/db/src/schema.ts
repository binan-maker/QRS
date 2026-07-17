/**
 * @binro/db — PostgreSQL schema (Drizzle ORM)
 *
 * Mirrors every Firebase / Firestore collection used by BinRo.
 * Firestore sub-collections are flattened into regular tables with FK references.
 * Nested objects (design, formValues, changeLog) use JSONB.
 *
 * Collection → Table mapping
 * ─────────────────────────────────────────────────────────────────────────────
 * users/{uid}                        → users
 * usernames/{username}               → usernames
 * users/{uid}/scans/{id}             → qr_scans          (merged w/ qrCodes events)
 * users/{uid}/generatedQrs/{id}      → user_generated_qrs
 * users/{uid}/following/{qrId}       → qr_followers       (same table, different FK)
 * users/{uid}/creatorFollowing/{id}  → creator_follows
 * users/{uid}/friends/{friendId}     → user_friends
 * users/{uid}/favorites/{qrId}       → user_favorites
 * qrCodes/{id}                       → qr_codes          (legacy QR model)
 * qrCodes/{id}/events/{id}           → qr_scans
 * qrCodes/{id}/comments/{id}         → qr_comments
 * qrCodes/{id}/comments/{id}/likes   → comment_likes
 * qrCodes/{id}/comments/{id}/reports → comment_reports
 * qrCodes/{id}/reports/{userId}      → qr_reports
 * qrCodes/{id}/followers/{userId}    → qr_followers
 * qrs/{uuid}                         → unified_qrs       (new QR model)
 * guardLinks/{uuid}                  → guard_links       (legacy dynamic QRs)
 * guardLinks/{uuid}.changeLog[]      → guard_link_changes (flattened)
 * standardLinks/{uuid}               → standard_links    (legacy static QRs)
 * categories/{id}                    → categories
 * donations/{id}                     → donations
 * notifications (per-user RTDB)      → notifications
 * auditLogs/{month}/{id}             → audit_logs
 * moderationQueue/{id}               → moderation_queue
 * verificationRequests/{id}          → verification_requests
 * featureVotes/{key}                 → feature_votes
 * businessAccounts/{uid}             → business_accounts
 */

import { sql, relations } from "drizzle-orm";
import {
  pgTable,
  pgEnum,
  text,
  varchar,
  timestamp,
  integer,
  bigint,
  boolean,
  real,
  jsonb,
  primaryKey,
  uniqueIndex,
  index,
  serial,
} from "drizzle-orm/pg-core";

// ─── Enums ────────────────────────────────────────────────────────────────────

export const qrTypeEnum = pgEnum("qr_type", [
  "individual",
  "business",
  "government",
]);

export const unifiedQrStatusEnum = pgEnum("unified_qr_status", [
  "active",
  "inactive",
  "expired",
  "limit_reached",
]);

export const friendStatusEnum = pgEnum("friend_status", [
  "pending",
  "friends",
  "declined",
  "blocked",
]);

export const verificationStatusEnum = pgEnum("verification_status", [
  "none",
  "pending",
  "approved",
  "rejected",
]);

export const verificationMethodEnum = pgEnum("verification_method", [
  "email",
  "phone",
  "document",
  "manual",
  "none",
]);

export const donationStatusEnum = pgEnum("donation_status", [
  "pending",
  "success",
  "failed",
  "refunded",
]);

export const scanSourceEnum = pgEnum("scan_source", [
  "camera",
  "gallery",
  "viewed",
]);

export const platformEnum = pgEnum("platform", [
  "android",
  "ios",
  "web",
  "unknown",
]);

export const scanVerdictEnum = pgEnum("scan_verdict", [
  "safe",
  "flagged",
  "unknown",
]);

export const moderationStatusEnum = pgEnum("moderation_status", [
  "pending",
  "reviewed",
  "dismissed",
  "actioned",
]);

export const moderationContentTypeEnum = pgEnum("moderation_content_type", [
  "qr",
  "comment",
  "user",
]);

// ─── Users ────────────────────────────────────────────────────────────────────
// Source: users/{userId}
// firebase_uid stores the original Firestore document ID for migration tracing.

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
    // Denormalized counters — kept in sync by triggers or app logic
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
// Source: usernames/{username}
// Separate table for O(1) uniqueness checks and claim history.

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

// ─── Legacy QR Codes ─────────────────────────────────────────────────────────
// Source: qrCodes/{qrId}
// The original QR code model. The new model is unified_qrs.
// firebaseId preserves the Firestore document ID during migration.

export const qrCodes = pgTable(
  "qr_codes",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    /** Original Firestore document ID. */
    firebaseId: text("firebase_id").unique(),
    content: text("content").notNull(),
    contentType: text("content_type").notNull().default("text"),
    ownerId: text("owner_id").references(() => users.id, { onDelete: "set null" }),
    ownerName: text("owner_name").notNull().default(""),
    qrType: qrTypeEnum("qr_type").notNull().default("individual"),
    /** UUID used in branded QR links. */
    uuid: text("uuid").unique(),
    brandedUuid: text("branded_uuid"),
    isBranded: boolean("is_branded").notNull().default(false),
    businessName: text("business_name"),
    templateKey: text("template_key"),
    /** ECDSA P-256 signature of (content + ownerName). */
    signature: text("signature"),
    isActive: boolean("is_active").notNull().default(true),
    deactivationMessage: text("deactivation_message"),
    privateMode: boolean("private_mode").notNull().default(false),
    customLogoUri: text("custom_logo_uri"),
    logoPosition: text("logo_position").default("center"),
    displayDestination: text("display_destination"),
    formValues: jsonb("form_values"),
    // Counters
    scanCount: integer("scan_count").notNull().default(0),
    commentCount: integer("comment_count").notNull().default(0),
    ownerScanCount: integer("owner_scan_count").notNull().default(0),
    // Fraud guard
    scanCountFrozen: boolean("scan_count_frozen").notNull().default(false),
    scanCountFreezeReason: text("scan_count_freeze_reason"),
    ownerVerified: boolean("owner_verified").notNull().default(false),
    // Limits
    scanLimit: integer("scan_limit"),
    expiryDate: text("expiry_date"),
    expiryPreset: text("expiry_preset"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerIdx: index("qr_codes_owner_id_idx").on(t.ownerId),
    contentTypeIdx: index("qr_codes_content_type_idx").on(t.contentType),
    uuidIdx: index("qr_codes_uuid_idx").on(t.uuid),
    firebaseIdIdx: index("qr_codes_firebase_id_idx").on(t.firebaseId),
  }),
);

// ─── Unified QRs (new model) ──────────────────────────────────────────────────
// Source: qrs/{uuid}
// All new QRs are created here. Legacy QRs live in qr_codes.

export const unifiedQrs = pgTable(
  "unified_qrs",
  {
    /** Matches the Firestore document ID (a nanoid / UUID). */
    id: text("id").primaryKey(),
    ownerId: text("owner_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    ownerName: text("owner_name").notNull(),
    qrType: qrTypeEnum("qr_type").notNull().default("individual"),
    template: text("template"),
    title: text("title"),
    isDynamic: boolean("is_dynamic").notNull().default(false),
    destination: text("destination").notNull(),
    rawDestination: text("raw_destination").notNull(),
    contentType: text("content_type").notNull().default("text"),
    businessName: text("business_name"),
    status: unifiedQrStatusEnum("status").notNull().default("active"),
    // Counters
    scanCount: integer("scan_count").notNull().default(0),
    downloads: integer("downloads").notNull().default(0),
    shares: integer("shares").notNull().default(0),
    // Limits
    scanLimit: integer("scan_limit"),
    expiryDate: text("expiry_date"),
    expiryPreset: text("expiry_preset"),
    /** { fgColor, bgColor, logoPosition, logoUri, label } */
    design: jsonb("design").notNull().default(sql`'{"fgColor":"#0A0E17","bgColor":"#F8FAFC","logoPosition":"center","logoUri":null,"label":null}'::jsonb`),
    /** { value: string, extra: Record<string,string> } */
    formValues: jsonb("form_values"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerIdx: index("unified_qrs_owner_id_idx").on(t.ownerId),
    statusIdx: index("unified_qrs_status_idx").on(t.status),
    contentTypeIdx: index("unified_qrs_content_type_idx").on(t.contentType),
    createdAtIdx: index("unified_qrs_created_at_idx").on(t.createdAt),
  }),
);

// ─── Guard Links (legacy dynamic QRs) ────────────────────────────────────────
// Source: guardLinks/{uuid}
// Dynamic redirect QRs that pre-date the unified model.

export const guardLinks = pgTable(
  "guard_links",
  {
    /** Matches Firestore document ID. */
    id: text("id").primaryKey(),
    currentDestination: text("current_destination").notNull(),
    previousDestination: text("previous_destination"),
    businessName: text("business_name"),
    ownerName: text("owner_name").notNull(),
    ownerId: text("owner_id").references(() => users.id, { onDelete: "set null" }),
    isActive: boolean("is_active").notNull().default(true),
    destinationChangedAt: timestamp("destination_changed_at", { withTimezone: true }),
    scanCount: integer("scan_count").notNull().default(0),
    scanLimit: integer("scan_limit"),
    expiryDate: text("expiry_date"),
    contentType: text("content_type"),
    templateKey: text("template_key"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    ownerIdx: index("guard_links_owner_id_idx").on(t.ownerId),
  }),
);

// ─── Guard Link Change Log ────────────────────────────────────────────────────
// Source: guardLinks/{uuid}.changeLog[] (Firestore array → relational rows)

export const guardLinkChanges = pgTable(
  "guard_link_changes",
  {
    id: serial("id").primaryKey(),
    guardLinkId: text("guard_link_id")
      .notNull()
      .references(() => guardLinks.id, { onDelete: "cascade" }),
    changedAt: timestamp("changed_at", { withTimezone: true }).notNull(),
    fromDestination: text("from_destination").notNull(),
    toDestination: text("to_destination").notNull(),
    changedBy: text("changed_by").references(() => users.id, { onDelete: "set null" }),
  },
  (t) => ({
    guardLinkIdx: index("guard_link_changes_guard_link_id_idx").on(t.guardLinkId),
  }),
);

// ─── Standard Links (legacy static QRs) ──────────────────────────────────────
// Source: standardLinks/{uuid}

export const standardLinks = pgTable(
  "standard_links",
  {
    /** Matches Firestore document ID. */
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

// ─── QR Scans ─────────────────────────────────────────────────────────────────
// Source: qrCodes/{id}/events/{id} + users/{uid}/scans/{id}
// Exactly one of qr_code_id / unified_qr_id / guard_link_id / standard_link_id is set.

export const qrScans = pgTable(
  "qr_scans",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    // QR references (only one should be set per scan)
    qrCodeId: text("qr_code_id").references(() => qrCodes.id, { onDelete: "set null" }),
    unifiedQrId: text("unified_qr_id").references(() => unifiedQrs.id, { onDelete: "set null" }),
    guardLinkId: text("guard_link_id").references(() => guardLinks.id, { onDelete: "set null" }),
    standardLinkId: text("standard_link_id").references(() => standardLinks.id, { onDelete: "set null" }),
    // Scanner identity
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    isAnonymous: boolean("is_anonymous").notNull().default(false),
    // Scan metadata
    scanSource: scanSourceEnum("scan_source"),
    platform: platformEnum("platform").notNull().default("unknown"),
    verdict: scanVerdictEnum("verdict").notNull().default("unknown"),
    // Content snapshot (captured at scan time, since destination can change)
    content: text("content"),
    contentType: text("content_type"),
    scannedAt: timestamp("scanned_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    qrCodeIdx: index("qr_scans_qr_code_id_idx").on(t.qrCodeId),
    unifiedQrIdx: index("qr_scans_unified_qr_id_idx").on(t.unifiedQrId),
    userIdx: index("qr_scans_user_id_idx").on(t.userId),
    scannedAtIdx: index("qr_scans_scanned_at_idx").on(t.scannedAt),
  }),
);

// ─── QR Comments ─────────────────────────────────────────────────────────────
// Source: qrCodes/{id}/comments/{id}
// Supports both legacy (qr_code_id) and new (unified_qr_id) QRs.
// Self-referential parentId supports reply threads.

export const qrComments = pgTable(
  "qr_comments",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    /** Original Firestore document ID. */
    firebaseId: text("firebase_id").unique(),
    qrCodeId: text("qr_code_id").references(() => qrCodes.id, { onDelete: "cascade" }),
    unifiedQrId: text("unified_qr_id").references(() => unifiedQrs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** Denormalized for display — keep in sync with users.display_name. */
    userName: text("user_name").notNull(),
    parentId: text("parent_id"), // self-ref added via migration ALTER after table creation
    text: text("text").notNull(),
    // Denormalized counters
    likes: integer("likes").notNull().default(0),
    reportCount: integer("report_count").notNull().default(0),
    // Moderation flags
    isHidden: boolean("is_hidden").notNull().default(false),
    isDeleted: boolean("is_deleted").notNull().default(false),
    isPinned: boolean("is_pinned").notNull().default(false),
    isVerifiedOwner: boolean("is_verified_owner").notNull().default(false),
    isEdited: boolean("is_edited").notNull().default(false),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    qrCodeIdx: index("qr_comments_qr_code_id_idx").on(t.qrCodeId),
    unifiedQrIdx: index("qr_comments_unified_qr_id_idx").on(t.unifiedQrId),
    userIdx: index("qr_comments_user_id_idx").on(t.userId),
    parentIdx: index("qr_comments_parent_id_idx").on(t.parentId),
    createdAtIdx: index("qr_comments_created_at_idx").on(t.createdAt),
  }),
);

// ─── Comment Likes ────────────────────────────────────────────────────────────
// Source: qrCodes/{id}/comments/{id}/likes/{userId}

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
  (t) => ({
    pk: primaryKey({ columns: [t.commentId, t.userId] }),
    userIdx: index("comment_likes_user_id_idx").on(t.userId),
  }),
);

// ─── Comment Reports ──────────────────────────────────────────────────────────
// Source: qrCodes/{id}/comments/{id}/reports/{userId}

export const commentReports = pgTable(
  "comment_reports",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    commentId: text("comment_id")
      .notNull()
      .references(() => qrComments.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reason: text("reason").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    commentIdx: index("comment_reports_comment_id_idx").on(t.commentId),
    uniq: uniqueIndex("comment_reports_comment_user_uniq").on(t.commentId, t.userId),
  }),
);

// ─── QR Trust Reports ─────────────────────────────────────────────────────────
// Source: qrCodes/{id}/reports/{userId}
// One row per (qr, user) pair. user_removed=true means the user withdrew their report.
// The weight field is the server-authoritative vote weight at submission time.

export const qrReports = pgTable(
  "qr_reports",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    qrCodeId: text("qr_code_id").references(() => qrCodes.id, { onDelete: "cascade" }),
    unifiedQrId: text("unified_qr_id").references(() => unifiedQrs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    reportType: text("report_type").notNull(),
    /** Server-authoritative vote weight (0.01–2.0, calculated from account tier). */
    weight: real("weight").notNull().default(0.1),
    accountAgeDays: integer("account_age_days").notNull().default(0),
    emailVerified: boolean("email_verified").notNull().default(false),
    /** Soft-delete: user toggled the report off. */
    userRemoved: boolean("user_removed").notNull().default(false),
    removedAt: timestamp("removed_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    qrCodeUserUniq: uniqueIndex("qr_reports_qr_code_user_uniq").on(t.qrCodeId, t.userId),
    unifiedQrUserUniq: uniqueIndex("qr_reports_unified_qr_user_uniq").on(t.unifiedQrId, t.userId),
    qrCodeIdx: index("qr_reports_qr_code_id_idx").on(t.qrCodeId),
    unifiedQrIdx: index("qr_reports_unified_qr_id_idx").on(t.unifiedQrId),
    userIdx: index("qr_reports_user_id_idx").on(t.userId),
  }),
);

// ─── QR Followers ─────────────────────────────────────────────────────────────
// Source: qrCodes/{id}/followers/{userId} + users/{uid}/following/{qrId}

export const qrFollowers = pgTable(
  "qr_followers",
  {
    qrCodeId: text("qr_code_id").references(() => qrCodes.id, { onDelete: "cascade" }),
    unifiedQrId: text("unified_qr_id").references(() => unifiedQrs.id, { onDelete: "cascade" }),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followedAt: timestamp("followed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    legacyPk: uniqueIndex("qr_followers_legacy_uniq").on(t.qrCodeId, t.userId),
    unifiedPk: uniqueIndex("qr_followers_unified_uniq").on(t.unifiedQrId, t.userId),
    userIdx: index("qr_followers_user_id_idx").on(t.userId),
  }),
);

// ─── User Favorites ───────────────────────────────────────────────────────────
// Source: users/{uid}/favorites/{qrId}

export const userFavorites = pgTable(
  "user_favorites",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    qrCodeId: text("qr_code_id").references(() => qrCodes.id, { onDelete: "cascade" }),
    unifiedQrId: text("unified_qr_id").references(() => unifiedQrs.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    legacyPk: uniqueIndex("user_favorites_legacy_uniq").on(t.userId, t.qrCodeId),
    unifiedPk: uniqueIndex("user_favorites_unified_uniq").on(t.userId, t.unifiedQrId),
    userIdx: index("user_favorites_user_id_idx").on(t.userId),
  }),
);

// ─── User Generated QRs ───────────────────────────────────────────────────────
// Source: users/{uid}/generatedQrs/{id}
// Junction between a user and their QR codes (both legacy and unified models).

export const userGeneratedQrs = pgTable(
  "user_generated_qrs",
  {
    /** Firestore document ID within the sub-collection. */
    id: text("id").primaryKey(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    qrCodeId: text("qr_code_id").references(() => qrCodes.id, { onDelete: "set null" }),
    unifiedQrId: text("unified_qr_id").references(() => unifiedQrs.id, { onDelete: "set null" }),
    name: text("name"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("user_generated_qrs_user_id_idx").on(t.userId),
  }),
);

// ─── User Friends ─────────────────────────────────────────────────────────────
// Source: users/{uid}/friends/{friendId}
// Stored as one-directional rows; the inverse is written separately by the app.

export const userFriends = pgTable(
  "user_friends",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    friendId: text("friend_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: friendStatusEnum("status").notNull().default("pending"),
    addedAt: timestamp("added_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.friendId] }),
    friendIdx: index("user_friends_friend_id_idx").on(t.friendId),
    statusIdx: index("user_friends_status_idx").on(t.status),
  }),
);

// ─── Creator Follows ──────────────────────────────────────────────────────────
// Source: users/{uid}/creatorFollowing/{creatorId}

export const creatorFollows = pgTable(
  "creator_follows",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    creatorId: text("creator_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followedAt: timestamp("followed_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    pk: primaryKey({ columns: [t.userId, t.creatorId] }),
    creatorIdx: index("creator_follows_creator_id_idx").on(t.creatorId),
  }),
);

// ─── Notifications ────────────────────────────────────────────────────────────
// Source: Firebase RTDB per-user notification list
// TTL: 30 days (enforced by app-level cleanup).

export const notifications = pgTable(
  "notifications",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: text("type").notNull(),
    message: text("message").notNull(),
    qrCodeId: text("qr_code_id"),
    fromUserId: text("from_user_id").references(() => users.id, { onDelete: "set null" }),
    fromUsername: text("from_username"),
    isRead: boolean("is_read").notNull().default(false),
    /** App enforces 30-day TTL. */
    expiresAt: timestamp("expires_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("notifications_user_id_idx").on(t.userId),
    userReadIdx: index("notifications_user_read_idx").on(t.userId, t.isRead),
    createdAtIdx: index("notifications_created_at_idx").on(t.createdAt),
  }),
);

// ─── Donations ────────────────────────────────────────────────────────────────
// Source: donations/{id}

export const donations = pgTable(
  "donations",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    /** Razorpay order ID. */
    orderId: text("order_id").notNull().unique(),
    /** Razorpay payment ID (populated after successful payment). */
    paymentId: text("payment_id").unique(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    /** Amount in the smallest currency unit (paise for INR). */
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

// ─── Categories ───────────────────────────────────────────────────────────────
// Source: categories/{id}

export const categories = pgTable(
  "categories",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    name: text("name").notNull(),
    slug: text("slug").notNull().unique(),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
);

// ─── Audit Logs ───────────────────────────────────────────────────────────────
// Source: auditLogs/{monthPrefix}/{id}
// Security audit trail for vote weight, trust report, and moderation actions.

export const auditLogs = pgTable(
  "audit_logs",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    /** Flexible QR reference — may be legacy or unified ID. */
    qrId: text("qr_id"),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    action: text("action").notNull(),
    voteWeight: real("vote_weight"),
    accountTier: integer("account_tier"),
    accountAgeDays: integer("account_age_days"),
    emailVerified: boolean("email_verified"),
    /** Server collusion analysis result (suspicious flag, multipliers, etc.). */
    collusionFlags: jsonb("collusion_flags"),
    createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => ({
    userIdx: index("audit_logs_user_id_idx").on(t.userId),
    qrIdx: index("audit_logs_qr_id_idx").on(t.qrId),
    createdAtIdx: index("audit_logs_created_at_idx").on(t.createdAt),
  }),
);

// ─── Moderation Queue ─────────────────────────────────────────────────────────
// Source: moderationQueue/{id}

export const moderationQueue = pgTable(
  "moderation_queue",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    contentType: moderationContentTypeEnum("content_type").notNull(),
    /** ID of the QR / comment / user being reviewed. */
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
// Source: verificationRequests/{id}

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
    /** Array of uploaded document URLs / storage paths. */
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
// Source: featureVotes/{key}

export const featureVotes = pgTable(
  "feature_votes",
  {
    id: text("id").primaryKey().default(sql`gen_random_uuid()`),
    /** The feature key (e.g. "dark_mode", "batch_qr"). */
    featureKey: text("feature_key").notNull(),
    userId: text("user_id").references(() => users.id, { onDelete: "set null" }),
    /** Vote value or free-form feedback payload. */
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
// Source: businessAccounts/{uid}

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

// ─── Relations ────────────────────────────────────────────────────────────────

export const usersRelations = relations(users, ({ many, one }) => ({
  usernames: many(usernames),
  qrCodes: many(qrCodes),
  unifiedQrs: many(unifiedQrs),
  guardLinks: many(guardLinks),
  standardLinks: many(standardLinks),
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

// ─── Inferred Types ───────────────────────────────────────────────────────────

export type User = typeof users.$inferSelect;
export type NewUser = typeof users.$inferInsert;
export type Username = typeof usernames.$inferSelect;
export type QrCode = typeof qrCodes.$inferSelect;
export type NewQrCode = typeof qrCodes.$inferInsert;
export type UnifiedQr = typeof unifiedQrs.$inferSelect;
export type NewUnifiedQr = typeof unifiedQrs.$inferInsert;
export type GuardLink = typeof guardLinks.$inferSelect;
export type StandardLink = typeof standardLinks.$inferSelect;
export type GuardLinkChange = typeof guardLinkChanges.$inferSelect;
export type QrScan = typeof qrScans.$inferSelect;
export type NewQrScan = typeof qrScans.$inferInsert;
export type QrComment = typeof qrComments.$inferSelect;
export type NewQrComment = typeof qrComments.$inferInsert;
export type CommentLike = typeof commentLikes.$inferSelect;
export type CommentReport = typeof commentReports.$inferSelect;
export type QrReport = typeof qrReports.$inferSelect;
export type NewQrReport = typeof qrReports.$inferInsert;
export type QrFollower = typeof qrFollowers.$inferSelect;
export type UserFavorite = typeof userFavorites.$inferSelect;
export type UserGeneratedQr = typeof userGeneratedQrs.$inferSelect;
export type UserFriend = typeof userFriends.$inferSelect;
export type CreatorFollow = typeof creatorFollows.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type NewNotification = typeof notifications.$inferInsert;
export type Donation = typeof donations.$inferSelect;
export type Category = typeof categories.$inferSelect;
export type AuditLog = typeof auditLogs.$inferSelect;
export type ModerationQueueItem = typeof moderationQueue.$inferSelect;
export type VerificationRequest = typeof verificationRequests.$inferSelect;
export type FeatureVote = typeof featureVotes.$inferSelect;
export type BusinessAccount = typeof businessAccounts.$inferSelect;
