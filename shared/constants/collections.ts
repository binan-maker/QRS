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
   /** QR code records */
  QR_CODES: "qrCodes",
  /** Shorthand collection used in some legacy paths */
  QRS: "qrs",
   /** Standard redirect links */
   STANDARD_LINKS: "standardLinks",
  /** Per-QR scan history records */
  SCANS: "scans",
  /** AI-generated QR codes */
  GENERATED_QRS: "generatedQrs",
  /** QR/user abuse reports */
  REPORTS: "reports",
  /** Moderation report log */
  REPORT_LOG: "reportLog",
  /** Comments on QR codes */
  COMMENTS: "comments",
  /** Aggregated counters (scans, follows, etc.) */
  COUNTERS: "counters",
  /** Per-user personal scan count */
  PERSONAL_SCAN_COUNT: "personalScanCount",
  /** Push notification records */
  NOTIFICATIONS: "notifications",
  /** Feature flag votes */
  FEATURE_VOTES: "featureVotes",
  /** Likes on content */
  LIKES: "likes",
  /** Analytics event log */
  EVENTS: "events",
  /** Owner's own scan tracking (excluded from public counts) */
  OWNER_SCANS: "ownerScans",
  /** Content moderation queue */
  MODERATION_QUEUE: "moderationQueue",
  /** User feedback submissions */
  FEEDBACK: "feedback",
  /** DPDP/RBI compliance audit log (keyed by year-month) */
  AUDIT_LOGS: "auditLogs",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
