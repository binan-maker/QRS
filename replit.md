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
- `FIREBASE_SERVICE_ACCOUNT` — only needed while importing legacy Firebase data
- `SESSION_SECRET` — optional session/application secret

Supabase URL and anon key are public client configuration. Keep the Supabase
service-role key, Postgres URI, and Firebase service-account JSON in Replit
Secrets. Never put any of those server-only values in `EXPO_PUBLIC_*` or
`NEXT_PUBLIC_*` variables.

## Supabase setup and migration

The app now uses static individual QR codes only. New client writes reject
dynamic destinations, business QR metadata, redirect history, expiry, and scan
limits. Legacy Firebase rules and adapters are retained only for the data
migration/rollback window and are not part of the active Supabase runtime.

Follow `SUPABASE_MIGRATION_RUNBOOK.md` from top to bottom. It covers project
creation, SQL order, Auth providers and redirect URLs, Storage buckets and
policies, Replit Secrets, Firebase data import, account recovery, cutover, and
verification.

## Schema and security

Enable Email/Password and Google providers in Supabase Auth, configure the
redirect URLs for the web and mobile app, run all five migration SQL files,
and test anonymous QR reads, authenticated writes, storage uploads, and API
token verification before disabling Firebase.

The application runtime uses Supabase adapters. Firebase remains only in the
legacy migration scripts and must not be used by runtime web, mobile, or API
code.