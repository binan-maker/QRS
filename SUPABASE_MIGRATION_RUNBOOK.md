# BinRo: Firebase to Supabase migration runbook

This is the complete operational sequence for moving BinRo from Firebase to
Supabase. The repository contains the code and migration scripts, but the
database and authentication cutover cannot be completed from code alone.

## 0. Important migration facts

1. Do not delete Firebase until the verification section passes.
2. Supabase client values are public:
   - project URL
   - anon/public key
3. Supabase server values are secrets:
   - service-role key
   - Postgres connection string
4. `FIREBASE_SERVICE_ACCOUNT` is needed only while reading the old Firebase
   project.
5. Firebase password hashes are not copied by the current script. Email/password
   users must reset their password in Supabase after migration.
6. Firebase Google provider records are recorded in Supabase user metadata, but
   OAuth identities are not automatically linked. Test Google login and decide
   how existing Google users will re-link before cutover.
7. Keep a backup/export of Firebase data and Storage files until the new system
   has been verified in production.

## 1. Create the Supabase project

1. Open `https://supabase.com` and create or sign in to your account.
2. Select **New project**.v
3. Choose the organization.
4. Use a project name such as `binro-production`.
5. Set a strong database password and store it in a password manager. Do not
   commit it to the repository.
6. Choose a region close to the majority of users. The app currently defaults
   its informational region to `ap-south-1`; choose the closest available
   Supabase region and keep the choice documented.
7. Wait until the project finishes provisioning.
8. Open **Project Settings → API** and copy:
   - **Project URL** 
   - **Publishable/anon key**
   - **service_role key** (keep this server-only)
9. Open **Project Settings → Database → Connection string**.
10. Select **URI** and **Session pooler / port 5432**. Copy the URI and replace
    the password placeholder with the database password. This becomes
    `DATABASE_URL`.

## 2. Configure Supabase Auth

Open **Authentication → Providers**:

### Email

1. Enable Email provider.
2. Decide whether email confirmation is required. Keep it enabled for
   production.
3. Configure the SMTP provider under **Authentication → SMTP Settings** before
   production. The built-in email service is for low-volume development only.
4. Set the password minimum to match the app's policy.

### Google

1. Enable the Google provider.
2. In Google Cloud Console, create or select the OAuth web client.
3. Add the Supabase callback URL shown in the provider form to Google Cloud's
   authorized redirect URIs.
4. Add the web and mobile client IDs/secrets as requested by Supabase.
5. Add the final web URL and mobile deep-link URL under
   **Authentication → URL Configuration**.
6. For local development, add the Replit preview URL and local callback URL
   only when needed. Remove temporary URLs before production.

The exact callback URL is displayed by Supabase in the Google provider screen;
copy that value instead of constructing it manually.

## 3. Apply the database schema and security

Use **SQL Editor → New query**. Run the files in this exact order:

```bash
psql "$DATABASE_URL" -f packages/migration/db/001_schema.sql
psql "$DATABASE_URL" -f packages/migration/db/002_rls.sql
psql "$DATABASE_URL" -f packages/migration/db/003_triggers.sql
psql "$DATABASE_URL" -f packages/migration/db/004_storage.sql
psql "$DATABASE_URL" -f packages/migration/db/005_runtime.sql
```

If using the dashboard, open each file, paste its complete contents into a
separate SQL Editor query, and run them in the same order.

After each file:

1. Confirm the query completed without an error.
2. Open **Table Editor** and confirm the tables exist.
3. Open **Database → Functions** and confirm `increment_field` exists after
   `005_runtime.sql`.
4. Confirm RLS is enabled on the application tables.

The schema keeps `firebase_uid` and `firebase_id` columns as migration
cross-reference fields. Do not remove those columns until reconciliation and
rollback are no longer needed.

## 4. Configure Storage

The `004_storage.sql` file creates:

| Bucket | Visibility | Purpose |
|---|---|---|
| `avatars` | Public | Profile photos |
| `qr-logos` | Public | QR logo images shown on scan pages |
| `verification-docs` | Private | Verification/KYC documents |

In **Storage**, confirm all three buckets exist. Confirm:

1. A signed-in user can upload only inside their own user-ID folder.
2. Public avatar and QR logo URLs load.
3. Verification documents are not publicly readable.
4. The service role can read and write migration files.

The migration maps:

```text
users/{firebaseUid}/avatar.ext
  -> avatars/{supabaseUserId}/avatar.ext

qrCodes/{firebaseQrId}/logo.ext
  -> qr-logos/{supabaseOwnerId}/{postgresQrId}/logo.ext

verification/{firebaseUid}/...
  -> verification-docs/{supabaseUserId}/...
```

## 5. Add Replit environment variables

Use the Replit Secrets/environment UI. Never paste server-only values into
source files or public client variables.

### Mobile app

```text
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<anon-or-publishable-key>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<google-web-client-id>
EXPO_PUBLIC_ANDROID_CLIENT_ID=<google-android-client-id>
EXPO_PUBLIC_IOS_CLIENT_ID=<google-ios-client-id>
EXPO_PUBLIC_DOMAIN=<backend-or-public-domain>
```

### Next.js web app

```text
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon-or-publishable-key>
NEXT_PUBLIC_API_URL=<public-api-url-if-web-and-api-are-separated>
```

### Express API and migration commands

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
DATABASE_URL=<session-mode-postgres-uri>
FIREBASE_SERVICE_ACCOUNT=<raw-firebase-service-account-json-during-migration>
SESSION_SECRET=<existing-server-secret>
```

Do not set `SUPABASE_SERVICE_ROLE_KEY`, `DATABASE_URL`, or
`FIREBASE_SERVICE_ACCOUNT` as `EXPO_PUBLIC_*` or `NEXT_PUBLIC_*`.

After changing variables, restart the backend and frontend workflows.

## 6. Install dependencies and check the code

From the repository root:

```bash
npm install
npm --prefix apps/web install
npm run web:typecheck
npm run web:build
npm run server:build
```

The runtime web app must not import Firebase. Firebase imports are allowed only
under `packages/migration/`, which reads the legacy project during the data
transfer.

## 7. Run a dry run against the real projects

Before writing data, confirm the four migration secrets are present in the
shell environment without printing their values:

```bash
test -n "$SUPABASE_URL"
test -n "$SUPABASE_SERVICE_ROLE_KEY"
test -n "$DATABASE_URL"
test -n "$FIREBASE_SERVICE_ACCOUNT"
```

Run the dry runs:

```bash
npm --prefix packages/migration run migrate:dry
npm --prefix packages/migration run migrate:storage:dry
```

Review:

- Firebase Auth user count
- Firestore collection counts
- RTDB notification count
- Storage file counts
- skipped records
- errors
- accounts marked `password_reset_required`

Stop and fix every unexpected error before the write phase.

## 8. Migrate database data

Run the main migration:

```bash
npm --prefix packages/migration run migrate
```

The order is:

1. Firebase Auth users and usernames → Supabase Auth, `users`, and `usernames`
2. `qrCodes` → `qr_codes`
3. `qrs` → `unified_qrs`
4. `guardLinks` → `guard_links` and `guard_link_changes`
5. `standardLinks` → `standard_links`
6. friends → `user_friends`
7. business accounts → `business_accounts`
8. comments → `qr_comments`
9. reports → `qr_reports`
10. audit logs → `audit_logs`
11. moderation queue → `moderation_queue`
12. verification requests → `verification_requests`
13. feature votes → `feature_votes`
14. RTDB notifications → `notifications`

The script is designed to be re-runnable. Save the terminal output as the
migration record. A successful process with nonzero errors is not a successful
migration; investigate and re-run the affected step.

To retry one step:

```bash
MIGRATION_STEP=3 npx tsx packages/migration/data/migrate.ts
```

## 9. Migrate Storage files

After the database migration creates the ID maps, run:

```bash
npm --prefix packages/migration run migrate:storage
```

Then verify:

```sql
select count(*) from storage.objects where bucket_id = 'avatars';
select count(*) from storage.objects where bucket_id = 'qr-logos';
select count(*) from storage.objects where bucket_id = 'verification-docs';
```

Open a sample profile image and QR logo URL. Use a signed URL or the service
role for a verification document; it must not open anonymously.

## 10. Protect migrated accounts from login loss

### Email/password accounts

The migration creates the Supabase Auth user and preserves the old Firebase
UID in metadata, but it does not copy the Firebase password hash. Send every
migrated email/password user through Supabase's password reset flow.

1. Confirm SMTP is configured.
2. Send reset links or provide a one-time migration screen.
3. Ask the user to set a new password.
4. Confirm email verification status and successful sign-in.
5. Do not delete the Firebase account until the user can sign in to Supabase.

### Google accounts

1. Configure Google OAuth in Supabase.
2. Test a migrated Google account.
3. Confirm whether Supabase matches the existing email or creates a duplicate.
4. If it creates a duplicate, stop the cutover and implement a provider-linking
   flow before migrating more users.
5. Do not rely on the `provider` metadata field as proof that an OAuth identity
   is linked; the migration records the original Firebase provider IDs for
   investigation.

### Account recovery

Test:

- sign in
- sign out
- refresh and restore the session
- password reset
- email confirmation
- Google sign-in
- account deletion
- API request with the Supabase access token

## 11. Validate the application before cutover

Use a test account and one migrated account:

### Database and RLS

- anonymous user can read active public QR data
- anonymous user cannot read private user data
- authenticated user can read/update only their own profile
- authenticated user can create a comment as themselves
- authenticated user cannot update another user's comment
- authenticated user can only manage their own favorites
- service role can perform server moderation and migration operations

### Storage

- avatar upload, replacement, and deletion
- QR logo upload and public display
- verification document upload and private read
- another user cannot read or delete those files

### Runtime

- mobile app login and logout
- web login and logout
- API `Authorization: Bearer <supabase-access-token>`
- public QR page and redirect
- scan counter and comment counter
- comments load, create, edit, delete
- likes and reports
- notifications and notification cleanup
- profile image URLs

### Data reconciliation

Compare Firebase and Supabase counts for:

```sql
select count(*) from users;
select count(*) from qr_codes;
select count(*) from unified_qrs;
select count(*) from qr_comments;
select count(*) from qr_reports;
select count(*) from notifications;
```

Also check orphan rows:

```sql
select count(*) from qr_comments c
left join users u on u.id = c.user_id
where u.id is null;

select count(*) from qr_comments c
where c.qr_code_id is null and c.unified_qr_id is null;
```

Expected orphan counts are zero unless a documented legacy record was
intentionally skipped.

## 12. Cut over gradually

1. Put the old Firebase app in maintenance/read-only mode.
2. Run one final export/delta migration for records created after the first
   migration.
3. Run the reconciliation queries again.
4. Point all runtime environments at Supabase variables.
5. Deploy web, API, and mobile builds.
6. Watch auth failures, database errors, Storage errors, and missing QR
   redirects.
7. Keep Firebase available for rollback during the agreed observation period.
8. Only after the observation period:
   - disable Firebase runtime writes
   - retain a secure export
   - remove old Firebase runtime variables
   - remove old Firebase SDK code
   - keep migration scripts and cross-reference fields until retention policy
     permits their removal

## 13. Current repository status

The repository now uses Supabase in the mobile adapters, API, web auth, web QR
data, and web community client. Firebase remains intentionally in:

- `packages/migration/data/migrate.ts`
- `packages/migration/data/migrate-storage.ts`

Those files are required to read the old Firebase project during migration.
The live migration is not complete until you create the Supabase project,
provision the secrets, run the SQL, run both migration scripts, and complete
the verification checklist above.