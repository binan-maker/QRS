# BinRo — QR Code Verification Platform

India-focused QR code security app with real-time fraud detection, community trust scoring, and UPI/BharatQR parsing.

## Stack

| Layer | Tech |
|---|---|
| Mobile app | Expo / React Native (expo-router) |
| Backend API | Express 5 + TypeScript (tsx) |
| Web dashboard | Next.js (apps/web) |
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth |
| Storage | Supabase Storage |
| Realtime | Supabase Realtime + `rtdb_store` compatibility table |

## Running the project

| Workflow | Command |
|---|---|
| Start Backend | `npm run server:dev` → backend service |
| Start Frontend | `npm run web:dev` → Next.js website on port 5000 |

The complete consumer page map, Supabase data model, auth/scan/community
flows, RLS rules, Storage and Realtime setup, and publish checklist are in
`SUPABASE_PRODUCT_PLAN.md`.

## Website surface

The Next.js website contains the BinRo home, full-screen scanner, public QR
details, profile, and app-download pages. The web experience is responsive
across mobile, tablet, and desktop. Sign-in and account actions route to the
app-download page rather than opening web auth forms. Community actions from
the QR details page open the mobile-app download sheet instead of duplicating
the mobile-only report, vote, and comment flows.

## Environment variables

Public client configuration:

- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

Server-only configuration:

- `SUPABASE_URL` — server-side Supabase project URL
- `SUPABASE_SERVICE_ROLE_KEY` — server-only Supabase service role key
- `DATABASE_URL` — Supabase Postgres session-mode URI for migrations
- `SESSION_SECRET` — optional session/application secret

Supabase URL and anon key are public client configuration. Keep the Supabase
service-role key and Postgres URI in Replit
Secrets. Never put any of those server-only values in `EXPO_PUBLIC_*` or
`NEXT_PUBLIC_*` variables.

## Supabase setup and authentication migration

The runtime uses Supabase Auth, PostgreSQL, Storage, and Realtime. The
repository does not contain Firebase SDKs or Firebase runtime adapters.

Follow `SUPABASE_MIGRATION_RUNBOOK.md` to configure Supabase and import the
legacy authentication users. The migration is intentionally Auth-only: it
imports no scans, QR records, ownerships, profiles, Storage files, or other
Firebase data.

## Schema and security

Enable Email/Password and Google providers in Supabase Auth, configure the
redirect URLs for the web and mobile app, and test password recovery, Google
sign-in, session restore, and API token verification.

The app runtime still requires the Supabase URL/keys listed above in Replit
Secrets. Attaching the Replit Supabase connection allows secure project access
for setup and inspection, but does not automatically populate client runtime
environment variables.