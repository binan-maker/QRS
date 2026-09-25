# Auth-only migration

This package imports legacy authentication users into Supabase Auth. It does
not migrate application data.

## Required values

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
FIREBASE_AUTH_EXPORT
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. `FIREBASE_AUTH_EXPORT` points to a
trusted Firebase Auth export JSON file and should not be committed.

## Commands

```bash
npm --prefix packages/migration run migrate:dry
npm --prefix packages/migration run migrate
```

The importer:

1. reads the local Auth export file
2. matches existing Supabase Auth users by email
3. creates or updates only Supabase Auth users
4. stores name, photo, legacy UID, and provider IDs in Auth metadata
5. reports email/password accounts that need password recovery

It never connects to Firebase and never touches Firestore, Realtime Database,
Storage, PostgreSQL application tables, scans, QR records, ownerships,
profiles, or notifications.

Firebase password hashes cannot be copied through the Supabase Admin API. Users
with email/password accounts must set a new password through the Supabase
recovery flow. Google users must use the configured Supabase Google provider.

See `SUPABASE_MIGRATION_RUNBOOK.md` for the complete operational procedure.