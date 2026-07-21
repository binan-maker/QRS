# BinRo — Architecture Audit Report

> **Scope:** Full Firebase dependency audit, clean architecture design, repository interfaces, Firestore/Storage/Auth audits, and migration readiness assessment.
> **Date:** July 2026
> **Status:** Audit complete. Refactoring implemented (Phases 1–5). Phases 6–9 are recommendations only.

---

## Phase 1 — Firebase Dependency Map

### Complete Firebase Import Inventory

| File | SDK | What It Does | Layer |
|---|---|---|---|
| `lib/firebase.ts` | `firebase/app`, `firebase/auth`, `firebase/firestore`, `firebase/database`, `firebase/storage` | Initializes all Firebase Client SDK instances | **Infrastructure** ✅ |
| `lib/auth/providers/firebase.ts` | `firebase/auth` | Implements AuthAdapter using Firebase Auth | **Infrastructure** ✅ |
| `lib/db/providers/firebase.ts` | `firebase/firestore`, `firebase/database` | Implements DbAdapter + RealtimeAdapter using Firestore/RTDB | **Infrastructure** ✅ |
| `lib/storage/providers/firebase.ts` | `firebase/storage` | Implements StorageAdapter using Firebase Storage | **Infrastructure** ✅ (new) |
| `apps/api/src/lib/firebase-admin.ts` | `firebase-admin` | Initializes Admin SDK for the API server | **Infrastructure** ✅ |
| `apps/web/src/lib/firebase.ts` | `firebase/app`, `firebase/auth` | Web dashboard Firebase init | **Infrastructure** ✅ |
| `apps/web/src/lib/firebase-admin.ts` | `firebase-admin` | Web dashboard Admin SDK | **Infrastructure** ✅ |
| `server/lib/firebase-admin.ts` | `firebase-admin` | Legacy server Firebase Admin (mirrors `apps/api`) | **Infrastructure** ⚠️ Duplicate |
| `apps/api/src/middleware/auth.ts` | `firebase-admin` | Verifies Firebase ID tokens on API requests | **Infrastructure** ✅ |
| `apps/api/src/routes/*.ts` | `firebase-admin` (via `getAdminDb`) | Server-side Firestore reads/writes for API routes | **Server** ✅ Acceptable |
| `shared/contexts/AuthContext.tsx` | None (uses `authAdapter`) | Auth state management via adapter | **UI** ✅ Clean |
| `apps/web/src/contexts/auth-context.tsx` | `firebase/auth` | Web dashboard auth context | Web only |

### Violations Fixed by This Refactoring

| File | Violation | Fix Applied |
|---|---|---|
| `services/storage-service.ts` | Imported `firebase/storage` directly | Now uses `storageAdapter` from `lib/storage` |
| `services/consent-service.ts` | Imported `firebase/firestore` directly AND passed `DbAdapter` to raw Firestore `doc()` calls (broken) | Now uses `db` adapter properly |
| `services/donation-service.ts` | Imported `firestore` from `lib/firebase` and `firebase/firestore` | Now uses `db.query()` adapter |

### Dependency Graph

```
┌─────────────────────────────────────────────────────────┐
│  PRESENTATION LAYER (features/, app/, shared/contexts/) │
│  No Firebase imports. Uses hooks → services only.       │
└────────────────────────────┬────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────┐
│  APPLICATION LAYER (services/)                          │
│  Business logic. Imports only lib/auth, lib/db,         │
│  lib/storage. Zero Firebase SDK imports.                │
└──────────┬─────────────────┬──────────────┬────────────┘
           │                 │              │
┌──────────▼───┐  ┌──────────▼───┐  ┌──────▼──────────┐
│ lib/auth     │  │  lib/db      │  │  lib/storage    │
│ AuthAdapter  │  │  DbAdapter   │  │  StorageAdapter │
│ (interface)  │  │  (interface) │  │  (interface)    │
└──────────┬───┘  └──────────┬───┘  └──────┬──────────┘
           │                 │              │
┌──────────▼─────────────────▼──────────────▼──────────┐
│  DATA SOURCE LAYER (lib/*/providers/firebase.ts)      │
│  Firebase SDK imports live HERE and ONLY HERE.        │
│  firebase/auth  |  firebase/firestore  |  firebase/   │
│                 |  firebase/database   |  storage     │
└───────────────────────────────────────────────────────┘
```

---

## Phase 2 — Clean Architecture Design

### Layer Responsibilities

| Layer | Location | Allowed Imports |
|---|---|---|
| **Presentation** | `features/`, `app/`, `shared/` | Services, hooks, UI libs |
| **Application** | `services/` | `lib/auth`, `lib/db`, `lib/storage`, `packages/core` |
| **Repository** | `lib/*/adapter.ts` | TypeScript interfaces only |
| **Data Source** | `lib/*/providers/firebase.ts` | Firebase SDK, provider config |

### What Changed

Before this refactoring, the dependency graph had holes:

```
services/storage-service.ts  ──────────────►  firebase/storage   ❌
services/consent-service.ts  ──────────────►  firebase/firestore  ❌ (and broken)
services/donation-service.ts ──────────────►  firebase/firestore  ❌
```

After:

```
services/storage-service.ts  ──►  lib/storage (StorageAdapter)  ──►  firebase/storage   ✅
services/consent-service.ts  ──►  lib/db (DbAdapter)            ──►  firebase/firestore  ✅
services/donation-service.ts ──►  lib/db (DbAdapter)            ──►  firebase/firestore  ✅
```

---

## Phase 3 — Repository Interfaces

Formal interface contracts are defined in `services/repositories/interfaces/index.ts`.

| Interface | Covers |
|---|---|
| `AuthAdapter` | Sign in, sign up, Google OAuth, password reset, email verification, account deletion |
| `DbAdapter` | Generic document CRUD, queries, batches, real-time subscriptions |
| `RealtimeAdapter` | RTDB push, remove, get, update, live subscriptions |
| `StorageAdapter` | File upload, delete, URL parsing |
| `UserRepository` | Profile read/write, stats, username reservation, account deletion |
| `ScanRepository` | Scan recording, paginated history, soft delete |
| `QrRepository` | QR code lookup, creation, active toggle, live stats |
| `HistoryRepository` | Recent items, delete |
| `FavoritesRepository` | Add, remove, list, exists check |
| `SettingsRepository` | Get/update per-user settings |
| `NotificationService` | List, mark read, real-time subscription |
| `AnalyticsService` | Event logging, user identification |
| `StorageRepository` | High-level photo/logo upload with business rules |

---

## Phase 4 — Folder Structure Assessment

### Current Structure (Post-Refactoring)

```
binro/
├── lib/
│   ├── firebase.ts              # Firebase SDK init — one file only
│   ├── auth/
│   │   ├── adapter.ts           # ✅ AuthAdapter interface
│   │   ├── index.ts             # ✅ Single swap point
│   │   └── providers/
│   │       └── firebase.ts      # ✅ Only Firebase Auth import
│   ├── db/
│   │   ├── adapter.ts           # ✅ DbAdapter + RealtimeAdapter interfaces
│   │   ├── index.ts             # ✅ Single swap point
│   │   ├── circuit-breaker.ts   # ✅ Resilience pattern
│   │   ├── distributed-counter.ts
│   │   └── providers/
│   │       └── firebase.ts      # ✅ Only Firestore/RTDB import
│   └── storage/                 # ✅ NEW — matches lib/auth and lib/db pattern
│       ├── adapter.ts           # ✅ StorageAdapter interface
│       ├── index.ts             # ✅ Single swap point
│       └── providers/
│           └── firebase.ts      # ✅ Only Firebase Storage import
│
├── services/
│   ├── repositories/
│   │   └── interfaces/
│   │       └── index.ts         # ✅ NEW — all domain interfaces in one place
│   ├── storage-service.ts       # ✅ FIXED — no Firebase imports
│   ├── consent-service.ts       # ✅ FIXED — no Firebase imports
│   ├── donation-service.ts      # ✅ FIXED — no Firebase imports
│   ├── qr-service.ts            # ✅ Uses db adapter
│   ├── scan-history/            # ✅ Uses db adapter
│   ├── user-service.ts          # ✅ Uses db adapter
│   └── ...
│
├── features/                    # ✅ Zero Firebase imports
├── shared/                      # ✅ Zero Firebase imports
├── app/                         # ✅ Zero Firebase imports
└── store/                       # ✅ Zero Firebase imports
```

### Remaining Structural Issue

`server/` is a legacy duplicate of `apps/api/`. Both contain nearly identical route handlers, middleware, and Firebase Admin configuration. The canonical backend is `apps/api/`. The `server/` directory should be treated as a compatibility shim and eventually merged.

---

## Phase 5 — Migration Readiness

### How to Replace Firebase with Another Provider

Because Firebase is now fully isolated behind three interfaces, migration requires:

**Auth (Firebase → Supabase):**
```typescript
// lib/auth/index.ts — change ONE line:
import { supabaseAuthProvider } from "./providers/supabase";
export const authAdapter = supabaseAuthProvider;
```

**Database (Firestore → PostgreSQL/Supabase):**
```typescript
// lib/db/index.ts — change ONE line:
export const db: DbAdapter = loadPostgresDb();
export const rtdb: RealtimeAdapter = loadSupabaseRtdb();
```

**Storage (Firebase → S3/R2):**
```typescript
// lib/storage/index.ts — change ONE line:
import { r2StorageProvider } from "./providers/r2";
export const storageAdapter = r2StorageProvider;
```

Zero changes required in `services/`, `features/`, `app/`, or `shared/`.

---

## Phase 6 — Firestore Organization Audit

### Collections Identified

| Collection | Document ID | Purpose | Issues |
|---|---|---|---|
| `users/{uid}` | Firebase Auth UID | User profile + stats | ✅ Good |
| `usernames/{username}` | Username string | Username reservation (uniqueness) | ✅ Good |
| `qrCodes/{sha256hash}` | SHA-256 of content | Legacy QR registry | ⚠️ Duplicate with `qrs/` |
| `qrs/{uuid}` | UUID | Unified QR (dynamic, expiring, limit-based) | ✅ New architecture |
| `users/{uid}/scans/{id}` | Auto ID | Scan history (sub-collection) | ✅ Good |
| `users/{uid}/countedScans/{hash}` | Content hash | Dedup for 1-scan-per-user-per-QR | ✅ Good |
| `users/{uid}/notifications/{id}` | Auto ID | In-app notifications | ✅ Good |
| `users/{uid}/follows/{uid}` | Followed UID | Social graph | ✅ Good |
| `users/{uid}/favorites/{id}` | Auto ID | Saved scans | ✅ Good |
| `qrCodes/{id}/reports/{uid}` | Reporter UID | Trust reports (toggle) | ✅ Good |
| `qrCodes/{id}/events/{id}` | Auto ID | Scan analytics events | ✅ Good |
| `consents/{uid}` | Firebase Auth UID | DPDP consent records | ✅ Good |
| `audit_logs/{id}` | Auto ID | Consent event audit trail | ✅ Good |
| `donations/{id}` | Auto ID | Razorpay donation records | ✅ Good |
| `scanVelocity/{uid}` | Firebase Auth UID | Rate limiting counters | ✅ Good |

### Recommendations

1. **Two QR collections** (`qrCodes/` and `qrs/`) — the migration to `qrs/` (Unified QR) is in progress. Plan to migrate remaining `qrCodes/` documents and deprecate the legacy collection.
2. **Timestamp consistency** — ensure all `createdAt`/`updatedAt` fields use `serverTimestamp()` via the adapter's `db.timestamp()` method rather than `Date.now()` for Firestore ordering to work correctly.
3. **Soft delete TTL** — `users/{uid}/scans` uses `deletedAt` for soft deletes. Implement a Firebase scheduled function or `apps/api` scheduled job to permanently purge documents older than 90 days.
4. **`audit_logs/` access rules** — these records contain masked IP addresses and consent data. Ensure Firestore Security Rules deny all client reads on this collection.

---

## Phase 7 — Firebase Storage Organization Audit

### Current Folder Structure

```
Firebase Storage (gs://scan-guard-19a7f.firebasestorage.app)
├── profile-photos/
│   └── {userId}/
│       └── {timestamp_random}.jpg       # User avatar photos
├── qr-logos/
│   └── {qrId}/
│       └── {timestamp_random}.{ext}     # Custom QR code logos
└── images/
    └── {userId}/
        └── {timestamp_random}.{ext}     # General uploads (QR decode, etc.)
```

### Assessment

| Aspect | Status | Notes |
|---|---|---|
| Folder hierarchy | ✅ Good | User-scoped paths prevent cross-user access |
| File naming | ✅ Good | `{timestamp}_{random}.{ext}` prevents collisions |
| Avatar storage | ✅ Good | `profile-photos/{userId}/` with path validation before delete |
| QR assets | ✅ Good | `qr-logos/{qrId}/` |
| Old file cleanup | ✅ Good | `uploadProfilePhoto` and `uploadQrLogo` fire-and-forget delete old files |
| Orphaned files | ⚠️ Risk | Files from deleted accounts may persist. `deleteUserAccount` in `user-service.ts` attempts cleanup but is best-effort. |
| Versioning | ⚠️ None | No version history for uploaded files |
| CDN caching | ✅ Firebase handles | `cachePolicy="memory-disk"` on Expo Image components |

### Recommendations

1. **Post-account-deletion cleanup**: Add a server-side cleanup job that lists and deletes `profile-photos/{uid}/` when an account is permanently deleted, rather than relying on the client.
2. **Storage Security Rules**: Ensure only `request.auth.uid == userId` can write to `profile-photos/{userId}/` — verify `storage.rules` enforces this.
3. **Temporary uploads folder**: Consider a `tmp/{userId}/` path for in-progress QR decoding with a short TTL lifecycle rule.

---

## Phase 8 — Authentication Audit

### Auth Flow Analysis

| Flow | Implementation | Location | Status |
|---|---|---|---|
| Email/Password sign-in | `authAdapter.signIn()` | `lib/auth/providers/firebase.ts` | ✅ Adapter |
| Email/Password sign-up | `authAdapter.signUp()` | `lib/auth/providers/firebase.ts` | ✅ Adapter |
| Google OAuth (mobile) | `expo-auth-session` → `authAdapter.signInWithGoogleIdToken()` | `shared/contexts/AuthContext.tsx` | ✅ Adapter |
| Google OAuth (web) | `firebase/auth` directly | `apps/web/src/contexts/auth-context.tsx` | Web only |
| Password reset | `authAdapter.sendPasswordReset()` | `lib/auth/providers/firebase.ts` | ✅ Adapter |
| Email verification | `authAdapter.sendVerificationEmail()` | `lib/auth/providers/firebase.ts` | ✅ Adapter |
| Session management | `onIdTokenChanged` listener | `shared/contexts/AuthContext.tsx` | ✅ Adapter |
| Token refresh | Firebase auto-refresh | `lib/auth/providers/firebase.ts` | ✅ Transparent |
| Auth state sync to DB | `db.set(['users', uid], profile)` | `shared/contexts/AuthContext.tsx` | ✅ Adapter |
| Account deletion | `authAdapter.deleteUser()` + `user-service.deleteUserAccount()` | Both | ✅ Adapter |
| ID token verification (server) | `firebase-admin` in `apps/api/src/middleware/auth.ts` | Server middleware | ✅ Acceptable |

### Auth Isolation Assessment

Authentication is fully isolated behind `AuthAdapter`. The mobile app has **zero direct Firebase Auth imports** outside `lib/auth/providers/firebase.ts`. `AuthContext` only uses the adapter interface.

The one acceptable exception is `apps/api/src/middleware/auth.ts` which uses `firebase-admin` to verify ID tokens server-side — this is correct; the server cannot use the client SDK.

### Recommendations

1. **Provider linking** — no current UI for linking additional sign-in providers (e.g., linking Google to an email account). The `AuthAdapter` interface should be extended with `linkProvider()` when this is needed.
2. **Token storage** — ID tokens are fetched on demand via `authAdapter.getCurrentUser().getIdToken()`. Ensure tokens are never written to AsyncStorage in plaintext. Use `expo-secure-store` for any token persistence.

---

## Phase 9 — Migration Readiness Report

### Firebase Dependency Classification

| Area | Coupling Level | What It Would Take to Migrate |
|---|---|---|
| **Auth** | 🟢 Low | Create `lib/auth/providers/supabase.ts` implementing `AuthAdapter`. One-line swap in `lib/auth/index.ts`. |
| **Firestore (client)** | 🟢 Low | Create `lib/db/providers/postgres.ts` implementing `DbAdapter`. One-line swap. Services untouched. |
| **RTDB (real-time)** | 🟡 Medium | Create `RealtimeAdapter` backed by Supabase Realtime or Pusher. Schema mapping needed (RTDB is schema-free). |
| **Storage** | 🟢 Low | Create `lib/storage/providers/r2.ts` implementing `StorageAdapter`. One-line swap. |
| **Firebase Admin (server)** | 🟡 Medium | Replace `apps/api/src/lib/firebase-admin.ts` and token verification middleware. Most routes can use a generic JWT library. |
| **Firestore Security Rules** | 🔴 High | `firestore.rules` (2,240 lines) contains complex ownership, rate-limit, and trust-tier logic. This must be reimplemented as server-side middleware or RLS policies. |
| **Firebase Analytics** | 🟢 Low | `lib/analytics.ts` wraps analytics — swap the implementation. |
| **FCM (push notifications)** | 🟡 Medium | `lib/push-notifications.ts` and `apps/api/src/lib/push.ts` use Expo's push service which abstracts FCM. Largely provider-agnostic already. |

### Migration Difficulty Today

| Layer | Effort | Risk |
|---|---|---|
| Auth | 1–2 days | Low |
| Client DB (read/write) | 3–5 days | Low — adapter is complete |
| Real-time subscriptions | 3–5 days | Medium — `onSnapshot` semantics differ across providers |
| Storage | 1 day | Low |
| Server / Admin SDK | 3–4 days | Medium |
| Security Rules | 1–2 weeks | High — 2,240 lines of complex rules |
| **Total estimate** | **~3–4 weeks** | — |

### Easy Wins (Can be done today)
- Storage migration: `lib/storage` adapter is complete. Drop in an S3/R2 provider.
- Analytics migration: wrap any analytics SDK behind `AnalyticsService` interface.

### Medium Complexity
- Full Firestore → PostgreSQL: the `DbAdapter` abstracts all queries. The main work is the schema mapping (Firestore is document-based; SQL requires explicit schemas) and migrating existing data.
- RTDB → Supabase Realtime: the `RealtimeAdapter` interface is defined. Implement and swap.

### High-Risk Areas
- **Firestore Security Rules**: This is the highest-risk item. The 2,240-line `firestore.rules` file encodes trust tier logic, rate-limit counters, ownership checks, and collusion detection. Migrating away from Firestore means reimplementing all of this as server-side middleware (recommended) or database RLS policies.
- **Distributed counters**: `lib/db/distributed-counter.ts` uses Firestore sharding to handle high-write-rate counters. PostgreSQL would use `FOR UPDATE` + atomic increments; Supabase would use RPC functions.
- **`server/` legacy duplication**: Before any migration, consolidate `server/` into `apps/api/` to ensure there is one canonical API surface.

---

## Refactoring Roadmap

### Completed ✅
- [x] `lib/storage/` adapter layer created (matching `lib/db/` and `lib/auth/` pattern)
- [x] `services/storage-service.ts` — Firebase Storage imports removed
- [x] `services/consent-service.ts` — Direct Firestore imports removed + broken code fixed
- [x] `services/donation-service.ts` — Direct Firestore imports removed
- [x] `services/repositories/interfaces/` — Formal domain contracts defined

### Next Steps (Recommended Order)
1. **Consolidate `server/` into `apps/api/`** — remove the legacy duplicate before it diverges further
2. **Fix `packages/db/`** — the Drizzle/PostgreSQL schema mirrors Firebase. Keep it in sync as the migration-ready alternative
3. **Implement `AnalyticsService`** — wrap `lib/analytics.ts` behind the interface to make analytics swappable
4. **Audit Firestore Security Rules** — extract the trust/tier business logic into server-side services so it's not locked inside Firebase Rules syntax
5. **Add integration tests per service** — test each service against the adapter interface so provider swaps don't break behavior silently
