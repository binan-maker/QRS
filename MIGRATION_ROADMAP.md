# BinRo — Production Migration Roadmap
**From: Firebase MVP · To: Production-Ready Global Architecture**
*Created: July 2026 · Based on Architecture Report v2.0.0*

---

## Executive Summary

This roadmap transforms BinRo from a Firebase-dependent MVP into a globally deployable, horizontally scalable production system. The migration is organised into **6 phases** across an estimated **16–20 weeks**, each independently shippable without downtime. The final architecture runs React Native Expo (mobile), Next.js (web), a Node.js/Express backend, and PostgreSQL as the primary data store, with Firebase Auth retained as a temporary identity provider during the transition to a self-hosted auth solution.

**Core design principles for the target architecture:**
- **Clean Architecture**: strict dependency rule — outer layers depend on inner layers, never the reverse
- **No vendor lock-in**: Firebase is an infrastructure detail, not a domain concept
- **Data sovereignty**: all business data lives in PostgreSQL under your control
- **Offline-first mobile**: the app works without a network and syncs when connected
- **Edge-ready**: API routes and web pages deployable to global CDN edge nodes

---

## Target Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                   │
│                                                                         │
│  ┌──────────────────────┐          ┌──────────────────────────────────┐ │
│  │  React Native (Expo) │          │        Next.js Website           │ │
│  │  iOS · Android       │          │  Landing · Dashboard · Web QR    │ │
│  │  Offline-first       │          │  SSR · ISR · Edge rendering      │ │
│  └──────────┬───────────┘          └────────────────┬─────────────────┘ │
└─────────────┼────────────────────────────────────────┼───────────────────┘
              │  HTTPS + JWT                            │  HTTPS + JWT
┌─────────────▼────────────────────────────────────────▼───────────────────┐
│                         API GATEWAY LAYER                                │
│              Node.js / Express  (versioned: /api/v1/, /api/v2/)          │
│      Rate limiting · Auth middleware · Request validation · Signing      │
│              Deployed: Railway / Fly.io (multi-region)                   │
└──────────┬─────────────────────────────────────────────────────┬─────────┘
           │                                                     │
┌──────────▼──────────┐                             ┌───────────▼──────────┐
│   DOMAIN SERVICES   │                             │   BACKGROUND WORKERS │
│                     │                             │                      │
│  QR Engine          │                             │  Push Notifications  │
│  Trust Scoring      │                             │  Scheduler (BullMQ)  │
│  Fraud Detection    │                             │  Analytics Pipeline  │
│  Security Analysis  │                             │  DB Maintenance      │
└──────────┬──────────┘                             └───────────┬──────────┘
           │                                                     │
┌──────────▼─────────────────────────────────────────────────────▼─────────┐
│                        DATA LAYER                                         │
│                                                                           │
│   ┌──────────────┐  ┌──────────────┐  ┌──────────┐  ┌────────────────┐  │
│   │  PostgreSQL  │  │    Redis     │  │  S3 /    │  │ Firebase Auth  │  │
│   │  (Neon.tech  │  │  (Upstash)   │  │ Cloudflare│  │  (temporary)   │  │
│   │  / Supabase) │  │  Cache+Queue │  │ R2 Assets│  │                │  │
│   └──────────────┘  └──────────────┘  └──────────┘  └────────────────┘  │
└───────────────────────────────────────────────────────────────────────────┘
```

---

## Target Folder Structure

### Monorepo Root
```
binro/
├── apps/
│   ├── mobile/           # React Native Expo app
│   ├── web/              # Next.js website
│   └── api/              # Node.js / Express backend
├── packages/
│   ├── core/             # Domain models, business logic (zero dependencies)
│   ├── db/               # Drizzle schema, migrations, seed data
│   ├── ui/               # Shared React Native + web design system
│   ├── config/           # Shared constants, feature flags, environment schemas
│   └── tsconfig/         # Shared TypeScript configurations
├── infra/                # IaC (Terraform / Pulumi) for cloud resources
├── .github/
│   └── workflows/        # CI/CD pipelines
├── pnpm-workspace.yaml
└── turbo.json            # Turborepo build orchestration
```

### `apps/mobile/` — React Native Expo
```
apps/mobile/
├── app/                  # Expo Router screens (thin route wrappers only)
│   ├── (auth)/
│   ├── (tabs)/
│   └── [deep-link routes]
├── features/             # Feature modules (UI + hooks only, no business logic)
│   ├── scanner/
│   ├── qr-detail/
│   ├── generator/
│   ├── history/
│   ├── profile/
│   └── settings/
├── infrastructure/       # Mobile-specific infrastructure adapters
│   ├── api/              # API client (wraps fetch, injects auth token)
│   ├── storage/          # AsyncStorage adapter
│   ├── push/             # Expo push notification adapter
│   └── auth/             # Firebase Auth adapter (swappable)
├── store/                # Zustand stores (UI state only)
└── shared/               # Mobile-specific shared components / utils
```

### `apps/web/` — Next.js
```
apps/web/
├── app/                  # Next.js App Router
│   ├── (marketing)/      # Landing, pricing, blog (SSG/ISR)
│   ├── (dashboard)/      # Authenticated user dashboard (SSR)
│   ├── q/[id]/           # Web QR redirect (Edge Runtime)
│   └── api/              # Next.js API routes (thin proxies only)
├── features/             # Web feature modules
│   ├── qr-viewer/        # Web QR detail page
│   ├── dashboard/        # Analytics dashboard
│   └── auth/             # Web auth flows
├── components/           # Web-specific UI components
└── infrastructure/       # Web-specific adapters (API client, auth)
```

### `apps/api/` — Node.js Backend
```
apps/api/
├── src/
│   ├── domain/           # ← CORE: pure business logic, zero framework deps
│   │   ├── qr/           # QR entities, value objects, domain events
│   │   ├── user/         # User aggregate, domain rules
│   │   ├── trust/        # Trust scoring rules
│   │   ├── scan/         # Scan recording rules, fraud policies
│   │   └── security/     # URL risk rules, phishing detection rules
│   │
│   ├── application/      # Use cases (orchestrate domain, call ports)
│   │   ├── qr/           # CreateQr, UpdateQrDestination, RecordScan, etc.
│   │   ├── user/         # RegisterUser, UpdateProfile, DeleteAccount, etc.
│   │   ├── trust/        # ComputeTrustScore, SubmitReport, etc.
│   │   └── security/     # AnalyseUrl, CheckBlacklist, etc.
│   │
│   ├── infrastructure/   # Implementations of ports (DB, cache, queues, etc.)
│   │   ├── persistence/  # Drizzle repositories implementing domain ports
│   │   ├── cache/        # Redis adapter
│   │   ├── queue/        # BullMQ job definitions
│   │   ├── auth/         # Firebase Admin token verification
│   │   ├── push/         # Expo Push API adapter
│   │   ├── ai/           # OpenAI adapter
│   │   └── payments/     # Razorpay adapter
│   │
│   └── interface/        # HTTP layer (Express routes, middleware, DTOs)
│       ├── routes/       # Route handlers (call application use cases)
│       ├── middleware/   # Auth, rate limit, validation, signing
│       └── dto/          # Request/response schemas (Zod)
│
├── workers/              # BullMQ worker processes (separate deployment)
│   ├── push.worker.ts    # Re-engagement push notifications
│   ├── analytics.worker.ts
│   └── maintenance.worker.ts
└── tests/
    ├── unit/             # Domain logic tests (no I/O)
    ├── integration/      # Repository + DB tests
    └── e2e/              # HTTP-level API tests
```

### `packages/core/` — Shared Domain (Zero Dependencies)
```
packages/core/
├── src/
│   ├── models/           # Shared entity types (QrCode, User, Scan, TrustScore)
│   ├── value-objects/    # UpiId, QrSlug, TrustLevel, ContentType
│   ├── errors/           # Domain error types
│   └── constants/        # Business constants (tiers, limits, content types)
```

### `packages/db/` — Database Package
```
packages/db/
├── src/
│   ├── schema/           # Drizzle table definitions (split by domain)
│   │   ├── users.ts
│   │   ├── qr-codes.ts
│   │   ├── scans.ts
│   │   ├── comments.ts
│   │   ├── reports.ts
│   │   └── index.ts
│   ├── migrations/       # Auto-generated + manual migrations
│   ├── client.ts         # Drizzle client factory
│   └── seed.ts           # Development seed data
```

---

## Phase Breakdown

---

## Phase 1 — Foundation & Monorepo Setup
**Duration: 2 weeks · Risk: Low · Can deploy: Immediately (no behaviour change)**

### Goal
Establish the monorepo, shared tooling, and build pipeline without changing any application behaviour. Every existing feature continues to work exactly as before at the end of this phase.

### Tasks

#### 1.1 — Monorepo Scaffold
- Initialise `pnpm-workspace.yaml` with `apps/*` and `packages/*` workspaces
- Configure Turborepo (`turbo.json`) with `build`, `dev`, `lint`, `test` pipelines
- Set up shared `packages/tsconfig/` with `base.json`, `react-native.json`, `nextjs.json`, `node.json`
- Configure shared ESLint + Prettier rules in a `packages/eslint-config/` package
- Move existing code into `apps/mobile/` without altering any imports yet

#### 1.2 — `packages/core` Extraction
- Create `packages/core` package
- Move shared domain types from `shared/types/`, `shared/models/`, `shared/schemas/` into `packages/core/src/models/`
- Move `shared/constants/` into `packages/core/src/constants/`
- Move domain error classes into `packages/core/src/errors/`
- All imports across `apps/mobile/` and `apps/api/` updated to reference `@binro/core`
- **Rule**: `packages/core` must have zero runtime dependencies (only `typescript` as devDep)

#### 1.3 — `packages/db` Creation
- Move `shared/schema.ts` into `packages/db/src/schema/`, split into domain-scoped files
- Move `drizzle.config.ts` into `packages/db/`
- Guard `DATABASE_URL` check behind `process.env.DRIZZLE_ACTIVE !== 'false'` to unblock development without PostgreSQL
- Create `packages/db/src/client.ts` with a singleton Drizzle client factory
- Migrations directory established at `packages/db/src/migrations/`

#### 1.4 — CI/CD Pipeline
- GitHub Actions workflows:
  - `ci.yml` — lint + typecheck + unit tests on every PR
  - `deploy-api.yml` — deploy `apps/api/` on merge to `main`
  - `deploy-web.yml` — deploy `apps/web/` on merge to `main`
  - `eas-build.yml` — trigger EAS build on mobile version tag
- Branch protection: require passing CI before merge to `main`
- Environment secrets: `development`, `staging`, `production` in GitHub Environments

#### 1.5 — Environment Configuration
- Create `packages/config/src/env.ts` using Zod to parse and validate environment variables at startup
- Define separate schemas for `MobileEnv`, `ApiEnv`, `WebEnv`
- Fail fast at boot if required env vars are missing (replaces scattered `process.env.X || throw`)
- Document all required environment variables in `packages/config/README.md`

### Deliverables
- [ ] Monorepo builds from root with `pnpm build`
- [ ] `packages/core` has zero runtime dependencies
- [ ] `packages/db` schema compiles; `drizzle-kit generate` works
- [ ] All existing mobile app functionality unchanged
- [ ] CI pipeline green on first PR

---

## Phase 2 — PostgreSQL Migration
**Duration: 3 weeks · Risk: Medium · Requires: Phase 1 complete**

### Goal
Make PostgreSQL the authoritative data store for all domain data. Firestore becomes a read-only compatibility layer that is drained over time. Firebase Auth remains untouched.

### Architecture Decision
A **dual-write strategy** is used during the transition:
- New writes go to **both** PostgreSQL and Firestore simultaneously
- Reads come from PostgreSQL (with Firestore as fallback for records not yet migrated)
- A background migration job backfills historical Firestore data into PostgreSQL
- Firestore reads are removed one domain at a time after backfill completes

### Tasks

#### 2.1 — PostgreSQL Provisioning
- Provision PostgreSQL on **Neon.tech** (serverless, branching for staging/prod) or **Supabase** (if row-level security policies are desired)
- Create `development`, `staging`, and `production` database branches
- Run initial migration: `packages/db/src/migrations/0001_initial_schema.sql`
- Verify connection from `apps/api/` and confirm all tables exist

#### 2.2 — Repository Pattern Implementation
- Implement repository interfaces (ports) in `apps/api/src/domain/`:
  ```
  IUserRepository
  IQrCodeRepository
  IScanRepository
  ICommentRepository
  IReportRepository
  ITrustRepository
  ```
- Implement Drizzle-backed repositories in `apps/api/src/infrastructure/persistence/`:
  - Each repository implements its domain interface
  - All Firestore direct calls in `services/` are replaced with repository calls
  - Firestore adapter also implements each interface (for dual-write period)

#### 2.3 — Dual-Write Layer
- Create `DualWriteQrRepository`, `DualWriteUserRepository`, etc.
  - `write()`: writes to PostgreSQL first; if successful, writes to Firestore (fire-and-forget)
  - `read()`: reads from PostgreSQL; falls back to Firestore if row not found (not yet migrated)
  - Logs any divergence between the two stores to a `sync_audit` table
- Wrap all service calls in dual-write repositories
- Feature flag `DUAL_WRITE_ENABLED=true` to toggle on/off without redeploy

#### 2.4 — Historical Data Backfill
- Write a migration script `packages/db/scripts/backfill-firestore.ts`:
  - Paginated read of all Firestore collections (`qrs`, `users`, `scans`, `comments`, etc.)
  - Upsert each document into PostgreSQL with `ON CONFLICT DO NOTHING`
  - Track progress in `migration_progress` table (resumable)
  - Rate-limited: max 200 Firestore reads/second to avoid quota exhaustion
- Run backfill against `staging` environment first with production data snapshot
- Validate: row counts match across Firestore and PostgreSQL

#### 2.5 — Dual Architecture QR Consolidation
This addresses **TD-1** (highest priority tech debt):
- Write a one-time migration script that reads all `guardLinks/{uuid}` and `standardLinks/{slug}` documents and upserts them into the unified `qrs` table in PostgreSQL with correct `qrType` values
- Update `server/routes.ts` redirect handlers (`/g/:uuid`, `/s/:slug`) to read from PostgreSQL via the new `IQrCodeRepository`
- Remove Firestore REST API calls from `server/lib/firebase-client.ts` after migration is validated
- Deprecate `guardLinks` and `standardLinks` Firestore collections (set Firestore rules to deny writes)

#### 2.6 — Read Cutover (per domain)
After backfill is verified, remove the Firestore fallback read one domain at a time:
1. `users` (lowest risk, small dataset)
2. `qrs` (after dual architecture consolidation)
3. `scans` (largest table — migrate in batches by `createdAt` range)
4. `comments`, `reports`, `follows`, `favorites`
5. Remove dual-write layer once all domains are cut over
6. Archive Firestore collections (export to Cloud Storage, do not delete for 90 days)

### Deliverables
- [ ] All new writes persist in PostgreSQL
- [ ] Backfill script runs to completion with <0.1% error rate
- [ ] Row counts match between Firestore and PostgreSQL (verified by script)
- [ ] `/q/:id`, `/g/:uuid`, `/s/:slug` redirect routes read from PostgreSQL
- [ ] Firestore `guardLinks` and `standardLinks` deprecated
- [ ] Zero downtime during entire phase

---

## Phase 3 — Backend Clean Architecture
**Duration: 3 weeks · Risk: Medium · Requires: Phase 2 complete**

### Goal
Restructure `apps/api/` into Clean Architecture layers. Replace the current monolithic `services/` layer with a proper domain → application → infrastructure separation. Fix all high-priority scalability issues identified in the Architecture Report.

### Tasks

#### 3.1 — Domain Layer
Move all business rules into `apps/api/src/domain/` with **zero framework dependencies**:

- **QR domain** (`domain/qr/`):
  - `QrCode` entity with business invariants (cannot have both `scanLimit` and `expiryDate` as null if it's a guard QR)
  - `QrSlug` and `QrId` value objects
  - `QrCreated`, `QrDestinationChanged`, `QrDeactivated` domain events
  - `computeStatus(qr: QrCode): QrStatus` — pure function, no I/O

- **Trust domain** (`domain/trust/`):
  - `TrustScore` value object with tier classification
  - `computeTrustScore(signals: TrustSignals): TrustScore` — pure function
  - Collusion detection rules as pure functions (extracted from `services/server-collusion.ts`)

- **Security domain** (`domain/security/`):
  - `UrlRisk` value object
  - `computeUrlRisk(url: string): UrlRisk` — pure function (consolidates the three duplicate implementations)
  - `PhishingPattern` registry (India-specific patterns, loaded at startup, not hardcoded in routes)

- **Scan domain** (`domain/scan/`):
  - `ScanRecord` entity
  - `ScanFraudPolicy` — pure fraud guard rules extracted from `services/scan-fraud-guard.ts`

#### 3.2 — Application Layer (Use Cases)
Each use case is a single class with one `execute()` method:

```
application/qr/
  CreateQrUseCase.ts          → validates, creates QrCode entity, persists, emits event
  UpdateQrDestinationUseCase  → guard QR caution window logic
  RecordScanUseCase           → fraud guard, dedup, increment
  DeactivateQrUseCase

application/trust/
  ComputeTrustScoreUseCase    → aggregates signals, returns TrustScore
  SubmitReportUseCase         → validates report, checks integrity, persists

application/user/
  RegisterUserUseCase         → sync Firebase UID to PG users table
  UpdateProfileUseCase
  DeleteAccountUseCase        → cascade delete all user data

application/security/
  AnalyseQrContentUseCase     → runs full security pipeline, returns AnalysisResult
```

Use cases receive repository/service **interfaces** via constructor injection — never concrete implementations.

#### 3.3 — Infrastructure Layer
- `infrastructure/persistence/` — Drizzle repository implementations
- `infrastructure/cache/` — Redis adapter (replaces 3 duplicate in-memory caching implementations)
  - Single `CacheService` with TTL-aware `get()`, `set()`, `invalidate()`, `invalidatePattern()`
  - Used by redirect routes, trust score results, and user profile reads
- `infrastructure/queue/` — BullMQ job definitions (replaces `setInterval` scheduler)
  - `PushNotificationQueue` — push re-engagement jobs
  - `AnalyticsQueue` — async scan analytics processing
  - `MaintenanceQueue` — DB housekeeping (expire old sessions, archive scans)
- `infrastructure/auth/` — Firebase Admin token verification (satisfies `IAuthProvider` interface)

#### 3.4 — Interface Layer
- `interface/routes/` — thin Express handlers that call use cases:
  ```typescript
  router.post('/qr', authMiddleware, async (req, res) => {
    const result = await createQrUseCase.execute(req.body, req.user.uid);
    res.json(result);
  });
  ```
- `interface/middleware/` — auth, rate limiting (Redis-backed), validation, signing
- `interface/dto/` — Zod schemas for all request/response shapes (replaces scattered validation)

#### 3.5 — Fix Scheduler (TD-3, SCALE-3)
- Remove `server/scheduler.ts` entirely
- Replace with BullMQ `PushNotificationWorker` in `workers/push.worker.ts`
- Worker runs in a **separate process** (separate deployment on Railway/Fly.io)
- Uses Redis-backed distributed lock (`SETNX`) to guarantee one push per user per tier per period, regardless of worker instance count
- Cron trigger: `0 */30 * * * *` (every 30 minutes) via BullMQ repeatable jobs
- Firestore query for inactive users adds a server-side filter on `lastActiveAt < (now - 24h)` with pagination (fixes PERF-1 and PERF-5)

#### 3.6 — Fix Rate Limiter (SCALE-4)
- Replace in-process rate limiter with `rate-limiter-flexible` backed by Redis (Upstash)
- Per-IP limits survive process restarts and work correctly across multiple instances
- Separate limiters for: scan recording, QR creation, comment posting, AI generation

#### 3.7 — Dynamic Threat Patterns (TD-5)
- Move `DYNAMIC_THREAT_PATTERNS` from `server/routes.ts` into a `threat_patterns` PostgreSQL table
- Admin endpoint (authenticated) to add/update/delete patterns without redeploy
- `/api/threats` endpoint reads from PostgreSQL (Redis-cached, 5-minute TTL)

### Deliverables
- [ ] All business logic in `domain/` is pure functions with 100% unit test coverage
- [ ] All use cases have integration tests against a test PostgreSQL database
- [ ] No `setInterval` in server process
- [ ] Rate limiter is Redis-backed and stateless
- [ ] `/api/threats` patterns are database-driven
- [ ] Server starts without Firebase credentials (except Auth verification)

---

## Phase 4 — Next.js Website
**Duration: 3 weeks · Risk: Low · Requires: Phase 3 API complete**

### Goal
Build the `apps/web/` Next.js application: marketing site, web QR viewer, and authenticated analytics dashboard. The mobile app is unchanged.

### Tasks

#### 4.1 — Next.js App Scaffold
- Initialise Next.js 15 in `apps/web/` with App Router + TypeScript
- Configure Turborepo to include `apps/web/` in the build pipeline
- Set up shared `packages/ui/` with components usable in both React Native and web:
  - Use a component library compatible with both platforms (e.g. Tamagui, or separate implementations with shared design tokens)
  - Shared design tokens: colours, typography scale, spacing, border radii from `shared/constants/`

#### 4.2 — Web QR Redirect (Edge Runtime)
- `apps/web/app/q/[id]/route.ts` — Edge Runtime redirect handler
  - Reads from PostgreSQL (via connection pooling with PgBouncer or Neon's serverless driver)
  - Redis cache for QR lookups (same cache as API server)
  - Returns HTTP 302 or renders caution page
  - Replaces the current Express `/q/:id` route for web traffic
  - Target: <50ms p99 response globally via Vercel Edge Network

#### 4.3 — Marketing Site (SSG/ISR)
- `app/(marketing)/` — statically generated pages:
  - `/` — Landing page
  - `/how-it-works` — Feature explanation
  - `/pricing` — Pricing tiers
  - `/privacy-policy`, `/terms` — Legal pages (migrated from current Expo screens)
  - `/blog/[slug]` — Blog (MDX, ISR with 1-hour revalidation)
- Built with Next.js ISR so content updates without redeploy

#### 4.4 — Public QR Detail Page
- `app/qr/[id]/page.tsx` — Server-rendered QR detail page
  - Shows trust score, content preview, scan count
  - Shareable URL (replaces need for deep links on web)
  - Open Graph meta tags for social sharing preview
  - Structured data (JSON-LD) for search indexing

#### 4.5 — Authenticated Dashboard
- `app/(dashboard)/` — SSR with Firebase Auth session cookie:
  - `/dashboard` — QR overview, scan statistics
  - `/dashboard/qr/[id]` — QR analytics (migrated from `MyQrAnalyticsScreen`)
  - `/dashboard/profile` — Profile management
- Authentication: Firebase Auth web SDK → get ID token → exchange for session cookie (7-day, HTTP-only, Secure)
- API calls from dashboard use session cookie (no Bearer token in JS)

#### 4.6 — Web Auth Flows
- `/auth/login`, `/auth/register`, `/auth/forgot-password` pages
- Shared logic with mobile app via `packages/core` (validation rules, error types)
- Google Sign-In button using `@react-oauth/google`

#### 4.7 — SEO & Performance
- `next/image` for all images with Cloudflare R2 / S3 as storage
- Core Web Vitals targets: LCP < 2.5s, CLS < 0.1, INP < 200ms
- `sitemap.xml` and `robots.txt` auto-generated from dynamic QR public slugs
- `<link rel="canonical">` on all pages

### Deliverables
- [ ] Marketing site deployed to Vercel, Lighthouse score >90 on all pages
- [ ] `/q/:id` Edge redirect handles 1000 req/s from Vercel Edge
- [ ] Authenticated dashboard shows real user QR data
- [ ] Web auth flows work end-to-end
- [ ] All pages have correct Open Graph + structured data

---

## Phase 5 — Mobile App Modernisation
**Duration: 3 weeks · Requires: Phase 3 API complete**

### Goal
Refactor `apps/mobile/` to use the new API exclusively (no direct Firestore calls from the client), implement offline-first sync, and consolidate duplicated code identified in the Architecture Report.

### Tasks

#### 5.1 — API Client Layer
- Create `apps/mobile/infrastructure/api/client.ts`:
  - Wraps `fetch` with base URL, auth token injection, retry logic, timeout
  - Automatically refreshes Firebase ID token before expiry
  - Returns typed responses using `packages/core` models
  - All Firestore client SDK calls in `services/` are replaced with API client calls
- Remove `firebase` client SDK from mobile app (auth only remains)
- This is the largest change in this phase — do it domain by domain, in order:
  1. User profile reads/writes
  2. QR create/update/delete
  3. Scan recording
  4. Comments
  5. Reports and trust scores
  6. Notifications

#### 5.2 — Offline-First Sync
- Implement `apps/mobile/infrastructure/storage/offline-queue.ts`:
  - Queues write operations (scan records, QR updates) when offline
  - Drains queue when connectivity is restored (uses `@react-native-community/netinfo`)
  - Idempotent operations: each queued item has a client-generated UUID
  - Conflicts resolved server-side (last-write-wins for simple fields)
- Offline read cache: wrap TanStack Query with AsyncStorage persistence adapter
  - Stale-while-revalidate: show cached data instantly, refresh in background

#### 5.3 — State Management Consolidation
- Remove `store/authStore.ts` (Zustand mirror of AuthContext — DUP identified in report)
  - Replace all `useAuthStore()` calls with `useAuth()` context hook
  - If non-React access is needed, export a `getAuthState()` function from `AuthContext`
- Remove `AvatarContext` as a separate context
  - Merge avatar state into user profile TanStack Query cache
  - Optimistic updates via `queryClient.setQueryData()`
- Result: two contexts (Auth, Theme) + three Zustand stores (ui, notifications, offline-queue)

#### 5.4 — Duplicate Code Elimination
Address all DUP issues from Architecture Report:

- **DUP-2 URL Risk Analysis**: Remove `shared/utils/url-risk.ts` and the duplicate patterns in `scam-detector.ts`. Single source in `packages/core/src/domain/security/` used by both mobile and API.
- **DUP-3 Caching**: Remove ad-hoc Maps from `server/lib/firebase-client.ts`. All server caching goes through the Redis `CacheService`.
- **DUP-4 Recent Scans**: Extract `useRecentScans` hook to a single shared hook in `apps/mobile/features/shared/hooks/`. Home and History both use it with different filter parameters.
- **DUP-5 QR Display Utils**: Consolidate into `packages/core/src/display/`. Remove `services/qr-display-utils.ts` top-level file and `features/my-qr/utils/qr-display.ts`.
- **DUP-6 Donation Banner**: Move to `apps/mobile/shared/components/DonationBanner.tsx`. Import in both qr-detail and scanner features.

#### 5.5 — Business Logic Migration Out of `shared/`
Address **TD** from Architecture Report (business logic in shared layer):

- Move `shared/utils/url-risk.ts` → `packages/core/src/domain/security/`
- Move `shared/utils/email-validator.ts` + `disposable-domains.ts` → `apps/api/src/domain/user/` (email validation is a server-side concern)
- Move `shared/utils/setup-global-error-handlers.ts` → `apps/mobile/infrastructure/error-tracking/`
- `shared/` (now `apps/mobile/shared/`) becomes purely UI atoms, hooks, and platform utils — zero business logic

#### 5.6 — Performance Improvements
- **PERF-2 Bundle Splitting**: Add `React.lazy` + `Suspense` for heavy screens:
  - Scanner (camera initialisation)
  - Generator (form-heavy, template data)
  - QR Detail (trust score computation)
- **PERF-3 Query Deduplication**: Replace 4 separate TanStack Query calls on QrDetailScreen with one `useQrDetail` query that returns a composite `QrDetailView` object from the API
- **PERF-4 AsyncStorage in scan path**: Move scan dedup check to the API (server-side, using Redis SETNX for ultra-fast dedup), remove AsyncStorage dependency from the hot scan path

### Deliverables
- [ ] Zero direct Firestore calls from mobile app (auth SDK only)
- [ ] App works in airplane mode and syncs when reconnected
- [ ] All DUP issues resolved
- [ ] `shared/utils/` contains zero business logic
- [ ] Bundle size reduced by >15% (measured with Metro bundle analyser)
- [ ] QrDetailScreen makes 1 API call instead of 4

---

## Phase 6 — Auth Migration & Global Deployment
**Duration: 2–4 weeks · Requires: Phases 3–5 complete**

### Goal
Complete Firebase Auth migration to a self-hosted or managed auth solution. Deploy the full stack globally with multi-region redundancy. Conduct load testing and security audit before launch.

### Tasks

#### 6.1 — Auth Provider Migration (Firebase → Self-Hosted)
Firebase Auth is **temporary** per the requirements. Migration path:

**Option A — Better Auth (recommended)**
- Self-hosted, runs as middleware in `apps/api/`
- Supports email/password, Google OAuth, Apple Sign-In
- Stores sessions in PostgreSQL (`auth_sessions` table)
- No vendor lock-in; runs anywhere Node.js runs

**Option B — Clerk**
- Managed service, drop-in replacement
- Better developer experience and pre-built UI components
- Per-MAU pricing (evaluate against scale projections)

**Migration Steps (either option):**
1. Deploy new auth alongside Firebase Auth (both active)
2. New registrations use new auth system; existing users remain on Firebase
3. Implement "silent migration": when an existing user logs in via Firebase, silently create a new auth account and link it to their UID
4. Migrate all server-side `getAdminAuth().verifyIdToken()` calls to new auth's `verifyToken()`
5. After 90% of MAU have migrated (tracked via `auth_provider` column in `users` table), disable Firebase Auth registration
6. After 99% migrated, remove Firebase Auth SDK from mobile and web

#### 6.2 — Infrastructure as Code
- Write Terraform (or Pulumi) configs in `infra/`:
  - Neon PostgreSQL: `development`, `staging`, `production` projects
  - Upstash Redis: two instances (`cache` and `queue`)
  - Railway (API + workers): multi-region deployment
  - Vercel (Next.js web): edge network configuration
  - Cloudflare R2: asset storage + CDN
  - Cloudflare Workers: DNS and edge routing rules

#### 6.3 — Multi-Region API Deployment
- Deploy `apps/api/` to **at least 3 regions**: `us-east-1`, `eu-west-1`, `ap-south-1` (Mumbai — critical for India-first user base)
- PostgreSQL: primary in `ap-south-1`, read replicas in `us-east-1` and `eu-west-1`
- Redis: regional Upstash instances (nearest replica reads, primary writes)
- All regions share the same PostgreSQL primary for writes; read replicas handle read traffic
- API gateway / load balancer: Cloudflare load balancing with health checks

#### 6.4 — Observability Stack
- **Structured logging**: Replace `console.log` throughout with `pino` (JSON structured logs)
- **Distributed tracing**: OpenTelemetry SDK → export to Grafana Tempo or Honeycomb
- **Metrics**: Prometheus metrics endpoint → Grafana dashboards for:
  - API p50/p95/p99 latency per route
  - Scan volume per minute (fraud detection threshold visibility)
  - Queue depths (BullMQ job lag)
  - Cache hit rate
  - DB connection pool utilisation
- **Error tracking**: Sentry for both mobile app and API
- **Uptime monitoring**: Checkly synthetic tests for critical paths (scan flow, QR redirect, auth)

#### 6.5 — Load Testing
- Write k6 load test scripts for critical paths:
  - `/q/:id` redirect: target 5,000 req/s sustained, <100ms p99
  - `POST /api/v1/scans`: target 1,000 req/s, <200ms p99
  - `GET /api/v1/qr/:id`: target 2,000 req/s, <150ms p99
- Run tests against `staging` environment with production-equivalent data volume
- Identify and fix any bottlenecks before production launch

#### 6.6 — Security Audit
- **SCALE-1 Environment Separation**: Confirm dev/staging/prod Firebase projects are separate (or Firebase removed)
- **TD-4 Server API Key**: Confirm `EXPO_PUBLIC_FIREBASE_API_KEY` is no longer used server-side
- **TD-7 Dormant BCrypt**: Remove `server/storage.ts` entirely (replaced by Clean Architecture repositories)
- External penetration test of API endpoints
- Dependency audit: `pnpm audit --production` with zero high/critical findings
- Rotate all secrets; audit GitHub Actions secrets for least-privilege

#### 6.7 — EAS Build + OTA Updates
- Configure Expo EAS Update for over-the-air JS bundle updates (no App Store review for JS changes)
- Configure EAS Build profiles: `development`, `preview`, `production`
- Automate `eas update` on every merge to `main` (using GitHub Actions)
- Document rollback procedure: `eas update:rollback --channel production`

### Deliverables
- [ ] Firebase Auth removed from mobile and API (or fully wrapped behind interface)
- [ ] Infrastructure reproducible from `infra/` directory with one command
- [ ] API deployed to 3+ regions, load balanced via Cloudflare
- [ ] Load test results meet targets at 3× projected launch traffic
- [ ] Grafana dashboard live showing all key metrics
- [ ] Zero high/critical security findings from dependency audit
- [ ] EAS Update pipeline configured and tested

---

## Migration Timeline

```
Week  1  2  3  4  5  6  7  8  9  10 11 12 13 14 15 16 17 18 19 20
      │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │  │

Ph 1  ████████████
Foundation

Ph 2           ████████████████████
PostgreSQL

Ph 3                    ████████████████████
Backend Clean Arch

Ph 4                             ████████████████████
Next.js Website

Ph 5                             ████████████████████
Mobile Modernisation (parallel with Ph 4)

Ph 6                                          ████████████████████
Auth + Global Deploy
```

**Notes:**
- Phases 4 and 5 run in parallel (different teams or sequential if solo)
- Each phase ends with a deployable state — no "big bang" deployment
- Phase 6 auth migration can be deferred if Firebase Auth is acceptable longer-term

---

## Risk Register

| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Firestore backfill misses documents | Medium | High | Dual-write + row-count validation + 90-day Firestore archive |
| PostgreSQL query performance at scale | Low | High | Index strategy documented in `packages/db/`; query explain plan tests in CI |
| Mobile app update adoption lag | High | Medium | EAS Update for JS changes; maintain Firebase Auth for 90+ days |
| Auth migration user drop-off | Medium | High | Silent migration strategy; no forced re-login for existing users |
| BullMQ Redis job loss on restart | Low | Medium | `removeOnComplete: false`; job persistence configured; dead letter queue |
| Neon cold start latency | Low | Medium | Connection pooling (PgBouncer); warm-up queries from health check |
| Apple / Google review delay during auth change | Medium | Low | Auth change is JS-only (EAS Update), no native rebuild required |
| India network latency to Mumbai region | Low | Medium | `ap-south-1` replica; CDN-cached redirect responses |

---

## Definition of Done (Production-Ready Checklist)

### Architecture
- [ ] Clean Architecture dependency rule enforced by ESLint (`eslint-plugin-boundaries`)
- [ ] Zero direct Firestore calls from mobile client
- [ ] Zero business logic in `shared/` (pure UI + platform utils only)
- [ ] All use cases have unit tests against mock repositories
- [ ] All repositories have integration tests against real test DB

### Data
- [ ] PostgreSQL is the authoritative store for all domain data
- [ ] Firestore used only for Auth (or fully removed)
- [ ] All historical data successfully migrated and verified
- [ ] Database migrations are versioned and run automatically in CI

### Performance
- [ ] QR redirect p99 < 100ms globally
- [ ] Mobile app cold start < 3 seconds on mid-range Android
- [ ] Web LCP < 2.5s on 4G mobile (Lighthouse)
- [ ] API p99 < 200ms under 1,000 req/s load

### Operations
- [ ] Zero single points of failure
- [ ] Full observability: logs, metrics, traces, alerting
- [ ] Runbook documented for: DB failover, Redis failure, BullMQ backlog, hotfix deploy
- [ ] On-call rotation and incident response process defined

### Security
- [ ] All secrets in GitHub Environments (not in code)
- [ ] No EXPO_PUBLIC_ keys used server-side
- [ ] HTTPS enforced everywhere; HSTS headers set
- [ ] Rate limiting stateful (Redis-backed) across all instances
- [ ] Dependency audit clean (zero high/critical CVEs)

### Mobile
- [ ] App works offline (read cache + write queue)
- [ ] OTA update pipeline live
- [ ] EAS Build producing signed production APK + IPA

---

## Appendix: Decisions Deferred

The following decisions are noted but intentionally **not prescribed** in this roadmap. They should be made with full team context before the relevant phase begins:

1. **Auth provider choice (Phase 6)**: Better Auth vs Clerk vs Supabase Auth vs rolling custom JWT. Evaluate based on team size, budget, and long-term vendor preference.

2. **PostgreSQL host choice**: Neon (serverless branching, great for staging) vs Supabase (row-level security built-in) vs self-managed RDS. Decision affects Phase 2 setup.

3. **Mobile UI library**: Whether to introduce Tamagui / NativeWind for shared web+mobile design tokens, or maintain separate React Native StyleSheets + Tailwind CSS for web. Affects `packages/ui/` scope in Phase 1.

4. **i18n strategy for web**: Whether to use the existing `i18next` setup across both mobile and web, or use `next-intl` for the Next.js app with shared translation files. Affects Phase 4.

5. **Payments provider**: Whether Razorpay + react-native-iap is the long-term solution or a migration to Stripe is planned. Does not block any phase but affects Phase 3 infrastructure layer design.

---

*This roadmap is a living document. Update it at the start of each phase to reflect learnings from the previous phase.*
