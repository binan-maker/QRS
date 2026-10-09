/**
 * ═══════════════════════════════════════════════════════════════════════════════
 * CANONICAL DATABASE TABLES & ENTITY REGISTRY
 * ───────────────────────────────────────────────────────────────────────────────
 * Standardized database collection and relational table constants.
 *
 * Always import and use these constants — never hardcode raw table names.
 * This guarantees zero typos across queries, migrations, and repository adapters.
 *
 * Usage:
 *   import { TABLES } from '@/shared/constants';
 *   supabase.from(TABLES.USERS).select('*');
 * ═══════════════════════════════════════════════════════════════════════════════
 */

export const TABLES = {
  /** User account profiles, display names, avatars, and aggregate counts */
  USERS: "users",
  /** Unique username reservation index (handles) */
  USERNAMES: "usernames",
  /** Universal QR code registry (metadata, type, aggregate counters) */
  QR_CODES: "qr_codes",
  /** Historical scan events (platform, safety verdict, timestamps) */
  QR_SCANS: "qr_scans",
  /** Community comments and threaded notes on QR codes */
  QR_COMMENTS: "qr_comments",
  /** User upvotes and likes on specific comments */
  COMMENT_LIKES: "comment_likes",
  /** Community abuse and violation reports on comments */
  COMMENT_REPORTS: "comment_reports",
  /** Weighted scam, phishing, and fraud reports on QR codes */
  QR_REPORTS: "qr_reports",
  /** In-app and push notification message queue */
  NOTIFICATIONS: "notifications",
  /** User bug reports, exceptions, and feedback */
  FEEDBACK: "feedback",
  /** Regulatory compliance audit trails (DPDP / RBI transaction guidelines) */
  AUDIT_LOGS: "audit_logs",
  /** Community feature-flag votes */
  FEATURE_VOTES: "feature_votes",
  /** Unified vCommission & Cuelinks reward offers */
  REWARD_OFFERS: "reward_offers",
  /** Configurable daily caps and milestone rules */
  REWARD_LIMITS: "reward_limits",
  /** User reward wallet, daily milestones, and lifetime counters */
  REWARD_WALLET: "reward_wallet",
  /** Auditable reward event ledger */
  REWARD_EVENTS: "reward_events",
  /** User scratch cards (Bronze, Silver, Gold) */
  SCRATCH_CARDS: "scratch_cards",
  /** Two-sided verified user referrals */
  REFERRALS: "referrals",
} as const;

/**
 * Backward compatibility alias for legacy collection references
 */
export const COLLECTIONS = {
  USERS: TABLES.USERS,
  PUBLIC_PROFILES: "public_profiles",
  USERNAMES: TABLES.USERNAMES,
  QR_CODES: TABLES.QR_CODES,
  QRS: TABLES.QR_CODES,
  COMMENTS: TABLES.QR_COMMENTS,
  LIKES: TABLES.COMMENT_LIKES,
  SCANS: TABLES.QR_SCANS,
  EVENTS: TABLES.QR_SCANS,
  NOTIFICATIONS: TABLES.NOTIFICATIONS,
  REPORTS: TABLES.QR_REPORTS,
  COMMENT_REPORTS: TABLES.COMMENT_REPORTS,
  REPORT_LOG: "report_log",
  PERSONAL_SCAN_COUNT: "personal_scan_count",
  FEATURE_VOTES: TABLES.FEATURE_VOTES,
  FEEDBACK: TABLES.FEEDBACK,
  AUDIT_LOGS: TABLES.AUDIT_LOGS,
  COUNTERS: "counters",
  REWARD_OFFERS: TABLES.REWARD_OFFERS,
  REWARD_LIMITS: TABLES.REWARD_LIMITS,
  REWARD_WALLET: TABLES.REWARD_WALLET,
  REWARD_EVENTS: TABLES.REWARD_EVENTS,
  SCRATCH_CARDS: TABLES.SCRATCH_CARDS,
  REFERRALS: TABLES.REFERRALS,
} as const;

export type TableName = (typeof TABLES)[keyof typeof TABLES];
export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
