# BinRo — QR Code Verification Platform

India-focused QR code security app with real-time fraud detection, community trust scoring, and UPI/BharatQR parsing.

## Stack

| Layer | Tech |
|---|---|
| Mobile app | Expo / React Native (expo-router) |
| Backend API | Express 5 + TypeScript (tsx) |
| Web dashboard | Next.js (apps/web) |
| Database | Supabase (PostgreSQL + Drizzle ORM) |
| Auth | Supabase Auth |
| Storage | Supabase Storage (bucket: `binro-assets`) |
| Realtime | Supabase Postgres changes + `rtdb_store` table |

## Running the project

| Workflow | Command |
|---|---|
| Start Backend | `npm run server:dev` → port 5000 |
| Start Frontend | `npm run expo:dev` → Metro bundler port 8081 |

## Environment variables (Replit Secrets)

| Key | Where to find it |
|---|---|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Project Settings → API → Service role key |
| `SUPABASE_DATABASE_URL` | Supabase → Project Settings → Database → Connection string (URI, Session mode port 5432) |

Already set in `.replit` userenv (non-secret):
- `EXPO_PUBLIC_SUPABASE_URL`
- `EXPO_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_URL`
- `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
- `EXPO_PUBLIC_ANDROID_CLIENT_ID`

## Supabase setup checklist

After the migration from Firebase, the following must be done **once** in the Supabase dashboard:

### 1. Storage bucket
- Storage → New bucket → Name: `binro-assets`, Public: ON
- Run the RLS policy SQL (see below)

### 2. Database tables
- Run `packages/db/migrations/0000_graceful_cobalt_man.sql` in the SQL Editor
- Run the helper SQL for `rtdb_store` and `increment_field` (see below)

### 3. Enable Realtime
- Database → Replication → toggle ON for: `qr_codes`, `qr_scans`, `qr_comments`, `user_favorites`, `creator_follows`

## Schema management

```bash
npm run db:push        # push Drizzle schema to Supabase (requires SUPABASE_DATABASE_URL, Session mode port 5432)
npx drizzle-kit generate  # generate migration files without a DB connection
```

`DATABASE_URL` is reserved by Replit. Use `SUPABASE_DATABASE_URL` for Drizzle commands.

## User preferences

- Keep existing project structure and stack — do not restructure or migrate
