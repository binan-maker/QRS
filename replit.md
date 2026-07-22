# BinRo

India's QR code security and verification platform — real-time fraud detection, community trust scoring, and dynamic QR management targeting the UPI / BharatQR ecosystem.

---

## How to run on Replit

| Workflow | Command | Description |
|---|---|---|
| **Start Backend** | `npm run server:dev` | Express API on port 5000 |
| **Start Frontend** | `npm run expo:dev` | Metro bundler for Expo mobile app |

Install dependencies first if workflows fail:

```bash
npm install
```

---

## Architecture

```
binro/
├── apps/
│   ├── api/           # ✅ Express.js backend (the running server)
│   │   └── src/
│   │       ├── index.ts         # Entry point — port 5000
│   │       ├── routes.ts        # Route registration
│   │       ├── routes/          # API route handlers
│   │       ├── services/        # SERVER-ONLY services (firebase-admin, vote weight)
│   │       ├── lib/             # Firebase Admin, push, Firestore REST client, caching
│   │       ├── middleware/       # CORS, rate limiter, logger, error handler
│   │       ├── security/        # ECDSA response signing
│   │       ├── templates/       # Landing page HTML, guard redirect HTML
│   │       └── health/          # Health check endpoints
│   └── web/           # Next.js web app
├── packages/
│   ├── core/          # @binro/core — shared domain types, zero deps
│   ├── db/            # @binro/db   — Drizzle ORM schema + PostgreSQL client
│   ├── config/        # @binro/config — Zod env validation (mobile / api / web)
│   ├── tsconfig/      # Shared TypeScript configs
│   └── eslint-config/ # Shared ESLint rules
├── app/               # Expo Router screens (root — current mobile app entry)
├── config/            # App-wide constants: env.ts, api.ts, app.ts, firebase.ts
├── features/          # Domain feature modules (UI + hooks, mobile)
├── lib/               # Infrastructure adapters — Auth, DB, Storage (Firebase isolated here)
│   ├── auth/          #   AuthAdapter interface + Firebase provider
│   ├── db/            #   DbAdapter + RealtimeAdapter interfaces + Firebase provider
│   └── storage/       #   StorageAdapter interface + Firebase provider
├── services/          # Shared data-access services (use lib/ adapters, zero Firebase SDK imports)
├── shared/            # Mobile shared components, utils, contexts, i18n
├── store/             # Zustand global stores
└── validators/        # Centralized input validation (auth, user, qr, settings, scan)
```

### Dependency rules (enforced)

| Layer | Location | May import |
|---|---|---|
| Presentation | `features/`, `app/` | services, hooks, shared, validators |
| Application | `services/` | `lib/auth`, `lib/db`, `lib/storage`, `validators`, `packages/core` |
| Adapter interface | `lib/*/adapter.ts` | TypeScript types only |
| Provider (Firebase) | `lib/*/providers/firebase.ts` | Firebase SDK — **only here** |
| Domain models | `packages/core/` | Nothing (zero deps) |

### Backend / Mobile separation

| Location | Who uses it |
|---|---|
| `apps/api/src/services/` | **Server only** — imports `firebase-admin`, never bundled in Expo |
| `services/` (root) | **Mobile** — Firebase client SDK via `lib/` adapters |
| `shared/` (root) | **Mobile shared** — components, utils, i18n |
| `packages/core/` | **Everywhere** — pure types, zero deps |

---

## Required Environment Variables

### Server (`apps/api/src/`)
| Variable | Required | Description |
|---|---|---|
| `SESSION_SECRET` | Optional | HMAC signing secret (≥32 chars) — already set |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | Optional | Firebase Admin SDK service account JSON — enables `/api/v1/qr/:id/report`, QR analytics, active toggle |
| `FIREBASE_DATABASE_URL` | Optional | Firebase Realtime Database URL |
| `GOOGLE_SAFE_BROWSING_API_KEY` | Optional | Enables real-time URL threat checks |
| `OPENAI_API_KEY` | Optional | Enables AI QR generation |
| `DATABASE_URL` | Optional | PostgreSQL (Phase 2) |

### Mobile (bundled into JS bundle — not secrets)
| Variable | Description |
|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `EXPO_PUBLIC_FIREBASE_DATABASE_URL` | Firebase Realtime Database URL |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase App ID |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging sender ID |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth web client ID |
| `EXPO_PUBLIC_ANDROID_CLIENT_ID` | Google OAuth Android client ID |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | Expo SDK 54, React Native 0.81.5, Expo Router 6 |
| Backend | Express.js 5.x, Node.js, TypeScript (tsx) |
| Primary DB | Firebase Firestore (client SDK + Admin SDK) |
| Future DB | PostgreSQL via Drizzle ORM (`packages/db/`) |
| Auth | Firebase Auth + Google Sign-In |
| State | TanStack Query v5 + Zustand v5 |
| i18n | i18next (EN, HI, ML, TA, TE) |
| Payments | Google Play Billing / Apple In-App Purchases (react-native-iap) |
| Push | Expo Notifications |

---

## API Routes (Express — port 5000)

| Method | Path | Description |
|---|---|---|
| GET | `/status` | Health check |
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
