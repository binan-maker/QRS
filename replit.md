# BinRo

India's QR code security and verification platform — real-time fraud detection, community trust scoring, and dynamic QR management targeting the UPI / BharatQR ecosystem.

---

## How to run on Replit

| Workflow | Command | Description |
|---|---|---|
| **Start Backend** | `npm run server:dev` | Express API on port 5000 ✅ |
| **Start Frontend** | `npm run expo:dev` | Metro bundler for Expo mobile app |

> **Note:** The Expo mobile app requires a physical device or emulator (via Expo Go or a dev build) — it cannot run directly in the Replit browser preview. The Express backend runs fully in the preview on port 5000.

## Supabase setup status

- ✅ All environment variables and secrets set on Replit
- ✅ All 24 Drizzle ORM tables created in Supabase (`npm run db:push`)
- ✅ Backend starts and `/health` responds `{"status":"ok"}`
- ✅ **Firebase → Supabase data migration complete** (`scripts/migrate-firebase-to-supabase.ts`)
  - 39 Auth users migrated (matched by email)
  - 232 QR codes (`qr_codes`)
  - 1 unified QR (`unified_qrs`)
  - 10 guard links (`guard_links`)
  - 25 standard links (`standard_links`)
  - 76 comments (`qr_comments`)
  - 1 bug report (`moderation_queue`)
- ✅ **Firebase Storage → Supabase Storage migration complete** (`scripts/migrate-firebase-storage.ts`)
  - 5 profile photo files moved to `binro-assets` bucket under `profile-photos/`
  - 0 DB rows still reference Firebase Storage URLs (all clear)

### Re-running the migration (idempotent)

```bash
npx tsx scripts/migrate-firebase-to-supabase.ts
```

Requires: `FIREBASE_SERVICE_ACCOUNT`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_URL`, `DATABASE_URL`

### Re-applying schema changes in future

Because Replit blocks direct PostgreSQL connections (ports 5432/6543), use the Management API to run migrations:

```bash
node -e "
const fs = require('fs'), https = require('https');
const sql = fs.readFileSync('packages/db/migrations/<file>.sql', 'utf8');
const body = JSON.stringify({ query: sql });
const req = https.request({ hostname: 'api.supabase.com', path: '/v1/projects/sgkbsgtktaylrqfziemw/database/query', method: 'POST', headers: { 'Authorization': 'Bearer ' + process.env.SUPABASE_ACCESS_TOKEN, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) } }, res => { let d=''; res.on('data',c=>d+=c); res.on('end',()=>console.log(res.statusCode, d.substring(0,200))); });
req.write(body); req.end();
"
```

---

## Architecture

```
binro/
├── apps/
│   ├── api/           # ✅ Express.js backend (runs on Replit — port 5000)
│   │   └── src/
│   │       ├── index.ts         # Entry point
│   │       ├── routes.ts        # Route registration
│   │       ├── routes/          # API route handlers
│   │       ├── services/        # SERVER-ONLY services (report-service, etc.)
│   │       ├── lib/             # Supabase admin, push, caching
│   │       │   ├── firebase-admin.ts   # Supabase compatibility shim (Firestore-style API → Supabase)
│   │       │   └── supabase-admin.ts   # Real Supabase admin client
│   │       ├── middleware/       # CORS, rate limiter, logger, error handler
│   │       ├── security/        # ECDSA response signing
│   │       ├── templates/       # Landing page HTML, guard redirect HTML
│   │       └── health/          # Health check endpoints
│   └── web/           # Next.js web app (apps/web/)
├── packages/
│   ├── db/            # @binro/db   — Drizzle ORM schema + PostgreSQL client
│   ├── config/        # @binro/config — Zod env validation (mobile / api / web)
│   ├── tsconfig/      # Shared TypeScript configs
│   └── eslint-config/ # Shared ESLint rules
├── app/               # Expo Router screens (mobile app entry)
├── config/            # App-wide typed config: env.ts, api.ts, app.ts, supabase.ts
├── features/          # Domain feature modules (UI + hooks, mobile)
├── lib/               # Infrastructure adapters — Auth, DB, Storage (Supabase-backed)
│   ├── auth/          #   AuthAdapter interface + Supabase provider
│   ├── db/            #   DbAdapter + RealtimeAdapter interfaces + Supabase provider
│   └── storage/       #   StorageAdapter interface
├── services/          # Shared data-access services (mobile — use lib/ adapters)
├── shared/            # Mobile shared components, utils, contexts, i18n
├── store/             # Zustand global stores
└── validators/        # Centralized input validation (auth, user, qr, settings, scan)
```

### Dependency rules

| Layer | Location | May import |
|---|---|---|
| Presentation | `features/`, `app/` | services, hooks, shared, validators |
| Application | `services/` | `lib/auth`, `lib/db`, `lib/storage`, `validators`, `packages/*` |
| Adapter interface | `lib/*/adapter.ts` | TypeScript types only |
| Provider (Supabase) | `lib/*/providers/supabase.ts` | Supabase SDK — only here |
| Domain models | `packages/core/` | Nothing (zero deps) |

### Backend / Mobile separation

| Location | Who uses it |
|---|---|
| `apps/api/src/services/` | **Server only** — uses `supabase-admin`, never bundled in Expo |
| `apps/api/src/lib/firebase-admin.ts` | Supabase compat shim (Firestore-style API → Supabase queries) |
| `services/` (root) | **Mobile** — Supabase client SDK via `lib/` adapters |
| `shared/` (root) | **Mobile shared** — components, utils, i18n |
| `packages/*` | **Everywhere** — pure types / schemas, zero platform deps |

> **Important:** Never import from `@/services/`, `@/lib/`, or `@/shared/` inside `apps/api/src/`.
> Those paths pull in `react-native` / Expo modules that crash the Node server.
> Server-only logic lives in `apps/api/src/services/` and uses `getAdminSupabase()`.

---

## Required Environment Variables

### Server (`apps/api/src/`)

| Variable | Required | Description |
|---|---|---|
| `SUPABASE_URL` | **Yes** (for DB/auth features) | Supabase project URL (`https://xxxx.supabase.co`) |
| `SUPABASE_SERVICE_ROLE_KEY` | **Yes** (for DB/auth features) | Service role key — bypasses RLS; keep secret |
| `DATABASE_URL` | Optional | PostgreSQL connection string (for Drizzle migrations) |
| `SESSION_SECRET` | Optional | HMAC signing secret (≥32 chars) — already set |
| `OPENAI_API_KEY` | Optional | Enables AI QR generation |
| `GOOGLE_SAFE_BROWSING_API_KEY` | Optional | Enables real-time URL threat checks |
| `RAZORPAY_KEY_ID` / `RAZORPAY_KEY_SECRET` | Optional | Payment processing |
| `UPSTASH_REDIS_URL` | Optional | Redis caching |

### Mobile (bundled into JS bundle — public, not secrets)

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `EXPO_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon/public key |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth web client ID |
| `EXPO_PUBLIC_ANDROID_CLIENT_ID` | Google OAuth Android client ID |
| `EXPO_PUBLIC_IOS_CLIENT_ID` | Google OAuth iOS client ID |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | Expo SDK 54, React Native 0.81.5, Expo Router 6 |
| Backend | Express.js 5.x, Node.js, TypeScript (tsx) |
| Database | Supabase (PostgreSQL) — Drizzle ORM schema in `packages/db/` |
| Auth | Supabase Auth + Google Sign-In |
| State | TanStack Query v5 + Zustand v5 |
| i18n | i18next (EN, HI, ML, TA, TE) |
| Payments | Razorpay + In-App Purchases (react-native-iap) |
| Push | Expo Notifications |

---

## API Routes (Express — port 5000)

| Method | Path | Description |
|---|---|---|
| GET | `/health` | Health check (`{"status":"ok"}`) |
| GET | `/api/threats` | Dynamic threat patterns |
| GET | `/q/:id` | Unified QR redirect / content |
| GET | `/go/:slug` | Standard QR content lookup |
| GET | `/guard/:uuid` | Living Shield redirect |
| POST | `/api/v1/validate-email` | Disposable email blocker |
| POST | `/api/v1/qr/decode-image` | Server-side QR image decode |
| POST | `/api/v1/check-url` | Google Safe Browsing lookup |
| POST | `/api/v1/analyze` | Local heuristic QR/URL analysis |
| PATCH | `/api/v1/qr/:qrId/active` | Toggle QR active state |
| GET | `/api/v1/qr/:uuid/analytics` | QR scan analytics (owner only) |
| POST | `/api/v1/qr/:qrId/report` | Submit/toggle a trust report |
| POST | `/api/v1/business/register` | Business account registration |

---

## User Preferences

- Never rewrite the project from scratch — always incremental improvements
- Always preserve existing functionality
- Never delete working code without explaining why
- Always verify the project builds after every change
- Separate backend logic from the mobile app — server-only code lives in `apps/api/src/`
- Database is fully migrated to Supabase (PostgreSQL) — do not re-introduce Firebase
