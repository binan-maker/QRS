/**
 * Firestore collection name constants.
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
   * follower lists, creator cards). Excludes email, push_token, consent, etc.
   * Use this whenever reading another user's data; use USERS only for the
   * currently-authenticated user's own row.
   */
  PUBLIC_PROFILES: "publicProfiles",
  /** Username → userId reservation index */
  USERNAMES: "usernames",
  /** QR code records (guard + standard links) */
  QR_CODES: "qrCodes",
  /** Shorthand collection used in some legacy paths */
  QRS: "qrs",
  /** Standard (non-guard) redirect links */
  STANDARD_LINKS: "standardLinks",
  /** Guard (fraud-protection) redirect links */
  GUARD_LINKS: "guardLinks",
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
  /** User follow graph (who a user follows) */
  FOLLOWING: "following",
  /** Followers of a user */
  FOLLOWERS: "followers",
  /** Creator-specific follower list */
  CREATOR_FOLLOWERS: "creatorFollowers",
  /** Creator-specific following list */
  CREATOR_FOLLOWING: "creatorFollowing",
  /** Aggregated counters (scans, follows, etc.) */
  COUNTERS: "counters",
  /** Per-user follow counts */
  FOLLOWER_COUNT: "followerCount",
  /** Per-user following counts */
  FOLLOWING_COUNT: "followingCount",
  /** Creator follower counts */
  CREATOR_FOLLOWER_COUNT: "creatorFollowerCount",
  /** Creator following counts */
  CREATOR_FOLLOWING_COUNT: "creatorFollowingCount",
  /** Per-user personal scan count */
  PERSONAL_SCAN_COUNT: "personalScanCount",
  /** Per-QR scan velocity (Realtime DB path) */
  SCAN_VELOCITY: "scanVelocity",
  /** Push notification records */
  NOTIFICATIONS: "notifications",
  /** Favorited QR codes per user */
  FAVORITES: "favorites",
  /** Feature flag votes */
  FEATURE_VOTES: "featureVotes",
  /** Likes on content */
  LIKES: "likes",
  /** Analytics event log */
  EVENTS: "events",
  /** Owner's own scan tracking (excluded from public counts) */
  OWNER_SCANS: "ownerScans",
  /** Blocked scan records (excluded from public counts) */
  BLOCKED_SCANS: "blockedScans",
  /** Content moderation queue */
  MODERATION_QUEUE: "moderationQueue",
  /** User feedback submissions */
  FEEDBACK: "feedback",
  /** DPDP/RBI compliance audit log (keyed by year-month) */
  AUDIT_LOGS: "auditLogs",
} as const;

export type CollectionName = (typeof COLLECTIONS)[keyof typeof COLLECTIONS];
