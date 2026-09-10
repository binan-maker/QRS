# @binro/migration — Firebase → Supabase Migration

Complete migration package for moving BinRo from Firebase/Firestore to Supabase/PostgreSQL.

## Structure

```
packages/migration/
├── db/
│   ├── 001_schema.sql      — Full schema (idempotent, safe to re-run)
│   ├── 002_rls.sql         — Row Level Security policies for every table
│   ├── 003_triggers.sql    — updated_at triggers + notification TTL cleanup
│   └── 004_storage.sql     — Supabase Storage buckets + storage RLS
├── data/
│   ├── migrate.ts          — Main Firebase → Supabase data migration script
│   └── migrate-storage.ts  — Firebase Storage → Supabase Storage migration
└── README.md
```

## Prerequisites

| Secret | Where to get it |
|---|---|
| `SUPABASE_URL` | Supabase → Settings → API → Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API → service_role secret |
| `DATABASE_URL` | Supabase → Settings → Database → Connection string (URI, Session mode, port 5432) |
| `FIREBASE_SERVICE_ACCOUNT` | Firebase Console → Project Settings → Service Accounts → Generate new private key (paste raw JSON) |

## Step 1 — Apply the Schema

Paste **all four SQL files** into the Supabase SQL Editor in order, or run them via `psql`:

```bash
# Using psql (set DATABASE_URL first)
psql "$DATABASE_URL" -f packages/migration/db/001_schema.sql
psql "$DATABASE_URL" -f packages/migration/db/002_rls.sql
psql "$DATABASE_URL" -f packages/migration/db/003_triggers.sql
psql "$DATABASE_URL" -f packages/migration/db/004_storage.sql
```

All files are **idempotent** — safe to run multiple times.

## Step 2 — Migrate Data from Firebase

```bash
# Set required env vars first, then:
npx tsx packages/migration/data/migrate.ts
```

The script is also idempotent — existing rows are skipped on conflict.

### Migration order

1. Firebase Auth users → Supabase Auth + `users` table
2. `usernames` collection → `usernames` table
3. `qrCodes` → `qr_codes`
4. `qrs` → `unified_qrs`
5. `guardLinks` → `guard_links` + `guard_link_changes`
6. `standardLinks` → `standard_links`
7. `userFavorites` → `user_favorites`
8. `businessAccounts` → `business_accounts`
9. `donations` → `donations`
10. `qrCodes/*/comments` → `qr_comments`
11. `qrCodes/*/reports` → `qr_reports`
12. `auditLogs` → `audit_logs`
13. `moderationQueue` → `moderation_queue`
14. `verificationRequests` → `verification_requests`
15. `featureVotes` → `feature_votes`
16. RTDB `notifications` → `notifications`

## Step 3 — Migrate Storage Files

```bash
npx tsx packages/migration/data/migrate-storage.ts
```

Moves Firebase Storage avatar and QR logo files into Supabase Storage buckets.

## Firestore → PostgreSQL Collection Map

| Firestore collection | PostgreSQL table |
|---|---|
| `users/{uid}` | `users` |
| `usernames/{username}` | `usernames` |
| `qrCodes/{id}` | `qr_codes` |
| `qrCodes/{id}/comments/{id}` | `qr_comments` |
| `qrCodes/{id}/reports/{uid}` | `qr_reports` |
| `qrs/{uuid}` | `unified_qrs` |
| `guardLinks/{uuid}` | `guard_links` |
| `guardLinks/{uuid}.changeLog[]` | `guard_link_changes` |
| `standardLinks/{uuid}` | `standard_links` |
| `donations/{id}` | `donations` |
| `auditLogs/{month}/{id}` | `audit_logs` |
| `moderationQueue/{id}` | `moderation_queue` |
| `verificationRequests/{id}` | `verification_requests` |
| `featureVotes/{key}` | `feature_votes` |
| `businessAccounts/{uid}` | `business_accounts` |
| `users/{uid}/generatedQrs/{id}` | `user_generated_qrs` |
| `users/{uid}/favorites/{qrId}` | `user_favorites` |
| `users/{uid}/friends/{friendId}` | `user_friends` |
| RTDB `notifications/{uid}` | `notifications` |
| RTDB `qrScanVelocity` | *(not migrated — ephemeral rate-limit data)* |
| RTDB `blockedScans` | *(not migrated — ephemeral fraud-guard data)* |
