# BinRo — PostgreSQL Schema Reference

Migration file: `migrations/0001_firebase_mirror.sql`  
Drizzle schema: `src/schema.ts`

---

## Table of Contents

1. [Enums](#enums)
2. [Tables](#tables)
3. [Firestore → PostgreSQL Mapping](#firestore--postgresql-mapping)
4. [Design Notes](#design-notes)
5. [Running the Migration](#running-the-migration)

---

## Enums

| Enum | Values |
|---|---|
| `qr_type` | `individual`, `business`, `government` |
| `unified_qr_status` | `active`, `inactive`, `expired`, `limit_reached` |
| `friend_status` | `pending`, `friends`, `declined`, `blocked` |
| `verification_status` | `none`, `pending`, `approved`, `rejected` |
| `verification_method` | `email`, `phone`, `document`, `manual`, `none` |
| `donation_status` | `pending`, `success`, `failed`, `refunded` |
| `scan_source` | `camera`, `gallery`, `viewed` |
| `platform` | `android`, `ios`, `web`, `unknown` |
| `scan_verdict` | `safe`, `flagged`, `unknown` |
| `moderation_status` | `pending`, `reviewed`, `dismissed`, `actioned` |
| `moderation_content_type` | `qr`, `comment`, `user` |

---

## Tables

### `users`
Primary user table. `firebase_uid` stores the original Firestore doc ID for migration tracing; it is `NULL` for natively-registered PG users.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | `gen_random_uuid()` default |
| `firebase_uid` | text UNIQUE | Firestore UID — nullable |
| `email` | text UNIQUE NOT NULL | |
| `email_verified` | boolean | |
| `display_name` | text | |
| `photo_url` | text | |
| `username` | text UNIQUE | Claimed via `usernames` table |
| `username_last_changed_at` | timestamptz | |
| `is_deleted` | boolean | Soft-delete |
| `deleted_at` | timestamptz | |
| `scan_count` | integer | Denormalized counter |
| `comment_count` | integer | Denormalized counter |
| `following_count` | integer | Denormalized counter |
| `total_likes_received` | integer | Denormalized counter |
| `friends_count` | integer | Denormalized counter |
| `is_online` | boolean | Presence |
| `last_seen` | timestamptz | Presence |
| `push_token` | text | Expo push token |
| `consent` | jsonb | GDPR / privacy consent blob |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `usernames`
O(1) uniqueness checks for claimed usernames.

| Column | Type | Notes |
|---|---|---|
| `username` | text PK | |
| `user_id` | text FK→users | |
| `claimed_at` | timestamptz | |
| `is_verified` | boolean | |

---

### `qr_codes`
Legacy Firestore `qrCodes/{id}` collection.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `firebase_id` | text UNIQUE | Original Firestore doc ID |
| `content` | text | Raw QR payload |
| `content_type` | text | `url`, `upi`, `text`, `wifi`, … |
| `owner_id` | text FK→users | Nullable |
| `owner_name` | text | Denormalized |
| `qr_type` | qr_type | |
| `uuid` | text UNIQUE | Branded link UUID |
| `branded_uuid` | text | |
| `is_branded` | boolean | |
| `business_name` | text | |
| `template_key` | text | |
| `signature` | text | ECDSA P-256 |
| `is_active` | boolean | |
| `deactivation_message` | text | |
| `private_mode` | boolean | |
| `custom_logo_uri` | text | |
| `logo_position` | text | `center`, `top-left`, … |
| `display_destination` | text | Human-readable URL |
| `form_values` | jsonb | `{ value, extra }` |
| `scan_count` | integer | |
| `comment_count` | integer | |
| `owner_scan_count` | integer | Fraud guard |
| `scan_count_frozen` | boolean | Fraud guard |
| `scan_count_freeze_reason` | text | Fraud guard |
| `owner_verified` | boolean | |
| `scan_limit` | integer | |
| `expiry_date` | text | ISO date string |
| `expiry_preset` | text | `24h`, `7d`, `30d`, … |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `unified_qrs`
New QR model — Firestore `qrs/{uuid}`.  
All new QRs are created here; legacy QRs stay in `qr_codes`.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | Matches Firestore doc ID |
| `owner_id` | text FK→users | |
| `owner_name` | text | Denormalized |
| `qr_type` | qr_type | |
| `template` | text | |
| `title` | text | User-visible label |
| `is_dynamic` | boolean | Can update destination |
| `destination` | text | Resolved URL |
| `raw_destination` | text | Pre-transform value |
| `content_type` | text | |
| `business_name` | text | |
| `status` | unified_qr_status | Computed from expiry/limits |
| `scan_count` | integer | |
| `downloads` | integer | |
| `shares` | integer | |
| `scan_limit` | integer | |
| `expiry_date` | text | |
| `expiry_preset` | text | |
| `design` | jsonb | `{ fgColor, bgColor, logoPosition, logoUri, label }` |
| `form_values` | jsonb | `{ value, extra }` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `guard_links`
Legacy dynamic QR links — Firestore `guardLinks/{uuid}`.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | Matches Firestore doc ID |
| `current_destination` | text | |
| `previous_destination` | text | |
| `business_name` | text | |
| `owner_name` | text | |
| `owner_id` | text FK→users | Nullable |
| `is_active` | boolean | |
| `destination_changed_at` | timestamptz | |
| `scan_count` | integer | |
| `scan_limit` | integer | |
| `expiry_date` | text | |
| `content_type` | text | |
| `template_key` | text | |
| `created_at` | timestamptz | |

---

### `guard_link_changes`
Flattened from `guardLinks/{uuid}.changeLog[]`.

| Column | Type | Notes |
|---|---|---|
| `id` | serial PK | Auto-increment |
| `guard_link_id` | text FK→guard_links | |
| `changed_at` | timestamptz | |
| `from_destination` | text | |
| `to_destination` | text | |
| `changed_by` | text FK→users | Nullable |

---

### `standard_links`
Legacy static QR links — Firestore `standardLinks/{uuid}`.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | Matches Firestore doc ID |
| `raw_content` | text | |
| `content_type` | text | |
| `owner_name` | text | |
| `owner_id` | text FK→users | Nullable |
| `is_active` | boolean | |
| `scan_limit` | integer | |
| `scan_count` | integer | |
| `expiry_date` | text | |
| `created_at` | timestamptz | |

---

### `qr_scans`
Merged from `qrCodes/{id}/events` + `users/{uid}/scans`.  
Exactly one of `qr_code_id`, `unified_qr_id`, `guard_link_id`, `standard_link_id` is set.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `qr_code_id` | text FK→qr_codes | |
| `unified_qr_id` | text FK→unified_qrs | |
| `guard_link_id` | text FK→guard_links | |
| `standard_link_id` | text FK→standard_links | |
| `user_id` | text FK→users | Nullable for anonymous |
| `is_anonymous` | boolean | |
| `scan_source` | scan_source | |
| `platform` | platform | |
| `verdict` | scan_verdict | `safe`, `flagged`, `unknown` |
| `content` | text | Snapshot at scan time |
| `content_type` | text | Snapshot at scan time |
| `scanned_at` | timestamptz | |

---

### `qr_comments`
Firestore `qrCodes/{id}/comments/{id}`. Works for both legacy and unified QRs.  
`parent_id` is a self-reference for reply threads.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `firebase_id` | text UNIQUE | |
| `qr_code_id` | text FK→qr_codes | |
| `unified_qr_id` | text FK→unified_qrs | |
| `user_id` | text FK→users | |
| `user_name` | text | Denormalized |
| `parent_id` | text FK→qr_comments | Self-ref for replies |
| `text` | text | |
| `likes` | integer | Denormalized counter |
| `report_count` | integer | Denormalized counter |
| `is_hidden` | boolean | Moderation |
| `is_deleted` | boolean | |
| `is_pinned` | boolean | |
| `is_verified_owner` | boolean | |
| `is_edited` | boolean | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

---

### `comment_likes`
Firestore `…/comments/{id}/likes/{userId}`. Composite PK prevents duplicates.

### `comment_reports`
Firestore `…/comments/{id}/reports/{userId}`. UNIQUE on `(comment_id, user_id)`.

---

### `qr_reports`
Firestore `qrCodes/{id}/reports/{userId}` — trust reports with vote weights.  
`user_removed = true` is a soft-delete (preserves reportType/weight for Firestore rule compliance).

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `qr_code_id` | text FK→qr_codes | |
| `unified_qr_id` | text FK→unified_qrs | |
| `user_id` | text FK→users | |
| `report_type` | text | `safe`, `scam`, `spam`, `fake`, … |
| `weight` | real | Server-authoritative (0.01–2.0) |
| `account_age_days` | integer | At time of report |
| `email_verified` | boolean | At time of report |
| `user_removed` | boolean | Soft-delete |
| `removed_at` | timestamptz | |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | |

UNIQUE constraints: `(qr_code_id, user_id)` and `(unified_qr_id, user_id)`.

---

### `qr_followers`
`qrCodes/{id}/followers` + `users/{uid}/following`. UNIQUE per (qr, user) pair.

### `user_favorites`
`users/{uid}/favorites`. UNIQUE per (user, qr) pair.

### `user_generated_qrs`
`users/{uid}/generatedQrs`. Junction between a user and their QR codes.

### `user_friends`
`users/{uid}/friends`. Stored directionally; app writes the inverse row too.  
Composite PK `(user_id, friend_id)`.

### `creator_follows`
`users/{uid}/creatorFollowing`. Composite PK `(user_id, creator_id)`.

---

### `notifications`
Firebase RTDB per-user notification list. 30-day TTL enforced by app cleanup.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `user_id` | text FK→users | |
| `type` | text | `new_comment`, `friend_request`, … |
| `message` | text | |
| `qr_code_id` | text | Flexible — legacy or unified ID |
| `from_user_id` | text FK→users | |
| `from_username` | text | Denormalized |
| `is_read` | boolean | |
| `expires_at` | timestamptz | 30-day TTL |
| `created_at` | timestamptz | |

---

### `donations`
Firestore `donations/{id}` — In-app purchase donation records.

| Column | Type | Notes |
|---|---|---|
| `id` | text PK | |
| `order_id` | text UNIQUE | Store transaction ID |
| `payment_id` | text UNIQUE | Store payment ID (after success) |
| `user_id` | text FK→users | Nullable for anonymous donors |
| `amount_paise` | integer | Amount in paise (INR × 100) |
| `currency` | text | Default `INR` |
| `donor_name` | text | |
| `donor_email` | text | |
| `status` | donation_status | |
| `paid_at` | timestamptz | |
| `created_at` | timestamptz | |

---

### `categories`
Firestore `categories/{id}`. Seeded with 10 defaults.

### `audit_logs`
Firestore `auditLogs/{month}/{id}`. Security audit trail for vote weights and moderation.  
`collusion_flags` holds the `ServerCollusionAnalysis` JSON object.

### `moderation_queue`
Firestore `moderationQueue/{id}`. Content flagged for human review.

### `verification_requests`
Firestore `verificationRequests/{id}`. Business / identity verification.

### `feature_votes`
Firestore `featureVotes/{key}`. User votes on product features.

### `business_accounts`
Firestore `businessAccounts/{uid}`. One row per business user, UNIQUE on `user_id`.

---

## Firestore → PostgreSQL Mapping

| Firestore path | PostgreSQL table |
|---|---|
| `users/{uid}` | `users` |
| `usernames/{username}` | `usernames` |
| `users/{uid}/scans/{id}` | `qr_scans` |
| `users/{uid}/generatedQrs/{id}` | `user_generated_qrs` |
| `users/{uid}/following/{qrId}` | `qr_followers` |
| `users/{uid}/creatorFollowing/{id}` | `creator_follows` |
| `users/{uid}/friends/{friendId}` | `user_friends` |
| `users/{uid}/favorites/{qrId}` | `user_favorites` |
| `qrCodes/{id}` | `qr_codes` |
| `qrCodes/{id}/events/{id}` | `qr_scans` |
| `qrCodes/{id}/comments/{id}` | `qr_comments` |
| `qrCodes/{id}/comments/{id}/likes/{uid}` | `comment_likes` |
| `qrCodes/{id}/comments/{id}/reports/{uid}` | `comment_reports` |
| `qrCodes/{id}/reports/{userId}` | `qr_reports` |
| `qrCodes/{id}/followers/{userId}` | `qr_followers` |
| `qrs/{uuid}` | `unified_qrs` |
| `guardLinks/{uuid}` | `guard_links` |
| `guardLinks/{uuid}.changeLog[]` | `guard_link_changes` |
| `standardLinks/{uuid}` | `standard_links` |
| `categories/{id}` | `categories` |
| `donations/{id}` | `donations` |
| `notifications` (RTDB) | `notifications` |
| `auditLogs/{month}/{id}` | `audit_logs` |
| `moderationQueue/{id}` | `moderation_queue` |
| `verificationRequests/{id}` | `verification_requests` |
| `featureVotes/{key}` | `feature_votes` |
| `businessAccounts/{uid}` | `business_accounts` |

---

## Design Notes

### Dual-model QR support
Two QR models exist and must both be handled during data migration:
- **Legacy**: `qr_codes`, `guard_links`, `standard_links` (Firestore `qrCodes/`, `guardLinks/`, `standardLinks/`)
- **New (unified)**: `unified_qrs` (Firestore `qrs/`)

Tables that can reference either model (`qr_scans`, `qr_comments`, `qr_reports`, `qr_followers`, `user_favorites`, `user_generated_qrs`) have two nullable FK columns — exactly one is set per row.

### Firebase UID preservation
`users.firebase_uid` and `qr_codes.firebase_id` store original Firestore document IDs. This allows the data migration script to JOIN on these columns to resolve FK references during bulk import.

### Firestore arrays → relational rows
`guardLinks/{uuid}.changeLog[]` (a Firestore array) is flattened into the `guard_link_changes` table, one row per change entry.

### Denormalized counters
`users.scan_count`, `users.comment_count`, `qr_codes.scan_count`, etc. mirror Firestore denormalized counters. During data migration, populate these from the actual sub-collection counts. After migration, maintain them via application logic or PostgreSQL triggers.

### JSONB columns
| Table | Column | Shape |
|---|---|---|
| `unified_qrs` | `design` | `{ fgColor, bgColor, logoPosition, logoUri, label }` |
| `unified_qrs` | `form_values` | `{ value: string, extra: Record<string,string> }` |
| `qr_codes` | `form_values` | Same as above |
| `audit_logs` | `collusion_flags` | `ServerCollusionAnalysis` |
| `verification_requests` | `documents` | `string[]` (storage paths) |
| `users` | `consent` | GDPR consent blob |
| `feature_votes` | `value` | Free-form vote payload |

### Vote weight
`qr_reports.weight` stores the server-authoritative vote weight (0.01–2.0) calculated by `apps/api/src/services/server-verify-service.ts` at submission time. This is intentionally denormalized so historical weights are preserved even if tier config changes.

---

## Running the Migration

```bash
# 1. Set DATABASE_URL
export DATABASE_URL="postgresql://user:pass@host:5432/binro"

# 2. Run the raw SQL migration (idempotent — safe to inspect first)
psql $DATABASE_URL -f packages/db/migrations/0001_firebase_mirror.sql

# 3. Or use drizzle-kit (generates and tracks migrations via _drizzle_migrations)
cd packages/db
npm run db:push        # push schema diff to connected DB
# or
npx drizzle-kit migrate  # apply tracked migration files
```

> **Data migration is a separate step.** This file only creates the schema.  
> See the planned data migration task for the Firestore → PostgreSQL ETL scripts.
