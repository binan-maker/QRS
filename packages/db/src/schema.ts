/**
 * @binro/db — schema entry point
 *
 * This file is kept for backward compatibility.
 * The schema has been split into domain-scoped files under ./schema/
 *
 * Domain files:
 *   ./schema/enums.ts      — all pgEnum definitions
 *   ./schema/users.ts      — users, usernames
 *   ./schema/qr-codes.ts   — standard_links
 *   ./schema/reports.ts    — qr_reports, audit_logs
 *   ./schema/platform.ts   — categories, feature_votes
 *   ./schema/relations.ts  — all Drizzle ORM relations
 *   ./schema/index.ts      — barrel re-export
 */

export * from "./schema/index";
