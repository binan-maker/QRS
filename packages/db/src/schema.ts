/**
 * @binro/db — schema entry point
 *
 * This file is kept for backward compatibility.
 * The schema has been split into domain-scoped files under ./schema/
 *
 * Domain files:
 *   ./schema/enums.ts      — all pgEnum definitions
 *   ./schema/users.ts      — users, usernames
 *   ./schema/qr-codes.ts   — qr_codes, unified_qrs, guard_links, standard_links, user_favorites, qr_followers
 *   ./schema/scans.ts      — qr_scans
 *   ./schema/comments.ts   — qr_comments, comment_likes, comment_reports
 *   ./schema/reports.ts    — qr_reports, audit_logs
 *   ./schema/social.ts     — user_friends, creator_follows, notifications
 *   ./schema/platform.ts   — categories, donations, moderation_queue, verification_requests, feature_votes, business_accounts
 *   ./schema/relations.ts  — all Drizzle ORM relations
 *   ./schema/index.ts      — barrel re-export
 */

export * from "./schema/index";
