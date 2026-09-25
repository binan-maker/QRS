# BinRo authentication migration: Firebase Auth export to Supabase Auth

This project now uses Supabase only. The migration in
`packages/migration/data/migrate-auth.ts` imports authentication users only.
It does **not** read or write Firestore, Realtime Database, Storage, scans,
QR codes, ownerships, usernames, profiles, comments, notifications, or any
other application data.

## What is migrated

For each legacy account, the importer copies only:

- email address
- email-confirmed state
- display name and profile photo, when present in the Auth export
- legacy provider IDs and Firebase UID in Supabase Auth user metadata, so the
  import can be audited without migrating application data

Firebase password hashes are not copied. Firebase and Supabase use different
password-hash formats, and Supabase's Admin API does not accept a Firebase
hash. Email/password users must set a new password through Supabase recovery.
Google users must sign in through the Supabase Google provider after it is
configured.

## 1. Create or select the Supabase project

1. Open the Supabase dashboard and create or select the BinRo project.
2. Choose the region closest to your users.
3. In **Project Settings → API**, copy:
   - Project URL
   - publishable/anon key
   - service-role key
4. Keep the service-role key server-only. Never place it in
   `EXPO_PUBLIC_*` or `NEXT_PUBLIC_*` variables.

No application-data SQL migration is needed for this Auth-only cutover. If the
project already has its Supabase application schema, leave it as-is. The
importer writes only to Supabase Auth through the Admin API.

## 2. Configure Supabase Auth

In **Authentication → Providers**:

### Email

1. Enable Email provider.
2. Configure SMTP for production recovery and confirmation emails.
3. Keep email confirmation enabled unless the product explicitly requires a
   different policy.
4. Set the password minimum to the policy used by the app.

### Google

1. Enable Google provider.
2. Copy the exact Supabase callback URL shown in the provider settings.
3. Add that URL to the Google Cloud OAuth client's authorized redirect URIs.
4. Configure the web and native client IDs used by this project.
5. In **Authentication → URL Configuration**, add the production web URL and
   the mobile deep-link URL. Add temporary Replit preview URLs only while
   testing.

The exact callback and redirect values belong to the Supabase dashboard. Do not
invent them from the project name.

## 3. Add Replit secrets and public variables

Set these in Replit Secrets/environment configuration:

### Mobile app

```text
EXPO_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID=<google-web-client-id>
EXPO_PUBLIC_ANDROID_CLIENT_ID=<google-android-client-id>
EXPO_PUBLIC_IOS_CLIENT_ID=<google-ios-client-id>
EXPO_PUBLIC_DOMAIN=<public-api-or-app-domain>
```

### Next.js web app

```text
NEXT_PUBLIC_SUPABASE_URL=https://<project-ref>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<publishable-or-anon-key>
NEXT_PUBLIC_API_URL=<public-api-url-if-api-is-separate>
```

### One-time migration command

```text
SUPABASE_URL=https://<project-ref>.supabase.co
SUPABASE_SERVICE_ROLE_KEY=<service-role-key>
FIREBASE_AUTH_EXPORT=./firebase-auth-users.json
```

`SUPABASE_SERVICE_ROLE_KEY` must never be bundled into the mobile app,
Next.js browser code, or committed files.

## 4. Export only Firebase Authentication users

Use the Firebase CLI on a trusted machine while the old Firebase project is
still available:

```bash
firebase login
firebase auth:export firebase-auth-users.json --project <firebase-project-id>
```

Copy the resulting `firebase-auth-users.json` into the repository root only
temporarily, or set `FIREBASE_AUTH_EXPORT` to a secure path outside the
repository. Do not commit the export. It contains personal account data.

The importer accepts either the normal Firebase export object with a `users`
array or a JSON array of user records. It requires each record to have
`localId` and `email`.

## 5. Dry run

From the repository root:

```bash
export SUPABASE_URL="https://<project-ref>.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="<service-role-key>"
export FIREBASE_AUTH_EXPORT="/secure/path/firebase-auth-users.json"

npm install
npm --prefix packages/migration run migrate:dry
```

Review the counts and confirm that the output is Auth-only. The dry run does
not create or update users.

## 6. Import users

After reviewing the dry run:

```bash
npm --prefix packages/migration run migrate
```

The script is safe to re-run. It matches existing Supabase users by
case-insensitive email, updates their Auth metadata when matched, and creates
missing users. It never inserts into a Postgres application table.

Save the terminal output as the migration record. If the final `Errors` count
is non-zero, fix those rows and rerun the command before cutover.

## 7. Let users recover their accounts

### Email/password users

1. Keep the `/auth/forgot-password` flow enabled.
2. Send a recovery email to each migrated email/password user using the
   product's normal recovery flow or an approved support campaign.
3. The user opens the Supabase recovery link and chooses a new password.
4. Confirm sign-in, sign-out, session restore, and a second sign-in.

Do not send a shared temporary password. Do not print recovery links into
logs or commit them to the repository.

### Google users

1. Ensure the Google provider is enabled and its redirect URLs are correct.
2. Ask a migrated Google user to sign in with the same Google account.
3. Confirm that Supabase opens the existing account rather than creating a
   duplicate.
4. If Supabase reports an existing-email or identity-linking error, stop the
   rollout and handle that account through a verified account-linking flow.

The importer stores legacy provider information as metadata for this check; it
does not pretend that a Supabase OAuth identity was linked when it was not.

## 8. Verification checklist

Use one migrated password account and one migrated Google account:

- password recovery email is delivered
- new password sign-in succeeds
- email confirmation behavior matches policy
- Google sign-in succeeds for the same Google account
- sign-out and session restore work on web
- sign-out and session restore work in the mobile app
- API requests accept the Supabase access token
- a newly registered user can sign up and verify email
- no scan, QR, ownership, Storage, or other legacy application record was
  imported
- `rg -i "firebase|firestore" --glob '!package-lock.json'` finds no runtime
  Firebase code

## 9. Cutover and cleanup

1. Keep a secure copy of the Firebase Auth export until the migration is
   verified and the retention period expires.
2. Remove the temporary JSON export from the repository and local machine.
3. Remove old Firebase environment variables from Replit.
4. Disable Firebase Auth only after recovery and Google sign-in have passed.
5. Rotate the Supabase service-role key if it was ever exposed outside the
   Replit secret store.

There is no Firebase runtime fallback in this repository. Supabase is the only
authentication provider used by the mobile app, web app, and API.