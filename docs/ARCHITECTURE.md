# BinRo — Developer Architecture Guide

> **Last updated:** July 2026
> **Status:** Production-hardened. Reflects the post-refactoring state.

---

## Table of Contents

1. [Overview](#overview)
2. [Folder Responsibilities](#folder-responsibilities)
3. [Dependency Rules](#dependency-rules)
4. [Adapter Pattern](#adapter-pattern)
5. [Repository Pattern](#repository-pattern)
6. [Domain Model Guide](#domain-model-guide)
7. [Error Handling](#error-handling)
8. [Logging](#logging)
9. [Validation](#validation)
10. [Configuration](#configuration)
11. [Coding Conventions](#coding-conventions)
12. [Adding a New Feature](#adding-a-new-feature)
13. [Adding a New Backend Provider](#adding-a-new-backend-provider)
14. [Migration Checklist](#migration-checklist)

---

## Overview

BinRo is a QR code security platform built as a **monorepo** containing:

| App | Tech | Location |
|---|---|---|
| Mobile app | Expo 54, React Native 0.81, Expo Router 6 | `app/`, `features/`, `shared/` |
| Backend API | Express 5, Node.js, TypeScript | `apps/api/src/` |
| Web app | Next.js 14 (App Router) | `apps/web/` |

Shared code lives in `packages/` (domain types, DB schema, env validation).

---

## Folder Responsibilities

### Root-level directories

| Directory | Responsibility |
|---|---|
| `app/` | Expo Router screen files. Thin — delegate to `features/`. |
| `features/` | Domain feature modules: UI components, hooks, screen logic. |
| `shared/` | Cross-feature mobile code: components, contexts, utils, i18n. |
| `lib/` | Infrastructure adapters. **Firebase SDK imports are allowed ONLY here.** |
| `services/` | Application services. Business logic over adapters. Zero Firebase SDK imports. |
| `store/` | Zustand global state (auth mirror, UI state). |
| `validators/` | Centralized input validation. Reusable across screens and services. |
| `config/` | App-wide constants: `env.ts`, `api.ts`, `app.ts`, `firebase.ts`. |
| `packages/core/` | Shared domain types. Zero runtime deps. Safe everywhere. |
| `packages/db/` | Drizzle ORM schema + PostgreSQL client (API-only). |
| `apps/api/src/` | Express backend. Only code here uses `firebase-admin`. |

### `lib/` — The Adapter Layer

```
lib/
├── firebase.ts              # Firebase Client SDK init — ONE file
├── auth/
│   ├── adapter.ts           # AuthAdapter interface
│   ├── index.ts             # Export: authAdapter singleton
│   └── providers/
│       └── firebase.ts      # Firebase Auth implementation
├── db/
│   ├── adapter.ts           # DbAdapter + RealtimeAdapter interfaces
│   ├── index.ts             # Export: db, rtdb singletons
│   └── providers/
│       └── firebase.ts      # Firestore + RTDB implementation
└── storage/
    ├── adapter.ts           # StorageAdapter interface
    ├── index.ts             # Export: storageAdapter singleton
    └── providers/
        └── firebase.ts      # Firebase Storage implementation
```

---

## Dependency Rules

These rules are enforced by architecture review. Violations break provider swappability.

```
Presentation (features/, app/)
    ↓ imports
Application (services/)
    ↓ imports
Adapters (lib/*/adapter.ts)  ←─ interfaces only
    ↓ implemented by
Providers (lib/*/providers/firebase.ts)  ←─ Firebase SDK lives here ONLY
```

| Layer | ✅ May import | ❌ Must not import |
|---|---|---|
| `features/`, `app/` | `services/`, hooks, `shared/`, `validators/`, `packages/core/` | `lib/firebase.ts`, any `firebase/*` |
| `services/` | `lib/auth`, `lib/db`, `lib/storage`, `validators/`, `packages/core/` | `firebase/*`, `firebase-admin` |
| `lib/*/adapter.ts` | TypeScript types only | Anything with runtime deps |
| `lib/*/providers/firebase.ts` | Firebase SDK ✅ | Business logic from `services/` |
| `packages/core/` | Nothing | Everything |

**Rationale:** If Firebase is ever replaced, zero changes are needed outside `lib/*/providers/`. All services, features, and the API adapter layer remain untouched.

---

## Adapter Pattern

The adapter pattern decouples the application from Firebase.

### How it works

```typescript
// lib/auth/adapter.ts — defines the contract
export interface AuthAdapter {
  getCurrentUser(): AuthAdapterUser | null;
  signIn(email: string, password: string): Promise<AuthAdapterUser>;
  // ...
}

// lib/auth/providers/firebase.ts — Firebase implementation (only file with firebase/auth import)
import { signInWithEmailAndPassword } from "firebase/auth";
export const firebaseAuthProvider: AuthAdapter = { ... };

// lib/auth/index.ts — single swap point
export const authAdapter: AuthAdapter = firebaseAuthProvider;

// services/user-service.ts — consumes the interface, never Firebase directly
import { authAdapter } from "@/lib/auth";
const user = authAdapter.getCurrentUser();
```

### Swapping providers

To replace Firebase Auth with Supabase:
1. Create `lib/auth/providers/supabase.ts` implementing `AuthAdapter`.
2. Change **one line** in `lib/auth/index.ts`: `export const authAdapter = supabaseAuthProvider;`
3. Zero changes needed anywhere else.

---

## Repository Pattern

Repository interfaces define what the application can do with data, independent of storage.

**Location:** `services/repositories/interfaces/index.ts`

Available repository contracts:

| Interface | Entity |
|---|---|
| `UserRepository` | User profiles and stats |
| `ScanRepository` | Scan recording and history |
| `QrRepository` | QR code lookup and management |
| `HistoryRepository` | Recent scan history |
| `FavoritesRepository` | Saved scans |
| `SettingsRepository` | Per-user app settings |
| `NotificationService` | In-app notifications |
| `AnalyticsService` | Event logging |
| `StorageRepository` | File uploads (photos, QR logos) |

---

## Domain Model Guide

All canonical entity types live in `packages/core/src/`. Import from `@binro/core` or the barrel `packages/core/src/models/index.ts`.

| Model | File | Fields |
|---|---|---|
| `AppUser` | `types/user.ts` | id, displayName, email, photoURL, username |
| `QrCode` | `types/qr.ts` | id, content, contentType, scanCount, isActive |
| `QrScanResult` | `types/qr.ts` | id, content, contentType, scannedAt, riskLevel |
| `Scan` | `types/scan.ts` | id, userId, content, contentType, qrCodeId, scannedAt |
| `Notification` | `types/notification.ts` | id, userId, type, title, body, isRead |
| `Donation` | `types/donation.ts` | id, userId, amountPaise, status, orderId |
| `ConsentRecord` | `types/consent.ts` | id, userId, version, analyticsOptIn, action |
| `UserSettings` | `types/settings.ts` | theme, language, notificationsEnabled, analyticsOptIn |

**Rule:** Never expose raw Firestore documents outside `services/`. Map them to domain models at the service boundary.

---

## Error Handling

### Mobile / shared code — use `lib/errors.ts`

```typescript
import {
  AppError,
  AuthenticationError,
  ValidationError,
  PermissionError,
  NetworkError,
  StorageError,
  DatabaseError,
  NotFoundError,
  RateLimitError,
  UnknownError,
  toAppError,
  errorMessage,
} from "@/lib/errors";

// In a service:
throw new DatabaseError("Failed to fetch user profile", { userId });

// In a catch block — normalize unknown errors:
try { ... }
catch (e) { throw toAppError(e); }

// In UI — display safely:
toast.error(errorMessage(caughtError));
```

### API / server code — use `packages/core/src/errors/index.ts`

Domain errors (`QrNotFoundError`, `ForbiddenError`, `RateLimitedError`, etc.) are thrown in domain logic and mapped to HTTP status codes by `apps/api/src/middleware/error-handler.ts`.

```typescript
import { QrNotFoundError, ForbiddenError } from "@binro/core";
throw new QrNotFoundError(qrId); // → HTTP 404
throw new ForbiddenError();      // → HTTP 403
```

**Rule:** Never throw `new Error(...)` in business logic. Always use a typed error class.

---

## Logging

Use the centralized logger. **Do not use `console.log` directly in application code.**

```typescript
import { createLogger } from "@/lib/logger";

const log = createLogger("user-service");

log.debug("Cache hit", { userId });       // dev only
log.info("Profile updated", { userId });  // dev only
log.warn("Retry attempt 2/3", { error }); // always emitted
log.error("Upload failed", error);        // always emitted + future Crashlytics hook

// Child logger (inherits tag prefix):
const cacheLog = log.child("cache");
cacheLog.debug("HIT", { key }); // logs "[user-service:cache] HIT"
```

**Production behaviour:** `debug` and `info` are suppressed. `warn` and `error` always emit.

**Future:** Uncomment the Crashlytics/Sentry hook in `lib/logger.ts` when ready.

---

## Validation

Use centralized validators. Never duplicate validation logic inline in screens.

```typescript
import {
  validateEmail, assertEmail,
  validatePassword, assertPassword,
  validateUsername, assertUsername,
  validateScanContent, assertScanContent,
  validatePageSize,
} from "@/validators";

// Soft validation (returns { valid, error }):
const result = validateEmail(input);
if (!result.valid) setError(result.error!);

// Hard validation (throws ValidationError):
assertEmail(email);
assertPassword(password);
```

Available validators: `auth.validator.ts`, `user.validator.ts`, `qr.validator.ts`, `settings.validator.ts`, `scan.validator.ts`.

---

## Configuration

All configuration is centralized. Never hardcode values inline.

| File | Exports |
|---|---|
| `config/env.ts` | Typed `ENV` object — all `EXPO_PUBLIC_*` env vars |
| `config/api.ts` | `API_BASE_URL`, `apiUrl()` helper |
| `config/app.ts` | `APP_NAME`, `DEFAULT_QR_URL`, `EXTERNAL` URLs, timeouts |
| `config/firebase.ts` | `FIREBASE_CONFIG`, REST URL builders (`firestoreDocUrl`, `firestoreCommitUrl`) |
| `shared/constants/collections.ts` | Firestore collection name constants |
| `shared/constants/config.ts` | Username rules, display name limits |

---

## Coding Conventions

| Concern | Convention |
|---|---|
| File naming | `kebab-case.ts` for non-components, `PascalCase.tsx` for React components |
| Imports | Use path aliases (`@/lib/auth`, `@/services/...`) — never relative `../../` |
| Errors | Always typed (`lib/errors.ts` or `packages/core/src/errors/`) |
| Logging | `createLogger("tag")` — never bare `console.log` |
| Validation | Import from `@/validators` — never inline regex |
| Firebase | Import Firebase SDK ONLY in `lib/*/providers/firebase.ts` |
| Config | Import from `@/config/*` — never `process.env.*` inline outside config files |
| Types | Prefer `packages/core/src/models/` — avoid duplicating type definitions |

---

## Adding a New Feature

1. **Domain model** — add types to `packages/core/src/types/<entity>.ts`, export via `models/index.ts`.
2. **Validator** — add `validators/<entity>.validator.ts`, export via `validators/index.ts`.
3. **Service** — create `services/<entity>-service.ts` using `lib/auth`, `lib/db`, or `lib/storage` adapters. Zero Firebase imports.
4. **Repository interface** (if data-backed) — add interface to `services/repositories/interfaces/index.ts`.
5. **Hook** — create `features/<domain>/hooks/use<Entity>.ts` wrapping the service with TanStack Query.
6. **Screen** — add `features/<domain>/screens/<Entity>Screen.tsx`. Keep it thin — delegate to hooks.
7. **Route** — add `app/<path>.tsx` that renders the screen component.

---

## Adding a New Backend Provider

To replace Firebase with another backend (e.g. Supabase):

### Step 1 — Auth

```typescript
// Create: lib/auth/providers/supabase.ts
import type { AuthAdapter } from "../adapter";
export const supabaseAuthProvider: AuthAdapter = { /* implement all methods */ };

// Change ONE line in: lib/auth/index.ts
export const authAdapter: AuthAdapter = supabaseAuthProvider;
```

### Step 2 — Database

```typescript
// Create: lib/db/providers/supabase.ts
import type { DbAdapter, RealtimeAdapter } from "../adapter";
export const supabaseDbProvider: DbAdapter = { /* ... */ };
export const supabaseRealtimeProvider: RealtimeAdapter = { /* ... */ };

// Change ONE line in: lib/db/index.ts
export const db: DbAdapter = supabaseDbProvider;
export const rtdb: RealtimeAdapter = supabaseRealtimeProvider;
```

### Step 3 — Storage

```typescript
// Create: lib/storage/providers/r2.ts
import type { StorageAdapter } from "../adapter";
export const r2StorageProvider: StorageAdapter = { /* ... */ };

// Change ONE line in: lib/storage/index.ts
export const storageAdapter: StorageAdapter = r2StorageProvider;
```

**Result:** Zero changes needed in `services/`, `features/`, `app/`, `shared/`, or `store/`.

---

## Migration Checklist

When migrating a service from direct Firebase calls to the adapter pattern:

- [ ] Remove all `import { ... } from "firebase/*"` from the service file
- [ ] Replace `getDoc(doc(db, ...))` calls with `db.get([collection, id])`
- [ ] Replace `setDoc(...)` with `db.set([...], data)`
- [ ] Replace `updateDoc(...)` with `db.update([...], updates)`
- [ ] Replace `addDoc(...)` with `db.add([...], data)`
- [ ] Replace `query(collection(...), where(...))` with `db.query([...], { ... })`
- [ ] Replace `onSnapshot(...)` with `db.subscribe([...], callback)` → returns unsubscribe fn
- [ ] Replace `getAuth().currentUser` with `authAdapter.getCurrentUser()`
- [ ] Replace Firebase Storage calls with `storageAdapter.upload(...)` / `storageAdapter.delete(...)`
- [ ] Run grep to confirm zero `firebase/*` imports remain in the file
- [ ] Verify the file only imports from `@/lib/auth`, `@/lib/db`, or `@/lib/storage`
