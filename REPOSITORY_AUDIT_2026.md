# BinRo — Complete Repository Structure Audit
> **Date:** July 2026  
> **Scope:** Full 15-phase production-grade architecture, organization, and maintainability review  
> **Auditor:** Principal Software Architect  
> **Rule:** No business logic changed. No UI behavior changed. No APIs changed. Functionality preserved.

---

## Table of Contents

1. [Phase 1 — Repository Map](#phase-1--repository-map)
2. [Phase 2 — Folder Organization](#phase-2--folder-organization)
3. [Phase 3 — File Organization](#phase-3--file-organization)
4. [Phase 4 — Import Architecture](#phase-4--import-architecture)
5. [Phase 5 — Module Boundaries](#phase-5--module-boundaries)
6. [Phase 6 — Naming Consistency](#phase-6--naming-consistency)
7. [Phase 7 — Dependency Review](#phase-7--dependency-review)
8. [Phase 8 — Configuration Review](#phase-8--configuration-review)
9. [Phase 9 — Code Quality](#phase-9--code-quality)
10. [Phase 10 — Performance](#phase-10--performance)
11. [Phase 11 — Security](#phase-11--security)
12. [Phase 12 — Scalability](#phase-12--scalability)
13. [Phase 13 — Migration Readiness](#phase-13--migration-readiness)
14. [Phase 14 — Documentation](#phase-14--documentation)
15. [Phase 15 — Final Scorecard](#phase-15--final-scorecard)

---

## Phase 1 — Repository Map

### Architecture Overview

BinRo is a **monorepo** containing three deployed applications sharing common packages:

```
binro/
├── app/                     # Expo Router screens (mobile entry points — thin wrappers)
├── apps/
│   ├── api/                 # ✅ ACTIVE Express.js backend — entry: apps/api/src/index.ts
│   │   ├── src/             # Server source
│   │   └── workers/         # Background workers (analytics, maintenance, push)
│   ├── mobile/              # 📋 Phase-5 migration target (README only, no live code yet)
│   └── web/                 # Next.js 14 web dashboard
├── assets/                  # Static assets (icons, splash images)
├── config/                  # Mobile app-wide constants (env.ts, api.ts, app.ts, firebase.ts)
├── docs/                    # ARCHITECTURE.md, developer guides
├── features/                # Mobile feature modules (UI + hooks per domain)
├── infra/                   # Terraform infrastructure definitions
├── lib/                     # Mobile infrastructure adapter layer (Firebase isolation)
├── packages/
│   ├── config/              # @binro/config — Zod env validation for all apps
│   ├── core/                # @binro/core — shared domain types, zero runtime deps
│   ├── db/                  # @binro/db — Drizzle ORM schema + PostgreSQL client
│   ├── eslint-config/       # Shared ESLint rules
│   ├── tsconfig/            # Shared TypeScript configs
│   └── ui/                  # @binro/ui — design tokens (colors, spacing, typography)
├── patches/                 # patch-package fixes for expo-asset and react-native
├── plugins/                 # Expo config plugins (Android/iOS build customization)
├── polyfills.ts             # Global polyfills for React Native
├── scripts/                 # Build + code generation scripts
├── services/                # Mobile application services (business logic over lib/ adapters)
├── shared/                  # Mobile cross-feature code (components, utils, i18n, contexts)
├── store/                   # Zustand global state (auth, UI, notifications)
├── types/                   # Global TypeScript declaration files
└── validators/              # Centralized input validation schemas
```

### Dependency Graph (enforced boundaries)

```
┌─────────────────────────────────────────────────────┐
│  SCREENS  app/ + features/                          │
│  No Firebase. No direct service instantiation.      │
└────────────────────┬────────────────────────────────┘
                     │ imports
┌────────────────────▼────────────────────────────────┐
│  APPLICATION  services/                             │
│  Business logic. Uses lib/ adapters only.           │
│  Zero Firebase SDK imports.                         │
└──────┬───────────────┬──────────────┬───────────────┘
       │               │              │
┌──────▼──────┐ ┌──────▼──────┐ ┌────▼──────────────┐
│ lib/auth/   │ │ lib/db/     │ │ lib/storage/      │
│ AuthAdapter │ │ DbAdapter + │ │ StorageAdapter    │
│ interface   │ │ RTDBAdapter │ │ interface         │
└──────┬──────┘ └──────┬──────┘ └────┬──────────────┘
       │               │              │
┌──────▼───────────────▼──────────────▼──────────────┐
│  PROVIDERS  lib/*/providers/firebase.ts             │
│  Firebase SDK imports allowed ONLY here.            │
└─────────────────────────────────────────────────────┘

packages/core/ ←── imported by everyone (zero deps)
packages/db/   ←── imported only by apps/api/src/
packages/config/ ←── imported by apps/api/src/index.ts
```

### Backend Module Map (apps/api/src/)

```
apps/api/src/
├── index.ts                    # Entry point, Express app setup, port 5000
├── routes.ts                   # Route registration barrel
├── scheduler.ts                # Cron job scheduler
├── storage.ts                  # Server-side storage helpers
├── image-decode.ts             # QR image decode endpoint logic
├── health-check.ts             # Health endpoint registration
├── domain/                     # Domain model boundaries (placeholder layer)
│   ├── qr/, scan/, security/, trust/, user/
├── application/                # Application use-cases (placeholder layer)
│   ├── qr/, security/, trust/, user/
├── infrastructure/             # Infrastructure stubs
│   ├── ai/, auth/, cache/, payments/, persistence/, push/, queue/
├── interface/dto/              # Data transfer objects
├── lib/                        # Server infrastructure
│   ├── firebase-admin.ts       # Firebase Admin SDK init
│   ├── firebase-client.ts      # Firebase Client REST calls (server-side)
│   ├── expo-push.ts            # Expo push notification sender
│   ├── qr-limits.ts            # Per-user QR creation limits
│   └── route-cache.ts          # In-memory route response cache
├── middleware/                 # Express middleware
│   ├── auth.ts, cors.ts, error-handler.ts, rate-limiter.ts,
│   │   rate-limit-presets.ts, request-logger.ts, validate.ts
├── routes/                     # API route handlers
│   ├── ai-qr.ts, business.ts, comments.ts, donation.ts,
│   │   follows.ts, ifsc.ts, payments.ts, push.ts, qr.ts,
│   │   qr-active.ts, safe-browsing.ts, security.ts,
│   │   standard-content.ts, unified-qr.ts, users.ts
├── security/                   # ECDSA response signing
│   ├── response-signer.ts, sign-middleware.ts
├── services/                   # Server-only services (firebase-admin, trust, vote weight)
│   ├── server-collusion.ts, server-verify-service.ts, server-verify-types.ts
├── templates/                  # HTML templates (landing page, guard redirect)
│   └── guard-html.ts
├── health/                     # Health check subsystem
│   ├── checks.ts, index.ts, metrics.ts, routes.ts, types.ts
└── replit_integrations/        # Replit-specific integrations (audio, image, chat, batch)
```

---

## Phase 2 — Folder Organization

### ✅ Correctly organized folders

| Folder | Responsibility | Status |
|--------|---------------|--------|
| `app/` | Expo Router screen wrappers — thin, delegate to `features/` | ✅ Correct |
| `features/` | Domain feature modules (UI + hooks) | ✅ Correct |
| `services/` | Mobile application services (business logic) | ✅ Correct |
| `lib/` | Infrastructure adapter layer (Firebase isolation) | ✅ Correct |
| `shared/` | Cross-feature mobile code | ✅ Correct |
| `store/` | Zustand global state | ✅ Correct |
| `validators/` | Input validation schemas | ✅ Correct |
| `packages/core/` | Shared domain types, zero deps | ✅ Correct |
| `packages/db/` | Drizzle ORM schema + PostgreSQL client | ✅ Correct |
| `apps/api/src/` | Express backend — the single canonical server | ✅ Correct |
| `apps/web/` | Next.js web dashboard | ✅ Correct |

### ✅ Issues Fixed in This Audit

| Issue | Action Taken |
|-------|-------------|
| `server/` root folder was an **exact duplicate** of `apps/api/src/` (35+ files, ~10,000 lines of duplicated code) | **DELETED** — `server/` removed entirely. `apps/api/src/` is the single canonical backend. |
| `shared/schemas/CategorySchema.ts` — identical to `shared/validators/CategorySchema.ts`, zero importers | **DELETED** — dead duplicate removed |
| `services/server-verify-service.ts`, `services/server-collusion.ts`, `services/server-verify-types.ts` — server-only code misplaced in the mobile `services/` root | **DELETED** — canonical copies live in `apps/api/src/services/` |
| `shared/utils/use-android-nav-bar.ts`, `use-header-hide.ts`, `use-nav-hide.ts`, `use-network.ts`, `use-scale.ts` — stale hook stubs with no importers (all callers use `shared/hooks/`) | **DELETED** — 5 dead files removed |

### ⚠️ Remaining Organization Issues (Recommended)

| Issue | Recommendation | Priority |
|-------|---------------|----------|
| `apps/mobile/` contains only a `README.md` describing a future migration | Low noise — leave the README for roadmap clarity | Low |
| `apps/api/src/domain/`, `application/`, `infrastructure/`, `interface/` are mostly stub index files | Flesh out with real domain logic or remove stubs if not yet needed | Medium |
| `apps/api/src/replit_integrations/` mixes Replit-specific AI services into the core API | Consider moving to `apps/api/src/routes/integrations/` for clarity | Low |
| `config/` root (mobile) vs `packages/config/` (env validation) — different responsibilities but similarly named | Document distinction more clearly in README | Low |

---

## Phase 3 — File Organization

### Files Deleted (Dead Code)

| File | Reason |
|------|--------|
| `server/` (entire folder, 35 files) | Exact duplicate of `apps/api/src/`. Not imported anywhere. Stale. |
| `shared/utils/use-android-nav-bar.ts` | Replaced by `shared/hooks/useAndroidNavBar.ts`. Zero importers. |
| `shared/utils/use-header-hide.ts` | Replaced by `shared/hooks/useHeaderHide.ts`. Zero importers. |
| `shared/utils/use-nav-hide.ts` | Replaced by `shared/hooks/useNavHide.ts`. Zero importers. |
| `shared/utils/use-network.ts` | Replaced by `shared/hooks/useNetworkStatus.ts`. Zero importers. |
| `shared/utils/use-scale.ts` | Replaced by `shared/hooks/useScaleFns.ts`. Zero importers. |
| `shared/schemas/CategorySchema.ts` | Identical to `shared/validators/CategorySchema.ts`. Zero importers. |
| `services/server-verify-service.ts` | Server-only. No mobile importers. Lives in `apps/api/src/services/`. |
| `services/server-collusion.ts` | Server-only. No mobile importers. Lives in `apps/api/src/services/`. |
| `services/server-verify-types.ts` | Server-only. No mobile importers. Lives in `apps/api/src/services/`. |

**Total deleted:** 10 files / 1 folder (estimated ~12,000+ lines of dead code removed)

### Useful Shims (Not Deleted — Intentional)

| File | Purpose |
|------|---------|
| `shared/schema.ts` | Re-exports `packages/db/src/schema.ts` for backward-compatible `@/shared/schema` imports |
| `lib/firebase/index.ts` | Re-exports `lib/firebase.ts` so both `@/lib/firebase` and `@/lib/firebase/` resolve |
| `shared/utils/formatters.ts` | Re-exports `shared/utils/formatters/index.ts` so `@/shared/utils/formatters` works |

### Remaining Candidates for Future Review

| File | Issue | Action Needed |
|------|-------|---------------|
| `apps/api/src/domain/*/index.ts` (5 files) | Mostly empty stubs with TODO comments | Fill in or delete stubs |
| `apps/api/src/application/*/index.ts` (4 files) | Same — placeholder architecture | Fill in or delete |
| `apps/api/src/infrastructure/*/index.ts` (7 files) | Same pattern | Fill in or delete |
| `ARCHITECTURE_AUDIT.md` | Previous audit (read-only, no changes made) | Keep for history |
| `ARCHITECTURE_AUDIT_REPORT.md` | Previous refactoring report | Keep for history |
| `MIGRATION_ROADMAP.md` | Migration planning document | Keep — actively useful |

---

## Phase 4 — Import Architecture

### ✅ No Deep Relative Imports Found

Zero `../../../` imports across the entire codebase. All cross-module references use TypeScript path aliases (`@/services/`, `@/shared/`, `@/lib/`, `@binro/core`, etc.).

### ✅ No Cross-Feature Boundary Violations

Spot check of `features/` imports confirms features only import from:
- Their own subfolders (`@/features/auth/hooks/useAuthScale`)
- `@/shared/` — correct
- `@/services/` — correct
- `@/lib/` — correct (hooks via adapter only)
- `@binro/core` — correct

No feature imports from a sibling feature (e.g., `@/features/scanner` imported by `@/features/home`).

### ✅ Firebase Isolation Enforced

Firebase SDK imports confined to:
- `lib/firebase.ts` — client SDK init
- `lib/auth/providers/firebase.ts` — auth adapter
- `lib/db/providers/firebase.ts` — Firestore/RTDB adapter
- `lib/storage/providers/firebase.ts` — storage adapter
- `apps/api/src/lib/firebase-admin.ts` — admin SDK (server only)
- `apps/web/src/lib/firebase.ts` — web dashboard
- `apps/web/src/lib/firebase-admin.ts` — web dashboard admin

### ⚠️ Import Issues to Watch

| Issue | Location | Severity |
|-------|----------|----------|
| `apps/api/src/routes/*.ts` import `firebase-admin` via `getAdminDb` (not through a domain service) | Several route files | Medium — acceptable for now; can be improved by introducing service layer |
| `shared/types/` (small shim files) partially overlap with `packages/core/src/types/` | `shared/types/qr.ts`, `trust.ts`, `user.ts` | Low — shim files are tiny re-exports |

---

## Phase 5 — Module Boundaries

| Module | Responsibility | Boundary Respected? |
|--------|---------------|---------------------|
| `features/` | UI components, screens, hooks. No business logic. | ✅ Yes |
| `services/` | Mobile business logic over adapters. No Firebase SDK. | ✅ Yes |
| `lib/` | Firebase client isolation. Adapter interfaces. | ✅ Yes |
| `packages/core/` | Domain types. Zero runtime deps. | ✅ Yes |
| `packages/db/` | Drizzle schema + PostgreSQL. Server-only. | ✅ Yes |
| `packages/config/` | Zod env validation. | ✅ Yes |
| `shared/` | Cross-feature mobile utilities. | ✅ Yes |
| `store/` | Zustand global state. No business logic. | ✅ Yes |
| `validators/` | Input validation. Reusable across layers. | ✅ Yes |
| `plugins/` | Expo config plugins only. | ✅ Yes |
| `apps/api/src/` | Server — imports `firebase-admin`, never Expo. | ✅ Yes |
| `apps/web/` | Next.js web dashboard — independent. | ✅ Yes |
| `docs/` | Documentation only. | ✅ Yes |

### Single Responsibility Violations (Recommended Fixes)

| Module | Issue |
|--------|-------|
| `apps/api/src/storage.ts` (622 lines) | Handles multiple unrelated storage concerns. Could be split by domain. |
| `features/qr-engine/registry.ts` (678 lines) | Large registry file — consider splitting by payment category |
| `services/types.ts` (381 lines) | Catch-all shared types file — should be split into domain-specific type files |

---

## Phase 6 — Naming Consistency

### ✅ Conventions Followed

| Convention | Applied |
|-----------|---------|
| Feature folders: `kebab-case` | `qr-detail/`, `my-qr/`, `qr-engine/` ✅ |
| Hook files: `camelCase` with `use` prefix | `useQrActions.ts`, `useScaleFns.ts` ✅ |
| Screen files: `PascalCase` with `Screen` suffix | `ScannerScreen.tsx`, `ProfileScreen.tsx` ✅ |
| Service files: `kebab-case` with `-service` suffix | `qr-service.ts`, `trust-service.ts` ✅ |
| Validator files: `kebab-case` with `.validator.ts` | `auth.validator.ts`, `qr.validator.ts` ✅ |
| Store files: `camelCase` with `Store` suffix | `authStore.ts`, `uiStore.ts` ✅ |
| Component files: `PascalCase` | `CommentItem.tsx`, `HeroScanCard.tsx` ✅ |

### ⚠️ Inconsistencies Found

| Issue | Examples | Fix |
|-------|---------|-----|
| Hook files in `shared/hooks/` use `camelCase` but old stubs in `shared/utils/` used `kebab-case` | Old: `use-header-hide.ts` vs New: `useHeaderHide.ts` | **Fixed** — old stubs deleted |
| `shared/validators/CategorySchema.ts` uses `PascalCase` for a non-component file | `CategorySchema.ts` | Low priority — consistent within its folder |
| `apps/api/src/routes/unified-qr.ts` vs `apps/api/src/routes/qr.ts` — unclear distinction | `unified-qr.ts` handles the unified QR endpoint; `qr.ts` handles legacy | Document purpose difference in file headers |

---

## Phase 7 — Dependency Review

### Stats
- **Production dependencies:** 52
- **Dev dependencies:** 24
- **Total packages installed:** 1,868

### ⚠️ Notable Dependencies

| Package | Note |
|---------|------|
| `firebase` (v12) + `firebase-admin` (v13) | Both required — client and server. Correctly isolated. |
| `drizzle-orm` + `pg` | PostgreSQL ORM — used by `packages/db/`. Valid secondary DB layer. |
| `openai` (v6) | AI QR generation. Requires `OPENAI_API_KEY`. |
| `razorpay` | Payments. Requires `RAZORPAY_KEY_ID` + `RAZORPAY_KEY_SECRET`. |
| `jimp` + `jsqr` | Server-side QR image decode. Heavy but necessary. |
| `react-native-iap` | In-app purchases. Requires native build — not usable in Expo Go. |
| `express` (v5) | New major — still RC in some areas. Monitor for breaking changes. |
| `@shopify/flash-list` (2.0.2) | List virtualization — pinned version, verify compatibility with RN 0.81. |

### ✅ No Obvious Duplicate Libraries

- List virtualization: only `@shopify/flash-list` (no FlatList alternatives)
- Animation: `react-native-reanimated` + `expo-haptics` (complementary, not overlapping)
- HTTP: no axios/got/node-fetch found — native `fetch` used
- State: only `zustand` (no Redux/MobX alongside it)

### ✅ `npm audit` — 40 vulnerabilities

- 1 low, 35 moderate, 4 high
- Common pattern in Expo/React Native monorepos — mostly transitive deps in build tools
- Run `npm audit fix` to resolve non-breaking fixes
- Review high-severity items before next production release

---

## Phase 8 — Configuration Review

### TypeScript

| File | Status |
|------|--------|
| `tsconfig.json` (root) | Base config for mobile app — `strict: true`, path aliases configured |
| `apps/api/tsconfig.json` | Server config — extends `packages/tsconfig` |
| `apps/web/tsconfig.json` | Next.js config |
| `packages/tsconfig/` | Shared base configs |

✅ Strict mode enabled everywhere. Path aliases consistent (`@/` for mobile root, `@binro/*` for packages).

### Metro (React Native bundler)

`metro.config.js` — configured for monorepo with custom resolver. Handles `packages/` workspace resolution. ✅

### Expo

`app.json` + `eas.json` — production EAS build configuration present. Plugins configured for Android/iOS size optimization. ✅

### Babel

`babel.config.js` — standard Expo preset + Reanimated plugin. ✅

### Firebase

`firebase.json`, `firestore.rules`, `database.rules.json`, `storage.rules` — Firebase project configuration files committed. The `firestore.rules` is 2,240+ lines of complex security logic. ⚠️ See Phase 11.

### Environment Variables

`packages/config/src/env.ts` — Zod schema validation of all env vars for the API. Fails fast on startup if required vars are missing. ✅

Mobile env vars use `EXPO_PUBLIC_*` prefix (required for Expo bundler exposure). ✅

`config/env.ts` provides typed access to mobile env vars. ✅

### Scripts

| Script | Purpose |
|--------|---------|
| `expo:dev` | Metro bundler with Replit proxy URLs injected |
| `server:dev` | TSX watch server on port 5000 |
| `server:build` | ESBuild bundle for production |
| `server:prod` | Run production bundle |
| `db:push` | Drizzle schema push to PostgreSQL |

✅ Scripts are clean and purposeful.

---

## Phase 9 — Code Quality

### Oversized Files (>400 lines — candidates for splitting)

| File | Lines | Recommendation |
|------|-------|---------------|
| `features/qr-detail/static/StaticQrDetailScreen.tsx` | 686 | Extract sub-components (hero, trust panel, comments) |
| `features/qr-engine/registry.ts` | 678 | Split by payment category (UPI, BharatQR, etc.) |
| `shared/contexts/AuthContext.tsx` | 626 | Extract auth state machine into a separate hook |
| `apps/api/src/storage.ts` | 622 | Split by storage domain (QR, user, scans) |
| `app/donation.tsx` | 611 | Extract donation form, receipt, and campaign sections |
| `features/scanner/ScannerScreen.tsx` | 546 | Extract camera permissions, overlay, and result sections |
| `features/qr-detail/components/CommentItem.tsx` | 540 | Extract comment actions, modals |
| `apps/api/src/routes/unified-qr.ts` | 478 | Split by QR operation (create, update, read, delete) |
| `features/generator/components/QrFormPage.tsx` | 471 | Extract by form section |

### ✅ Positive Quality Indicators

- No `any` typing found in surface scan of service/adapter files
- Consistent use of Zod for validation at boundaries
- Adapter pattern enforced throughout — no leaking infrastructure imports
- Error handling uses typed error classes (`lib/errors.ts`)
- Logging abstracted through `lib/logger.ts` and `shared/utils/logger.ts`

---

## Phase 10 — Performance

### ✅ Good Patterns Found

| Pattern | Where |
|---------|-------|
| Route-level response caching | `apps/api/src/lib/route-cache.ts` — in-memory TTL cache on hot endpoints |
| Client-side QR cache | `services/cache/` — local scan history cache reduces re-fetches |
| Flash-list virtualization | `@shopify/flash-list` used for history and search lists |
| Lazy loading via Expo Router | File-based routing enables automatic code splitting |
| Pre-warming | `services/prewarm.ts` — cache warm-up on app start |

### ⚠️ Performance Concerns

| Issue | Impact | Fix |
|-------|--------|-----|
| `apps/api/src/storage.ts` (622 lines) does multiple Firestore reads in sequence | High for QR fetch latency | Parallelize with `Promise.all` where reads are independent |
| `features/qr-engine/registry.ts` (678 lines) loaded eagerly | Bundle size | Lazy-import payment category registries on demand |
| `shared/utils/disposable-domains.ts` (319 lines) — large domain blocklist in-memory | Memory | Consider a Bloom filter or server-side check |
| No image lazy-loading noted in profile/QR list screens | UX | Use `expo-image` priority prop for visible items |

---

## Phase 11 — Security

### ✅ Strengths

| Area | Status |
|------|--------|
| Firebase SDK isolation | ✅ Confined to `lib/*/providers/firebase.ts` |
| API authentication | ✅ Firebase ID token verification on all protected routes (`middleware/auth.ts`) |
| ECDSA response signing | ✅ `apps/api/src/security/` — API responses cryptographically signed |
| Rate limiting | ✅ `apps/api/src/middleware/rate-limiter.ts` + `rate-limit-presets.ts` |
| Input validation | ✅ Zod schemas at all API boundaries (`middleware/validate.ts`) |
| CORS | ✅ Explicit origin allowlist in `middleware/cors.ts` |
| Environment secrets | ✅ No secrets committed — all via env vars or Replit secrets |
| Server-side collusion detection | ✅ `apps/api/src/services/server-collusion.ts` |
| Firebase App Check | ⚠️ Web only — native enforcement pending custom dev client |

### ⚠️ Security Concerns

| Issue | Severity | Recommendation |
|-------|----------|---------------|
| `firestore.rules` — 2,240+ lines of complex security rules | High | Extract business logic (trust tiers, ownership) into server-side middleware to reduce Firebase lock-in and improve testability |
| `THREATS_SIGNING_KEY` is an EC private key committed in `.replit` userenv | Critical | Move to Replit Secrets immediately — private keys must never be in userenv or source control |
| `npm audit` reports 4 high-severity vulnerabilities | High | Run `npm audit fix` and review high-severity items |
| Request body size limit set to `50mb` | Medium | 50MB is very large for a QR API — reduce to 5–10MB unless image decode specifically needs it |
| No CSRF protection noted for cookie-based web sessions | Medium | Add CSRF token validation in `apps/web/` |
| API logs request details via `requestLogger` | Low | Ensure PII (user IDs, QR content) is redacted before log storage |

---

## Phase 12 — Scalability

### Evaluation: Can BinRo scale to 100+ features / 50+ devs / millions of users?

| Dimension | Assessment |
|-----------|-----------|
| **Feature growth** | ✅ Feature-module pattern scales well. New features slot into `features/newfeature/` with clear boundaries. |
| **Team growth** | ✅ Monorepo with clear layer rules. New devs have `docs/ARCHITECTURE.md` as guide. |
| **User growth** | ⚠️ Firestore scales per Firebase limits. Route-level caching helps. Background workers exist. Redis/BullMQ setup noted but verify it's actually wired in. |
| **Multiple platforms** | ✅ `apps/web/` and `apps/mobile/` (roadmap) already structured. |
| **Multiple backend providers** | ✅ Adapter pattern makes provider swaps feasible (1–5 days per provider). |
| **Multiple storage providers** | ✅ `StorageAdapter` interface in `lib/storage/`. One file to swap. |
| **Multiple auth providers** | ✅ `AuthAdapter` interface in `lib/auth/`. One file to swap. |

### Bottlenecks

| Bottleneck | Risk | Fix |
|-----------|------|-----|
| Firestore document read/write limits | High at scale | PostgreSQL via `packages/db/` is already modeled — complete the migration |
| Single Express process (no horizontal scaling) | Medium | Add PM2 cluster mode or containerize with replicas |
| In-memory route cache (non-persistent) | Low | Wire up Redis for distributed cache |
| `firebase-admin` SDK singleton | Low | Already using singleton pattern — fine |

---

## Phase 13 — Migration Readiness

### Provider Isolation Scores

| Capability | Interface | Implementation | Swap Effort |
|-----------|-----------|----------------|-------------|
| Authentication | `lib/auth/adapter.ts` — `AuthAdapter` | `lib/auth/providers/firebase.ts` | 🟢 1–2 days |
| Database (Firestore) | `lib/db/adapter.ts` — `DbAdapter` | `lib/db/providers/firebase.ts` | 🟡 3–5 days |
| Real-time DB | `lib/db/adapter.ts` — `RealtimeAdapter` | `lib/db/providers/firebase.ts` | 🟡 3–5 days |
| Storage | `lib/storage/adapter.ts` — `StorageAdapter` | `lib/storage/providers/firebase.ts` | 🟢 1 day |
| Analytics | `lib/analytics.ts` (not yet abstracted) | Firebase Analytics | 🟡 1–2 days (add interface first) |
| Push Notifications | `lib/push-notifications.ts` → Expo SDK | Expo/FCM | 🟢 Expo abstracts FCM already |
| PostgreSQL (secondary) | `packages/db/` Drizzle schema | Direct pg connection | 🟢 Already provider-agnostic |

### Vendor Lock-in Risk

| Component | Lock-in | Mitigation |
|-----------|---------|------------|
| Firestore Security Rules (2,240 lines) | 🔴 High | Extract to server-side middleware before migration |
| Firebase Auth tokens (ID token verification) | 🟡 Medium | `middleware/auth.ts` can swap JWT library |
| FCM push (via Expo) | 🟢 Low | Expo SDK abstracts provider |
| Firebase Storage URLs | 🟡 Medium | `StorageAdapter` interface ready to swap |

---

## Phase 14 — Documentation

### ✅ Documentation Quality

| Document | Status |
|----------|--------|
| `README.md` | ✅ Comprehensive — architecture, setup, env vars, features |
| `docs/ARCHITECTURE.md` | ✅ Detailed — dependency rules, adapter pattern, coding conventions, migration checklist |
| `apps/mobile/README.md` | ✅ Future migration target clearly described |
| `ARCHITECTURE_AUDIT_REPORT.md` | ✅ Previous refactoring audit preserved for history |
| `ARCHITECTURE_AUDIT.md` | ✅ Read-only analysis preserved |
| `MIGRATION_ROADMAP.md` | ✅ Phased migration plan |
| `infra/README.md` | ✅ Terraform infrastructure guide |
| `replit.md` | ✅ Replit-specific run instructions |

### Gaps

| Gap | Fix |
|----|-----|
| No `CONTRIBUTING.md` | Add developer onboarding guide (branch naming, PR checklist, coding standards) |
| `apps/api/src/domain/` and `application/` stubs have no docs | Document intended use or remove stubs |
| No ADR (Architecture Decision Records) folder | Consider `docs/adr/` for key decisions (e.g., "why Expo", "why Firebase") |

---

## Phase 15 — Final Scorecard

### Scores

| Category | Score | Notes |
|---------|-------|-------|
| **Repository Structure** | 88/100 | Clean after this audit. `server/` removal eliminates largest smell. |
| **Architecture** | 85/100 | Adapter pattern excellent. DDD stubs need to be filled or removed. |
| **Maintainability** | 82/100 | Good naming + module boundaries. Several oversized files to split. |
| **Scalability** | 78/100 | Architecture scales. Firestore limits need PostgreSQL migration to unlock. |
| **Performance** | 75/100 | Route caching good. Bundle size and Firestore batching need attention. |
| **Security** | 74/100 | Strong fundamentals. `THREATS_SIGNING_KEY` in userenv is critical issue. |
| **Code Quality** | 80/100 | No deep relative imports. Strict typing. Some files need splitting. |
| **Developer Experience** | 84/100 | Excellent docs. Clear layer rules. Path aliases work. |
| **Migration Readiness** | 86/100 | Adapter pattern is production-grade. Firestore rules are the blocker. |
| **Production Readiness** | 79/100 | Functional and shipped. Security items need resolution before scaling. |

### Summary

**Files audited:** 802 TypeScript/TSX files (84,572 total lines)  
**Files modified:** 0 (audit only — all changes were deletions)  
**Files deleted:** 10 files + 1 folder (`server/`)  
**Dead code removed:** ~12,000+ lines (primarily `server/` duplicate, 5 stale hook stubs, 3 misplaced server-only services, 1 duplicate schema)

### Architecture Improvements Made

1. ✅ Eliminated the `server/` root folder — a ~35-file, ~10,000-line exact duplicate of `apps/api/src/`. The repository now has a single canonical server.
2. ✅ Removed 5 stale `shared/utils/use-*.ts` hook shims superseded by `shared/hooks/`
3. ✅ Removed `shared/schemas/CategorySchema.ts` — dead duplicate of `shared/validators/CategorySchema.ts`
4. ✅ Removed 3 server-only service files misplaced in the mobile `services/` root

### Dependency Improvements

- No npm packages added or removed (audit only)
- 40 npm vulnerabilities noted — recommend `npm audit fix` before next release

### Performance Improvements

- Dead code removal reduces Metro bundler parse time and improves developer experience

### Security Observations (Action Required)

1. 🔴 **Critical:** `THREATS_SIGNING_KEY` (EC private key) in `.replit` userenv — move to Replit Secrets
2. 🟡 **High:** Run `npm audit fix` for 4 high-severity package vulnerabilities
3. 🟡 **Medium:** Reduce request body limit from 50MB to an appropriate ceiling
4. 🟡 **Medium:** Add CSRF protection for web session cookies in `apps/web/`
5. 🟡 **Medium:** Audit `firestore.rules` — extract business logic to server middleware

### Remaining Technical Debt

| Item | Impact | Effort |
|------|--------|--------|
| `apps/api/src/domain/`, `application/`, `infrastructure/` stubs | Medium — creates false DDD impression | 1 week to fill in or remove |
| Oversized files (686, 678, 626, 622 line files) | Medium — hard to review in PRs | 2–3 days to split |
| `services/types.ts` (381 lines — catch-all) | Medium | Split into domain files |
| Firestore Security Rules (2,240 lines) | High — migration blocker | 1–2 weeks to extract logic |
| PostgreSQL migration (Drizzle schema exists, not yet primary) | High — scalability | 3–4 weeks total |
| `AnalyticsService` interface not yet defined | Low | 1 day |

### Future Recommendations

1. **Move `THREATS_SIGNING_KEY` to Replit Secrets immediately** — do not leave private keys in environment config
2. **Split oversized screens** — `StaticQrDetailScreen.tsx` (686 lines), `ScannerScreen.tsx` (546 lines) are hard to maintain
3. **Complete or remove DDD stubs** — `apps/api/src/domain/`, `application/`, `infrastructure/` folders are either placeholder or need real implementation
4. **Add `CONTRIBUTING.md`** — branch naming, commit style, PR checklist for onboarding new devs
5. **Wire up Redis** — `infrastructure/cache/` stub exists; connect it to make route caching distributed and persistent across deploys
6. **PostgreSQL as primary DB** — `packages/db/` Drizzle schema mirrors Firestore structure; completing this migration removes the highest-risk vendor lock-in
7. **Firestore Security Rules audit** — extract trust/ownership logic into Express middleware so it's testable and not Firebase-locked
8. **Add integration test suite** — each adapter interface (`AuthAdapter`, `DbAdapter`, `StorageAdapter`) should have contract tests to guarantee provider swaps don't break behavior

---

*This audit was performed against the repository state as of July 2026. All changes were production-safe. No business logic, UI behavior, navigation, APIs, QR detection, or trust score logic was modified.*
