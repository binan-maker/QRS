# BinRo Web — Architecture Reference

> `apps/web` — Next.js 15 website. Part of the BinRo monorepo.

---

## Overview

The website is the browser-facing surface of BinRo. It shares the same Express backend (`apps/api`) as the mobile app, communicating via the REST API defined in `apps/api/API.md`. Firebase Authentication is preserved as the identity layer across both surfaces.

---

## Folder Structure

```
apps/web/
├── src/
│   ├── app/                          # Next.js App Router (React Server Components)
│   │   ├── (marketing)/              # Public pages — SSG/ISR, no auth
│   │   │   ├── page.tsx              # / — landing page
│   │   │   ├── pricing/page.tsx
│   │   │   ├── about/page.tsx
│   │   │   ├── how-it-works/page.tsx
│   │   │   └── layout.tsx            # Shared header + footer
│   │   │
│   │   ├── (auth)/                   # Auth flows — redirect if already logged in
│   │   │   ├── login/page.tsx
│   │   │   ├── signup/page.tsx
│   │   │   ├── forgot-password/page.tsx
│   │   │   └── layout.tsx            # Centred card layout
│   │   │
│   │   ├── (dashboard)/              # Authenticated area — SSR, session required
│   │   │   ├── dashboard/page.tsx    # /dashboard — overview
│   │   │   ├── qr/
│   │   │   │   ├── page.tsx          # /qr — QR management list
│   │   │   │   └── [id]/page.tsx     # /qr/[id] — detail + analytics
│   │   │   ├── analytics/page.tsx    # /analytics — aggregated stats
│   │   │   ├── notifications/page.tsx
│   │   │   ├── profile/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   ├── friends/page.tsx
│   │   │   └── layout.tsx            # Auth guard (server) + sidebar shell
│   │   │
│   │   ├── q/[id]/page.tsx           # /q/[id] — public QR trust page (ISR)
│   │   │
│   │   ├── api/                      # Next.js Route Handlers (BFF)
│   │   │   ├── auth/session/route.ts # POST create / DELETE destroy session cookie
│   │   │   ├── auth/me/route.ts      # GET validate session + return user info
│   │   │   └── health/route.ts       # GET health check
│   │   │
│   │   ├── layout.tsx                # Root layout (AuthProvider + QueryProvider)
│   │   ├── globals.css               # Tailwind base + component layer
│   │   ├── not-found.tsx
│   │   └── error.tsx
│   │
│   ├── components/                   # Shared UI components (fill in during build)
│   │   ├── ui/                       # Primitive components: Button, Input, Badge, Card…
│   │   ├── layout/                   # Header, Footer, Sidebar, Topbar
│   │   ├── auth/                     # LoginForm, SignupForm, GoogleSignInButton
│   │   ├── qr/                       # QrCard, QrPreview, TrustBadge, ReportButton
│   │   └── dashboard/                # StatsCard, NotificationItem, QrGrid…
│   │
│   ├── features/                     # Feature modules (co-locate hooks + components)
│   │   ├── auth/                     # Auth-related feature components
│   │   ├── dashboard/                # Dashboard widgets
│   │   └── qr-viewer/                # Public QR detail feature
│   │
│   ├── contexts/
│   │   ├── auth-context.tsx          # Firebase Auth state + session cookie management
│   │   └── query-context.tsx         # TanStack Query client provider
│   │
│   ├── hooks/
│   │   ├── use-auth.ts               # Re-export of useAuth()
│   │   └── use-api.ts                # useApi() / usePublicApi() — typed API client hooks
│   │
│   ├── lib/
│   │   ├── api-client.ts             # Typed BinroApiClient (server + client factories)
│   │   ├── auth.ts                   # Session constants + client session helpers
│   │   ├── env.ts                    # Zod-validated env (server + public)
│   │   ├── firebase.ts               # Firebase client SDK init (browser-safe)
│   │   ├── firebase-admin.ts         # Firebase Admin SDK init (server-only)
│   │   └── utils.ts                  # cn(), formatCount(), formatDate(), etc.
│   │
│   ├── middleware.ts                 # Edge route protection (cookie presence check)
│   │
│   └── types/
│       ├── api.ts                    # TypeScript types mirroring Express API responses
│       └── index.ts                  # Barrel re-export
│
├── public/                           # Static assets (favicon, og-image, icons)
├── next.config.ts                    # Next.js config + dev rewrite proxy
├── tailwind.config.ts                # Tailwind CSS v3 config + BinRo design tokens
├── postcss.config.mjs
├── tsconfig.json                     # Extends @binro/tsconfig/nextjs.json
├── package.json
├── .env.example                      # All env vars documented
└── ARCHITECTURE.md                   # ← this file
```

---

## Authentication Architecture

### Why Firebase Auth is kept

Firebase Auth handles identity for both the mobile app and the website using the same project. Replacing it with a custom auth system would require migrating all existing users.

### Session Cookie Flow

```
Browser                Next.js (port 3000)         Express (port 5000)
  │                          │                            │
  │── Firebase signIn() ────►│                            │
  │◄── ID Token (short-lived)│                            │
  │                          │                            │
  │── POST /api/auth/session ─►                           │
  │   { idToken }            │── firebase-admin           │
  │                          │   verifyIdToken()          │
  │                          │── createSessionCookie()    │
  │◄── Set-Cookie: __session ─┤                           │
  │   (httpOnly, 5 days)     │                            │
  │                          │                            │
  │── GET /dashboard ────────►                            │
  │                          │── verifySessionCookie()    │
  │                          │   (DashboardLayout RSC)    │
  │◄── 200 HTML ─────────────┤                            │
  │                          │                            │
  │── API call (client-side) ─────────────────────────────►
  │   Authorization: Bearer <getIdToken()>                │
  │◄── JSON response ──────────────────────────────────────
```

**Two token types in flight:**
- **Session cookie** (`__session`): httpOnly, used by Next.js middleware + Server Components to gate SSR
- **Firebase ID token**: short-lived (1 h), used by client components as `Authorization: Bearer` header when calling Express directly

### Middleware (Edge Runtime)

`src/middleware.ts` runs on every request *before* the page renders. It only checks whether `__session` cookie **exists** — not whether it's valid. This keeps the Edge Runtime fast and free of firebase-admin.

Full validation (with `firebase-admin.auth().verifySessionCookie()`) happens in `(dashboard)/layout.tsx`, which is a Server Component running in the Node.js runtime.

---

## API Client Architecture

Two factory functions in `src/lib/api-client.ts`:

| Factory | Where used | Token source |
|---|---|---|
| `createServerApiClient(sessionToken?)` | Server Components, Route Handlers | `cookies().__session` cookie value |
| `createClientApiClient(getToken)` | Client Components | `firebase.auth().currentUser.getIdToken()` |

Both return the same `BinroApiClient` class — call sites are identical regardless of environment.

```typescript
// Server Component
const cookieStore = await cookies();
const token = cookieStore.get("__session")?.value;
const api = createServerApiClient(token);
const result = await api.users.me();

// Client Component
const api = useApi(); // hook from @/hooks/use-api
const { data } = useQuery({ queryKey: ["me"], queryFn: () => api.users.me() });
```

---

## Rendering Strategy

| Route | Strategy | Auth | Notes |
|---|---|---|---|
| `/` | SSG | No | Rebuilt on deploy |
| `/pricing`, `/about` | SSG | No | Rebuilt on deploy |
| `/how-it-works` | SSG | No | Rebuilt on deploy |
| `/q/[id]` | ISR (60 s) | No | Public QR trust page |
| `/login`, `/signup` | Static | No | Redirect if authed |
| `/dashboard` | SSR | Required | Fresh data per request |
| `/qr` | SSR | Required | List changes frequently |
| `/qr/[id]` | SSR | Required | Analytics are live |
| `/analytics` | SSR | Required | Aggregated live data |
| `/notifications` | SSR | Required | Staleness matters |
| `/profile`, `/settings` | SSR | Required | User-specific |

---

## Data Flow

### Server Components (SSR)
```
Request → Middleware (cookie check) → Layout (cookie validate) → Page
  └─► createServerApiClient(sessionToken)
        └─► fetch(INTERNAL_API_URL/api/v1/...)
              └─► Express backend
```

### Client Components (Browser)
```
User action → useApi() hook → BinroApiClient
  └─► firebase.currentUser.getIdToken()
        └─► fetch(NEXT_PUBLIC_API_URL/api/v1/...)
              └─► Express backend
```

### Static/ISR Pages (Public)
```
Build / revalidate → createServerApiClient() (no token)
  └─► fetch(INTERNAL_API_URL/api/v1/...) (public endpoints)
        └─► Express backend
```

---

## Development Proxy

In development, Next.js rewrites `/api/backend/*` → `http://localhost:5000/api/*` so browser requests to the API stay on the same origin (no CORS preflight). Configured in `next.config.ts`.

In production the client calls `NEXT_PUBLIC_API_URL` directly (Express has CORS configured for the web domain).

---

## Environment Variables

| Variable | Public | Required | Description |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | ✅ | Yes | Express backend public URL |
| `INTERNAL_API_URL` | ❌ | No | Backend URL for server-side calls (defaults to `NEXT_PUBLIC_API_URL`) |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | ✅ | Yes | Firebase client config |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | ✅ | Yes | Firebase client config |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | ✅ | Yes | Firebase client config |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | ✅ | Yes | Firebase client config |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | ✅ | Yes | Firebase client config |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | ✅ | Yes | Firebase client config |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | ❌ | Yes* | Firebase Admin SDK — session cookies (*required if using SSR auth) |
| `SESSION_SECRET` | ❌ | No | Shared with Express API |
| `DATABASE_URL` | ❌ | No | Direct DB access from Next.js (optional) |

---

## Shared Monorepo Packages

| Package | Used for |
|---|---|
| `@binro/core` | Shared domain types (QrCodeData, UserData, TrustScore…) |
| `@binro/config` | Zod env schemas (`webEnvSchema`) |
| `@binro/db` | Drizzle schema — only if Next.js queries the DB directly |
| `@binro/tsconfig` | Base TypeScript config (`nextjs.json`) |

---

## Design System

Tailwind CSS v3. Design tokens defined in `tailwind.config.ts`:
- **Brand palette**: `brand-50` → `brand-950` (blue)
- **Verdict colours**: `safe`, `flagged`, `caution` with `.muted` variants
- **Font**: Inter via `next/font/google`

Component library will be built in `src/components/ui/` — no external UI library dependency at this stage (keeps the bundle lean and gives full design control).

---

## Adding a New Page

1. Create `src/app/(group)/your-route/page.tsx`
2. Export a default React component + `metadata` object
3. For authenticated pages: place inside `(dashboard)/` — the layout handles auth
4. For public pages: place inside `(marketing)/` — no auth required
5. If the page needs data: use `createServerApiClient()` (server) or `useApi()` (client)

---

## Adding a New API Endpoint (Express → Web)

1. Add the method to `BinroApiClient` in `src/lib/api-client.ts`
2. Add the response type to `src/types/api.ts`
3. Use it via `createServerApiClient()` in Server Components or `useApi()` in Client Components

---

## What Lives Where

| Concern | Location |
|---|---|
| Identity / auth tokens | Firebase Auth (mobile + web shared) |
| Session cookies | Next.js `/api/auth/session` route |
| Business logic | Express backend (`apps/api`) |
| Database | Firestore (now) → PostgreSQL (Phase 2) |
| Static assets | `apps/web/public/` |
| Shared types | `@binro/core` + `apps/web/src/types/api.ts` |
| Feature components | `apps/web/src/features/<feature>/` |
| Primitive UI | `apps/web/src/components/ui/` |
