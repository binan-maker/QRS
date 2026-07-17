# BinRo

India's QR code security and verification platform — real-time fraud detection, community trust scoring, and dynamic QR management targeting the UPI/BharatQR ecosystem.

---

## Monorepo Structure

```
binro/
├── apps/
│   ├── mobile/        # Future home of Expo app (Phase 2 migration)
│   ├── api/           # Future home of Express backend (Phase 3 migration)
│   └── web/           # Next.js website (Phase 4)
├── packages/
│   ├── core/          # @binro/core — shared domain types + business constants (zero deps)
│   ├── db/            # @binro/db   — Drizzle schema, PostgreSQL client factory
│   ├── config/        # @binro/config — Zod-validated environment schemas
│   ├── tsconfig/      # @binro/tsconfig — shared TypeScript configs
│   └── eslint-config/ # @binro/eslint-config — shared ESLint rules
├── app/               # Expo Router screens (thin wrappers)
├── features/          # Domain feature modules (UI + hooks)
├── services/          # Firebase/Firestore data access layer
├── shared/            # Mobile shared components, utils, contexts
├── lib/               # Infrastructure adapters (Firebase, Auth, DB)
├── server/            # Express.js API backend
├── store/             # Zustand global stores
├── MIGRATION_ROADMAP.md
└── .github/workflows/ # CI/CD pipelines
```

> **Current phase: Phase 1 complete** — monorepo scaffold and packages/ extracted.
> The Expo app (root) and Express server (`server/`) remain at the root during Phase 1.
> Phase 2 moves the app to `apps/mobile/`; Phase 3 moves the server to `apps/api/`.

---

## Run & Operate

| Command | Description |
|---|---|
| `npm run server:dev` | Express API on port 5000 (development) |
| `npm run expo:dev` | Metro bundler — connect via Expo Go or dev build |
| `npm run server:build` | Bundle server for production |
| `npm run db:push` | Push Drizzle schema to PostgreSQL (requires `DATABASE_URL`) |

---

## Required Environment Variables

### Mobile (EXPO_PUBLIC_* — bundled at build time)
| Variable | Description |
|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `EXPO_PUBLIC_FIREBASE_DATABASE_URL` | Firebase Realtime Database URL |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase App ID |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase sender ID |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth web client ID |
| `EXPO_PUBLIC_ANDROID_CLIENT_ID` | Google OAuth Android client ID |
| `EXPO_PUBLIC_IOS_CLIENT_ID` | Google OAuth iOS client ID (required for iOS Sign-In) |

### Server
| Variable | Description |
|---|---|
| `PORT` | Server port (default: 5000) |
| `SESSION_SECRET` | HMAC signing secret (min 32 chars) |
| `GOOGLE_SAFE_BROWSING_API_KEY` | Optional — enables real threat intelligence |
| `DATABASE_URL` | Optional until Phase 2 — PostgreSQL connection string |
| `OPENAI_API_KEY` | Optional — enables AI QR generation |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Mobile | Expo SDK 54, React Native 0.81.5, Expo Router 6 |
| Backend | Express.js 5.x, Node.js 20, TypeScript (tsx) |
| Primary DB | Firebase Firestore (client + Admin SDK) |
| Future DB | PostgreSQL via Drizzle ORM (`packages/db/`) |
| Auth | Firebase Auth + Google Sign-In |
| State | TanStack Query v5 + Zustand v5 + React Context |
| i18n | i18next (EN, HI, ML, TA, TE) |
| Payments | Razorpay + react-native-iap |
| Push | Expo Notifications |
| Build | Metro Bundler, EAS Build |

---

## Shared Packages (@binro/*)

### `@binro/core` (`packages/core/`)
Pure domain types and business constants. **Zero runtime dependencies.**
- `src/types/` — `QrCode`, `AppUser`, `TrustScore`, `Report`, `QrContentType`, etc.
- `src/constants/` — pagination sizes, username rules, trust thresholds, app constants
- Safe to import in mobile, web, and API

### `@binro/db` (`packages/db/`)
Drizzle ORM schema and PostgreSQL client factory.
- `src/schema.ts` — all table definitions (`users`, `qrCodes`, `scans`, `comments`, etc.)
- `src/client.ts` — lazy `getDb()` factory (throws if `DATABASE_URL` missing)
- `drizzle.config.ts` — standalone migration config for this package

### `@binro/config` (`packages/config/`)
Zod environment validation for each deployment target.
```typescript
import { validateEnv, apiEnvSchema } from "@binro/config";
export const env = validateEnv(apiEnvSchema);
```

### `@binro/tsconfig` (`packages/tsconfig/`)
Shared TypeScript configs: `base.json`, `react-native.json`, `node.json`, `nextjs.json`.

---

## Architecture Notes

- `shared/types/`, `shared/models/`, `shared/constants/config.ts` are **re-export shims** pointing to `packages/core/` — all existing `@/shared/*` imports continue to work unchanged.
- `shared/schema.ts` is a **re-export shim** pointing to `packages/db/src/schema.ts` — all existing `@shared/schema` imports continue to work unchanged.
- See `MIGRATION_ROADMAP.md` for the full 6-phase plan to reach production-ready architecture.
