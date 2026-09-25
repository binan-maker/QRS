/**
 * Data collection name constants.
 *
 * ALWAYS use these constants — never write collection name strings inline.
 * A typo in a collection name creates a silent new empty collection instead
 * of erroring, making it impossible to detect at runtime.
 *
 * Usage:
 *   import { COLLECTIONS } from '@/shared/constants/collections';
 *   db.get([COLLECTIONS.USERS, uid]);
 */
export const COLLECTIONS = {
  /** Top-level user profiles — own row only (email, push_token, consent included) */
  USERS: "users",
  /**
   * Public-safe subset of user profiles for community reads (comment authors,
    * creator cards). Excludes email, push_token, consent, etc.
   * Use this whenever reading another user's data; use USERS only for the
   * currently-authenticated user's own row.
   */
  PUBLIC_PROFILES: "publicProfiles",
  /** Username → userId reservation index */
  USERNAMES: "usernames",
   /** Standard redirect links */
   STANDARD_LINKS: "standardLinks",
  /** QR/user abuse reports */
  REPORTS: "reports",
  /** Moderation report log */
  REPORT_LOG: "reportLog",
  /** Per-user personal scan count */
  PERSONAL_SCAN_COUNT: "personalScanCount",
  /** Feature flag votes */
  FEATURE_VOTES: "featureVotes",
  /** Analytics event log */
  EVENTS: "events",
  /** User feedback submissions */
  FEEDBACK: "feedback",
  /** DPDP/RBI compliance audit log (keyed by year-month) */
  AUDIT_LOGS: "auditLogs",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
