# QR Guard

A full-stack mobile-first QR code scanning and management app built with Expo (React Native) and Express.

## Architecture

- **Frontend**: Expo (React Native) with Expo Router for navigation, running on port 8081
- **Backend**: Express server running on port 5000 (only handles `/api/qr/decode-image`)
- **Primary Database**: Pluggable via `lib/db/config.ts` — default: Firebase Firestore
- **Realtime Database**: Pluggable — default: Firebase Realtime Database (notifications, scan velocity)
- **Auth**: Firebase Auth — email/password + Google OAuth (`expo-auth-session`)
- **PostgreSQL / Drizzle**: Ready stub at `lib/db/providers/postgres.ts`; schema in `shared/schema.ts`

## Database Provider Abstraction

**To switch backend → edit ONE line** in `lib/db/config.ts`:
```ts
export const DB_PROVIDER = "firebase"  // ← change to "supabase" or "postgres"
```
- `lib/db/adapter.ts` — TypeScript interface (DbAdapter, RealtimeAdapter)
- `lib/db/providers/firebase.ts` — Firebase implementation (active)
- `lib/db/providers/supabase.ts` — Supabase stub (fill in, then flip config)
- `lib/db/providers/postgres.ts` — PostgreSQL stub (fill in, then flip config)
- All services import `{ db, rtdb }` from `lib/db` — zero Firebase lock-in in business logic

## Project Structure

```
app/                        ← Expo Router screens (JSX only; all logic in feature hooks)
  (auth)/                   ← Login + Register
  (tabs)/
    index.tsx               ← Home screen
    scanner.tsx             ← QR camera scanner
    history.tsx             ← Scan history + favorites
    profile.tsx             ← User profile
    qr-generator.tsx        ← QR Generator
    settings.tsx            ← Shim → redirects to /settings
  settings.tsx              ← Settings (active screen; uses feature components)
  qr-detail/[id].tsx        ← QR detail (reports, comments, owner panel, offline mode)
  my-qr-codes.tsx           ← All generated QR codes
  my-qr/[id].tsx            ← Individual QR management

features/                   ← Feature-scoped logic; each feature owns its hooks + components
  qr-detail/
    hooks/
      useQrDetail.ts        ← Composer hook: combines all 7 sub-hooks below
      useQrData.ts          ← QR data loading, offline mode, stats subscription
      useQrSafety.ts        ← Safety analysis (blacklist, payment, URL heuristics)
      useQrReports.ts       ← Report counts, live subscription, handleReport
      useQrFollow.ts        ← Follow state, toggle, followers list
      useQrFavorite.ts      ← Favorite state and toggle
      useQrComments.ts      ← Comments state, pagination, submit, like, delete
      useQrOwner.ts         ← Owner messages, scan velocity, verification flow
    components/             ← Moved from components/qr-detail/
  scanner/
    hooks/useScanner.ts     ← Camera, safety modal, guard QR, zoom, image upload
    components/             ← Moved from components/scanner/
  home/
    hooks/useHome.ts        ← Recent scans, notifications, refresh
    components/             ← Moved from components/home/
  history/
    hooks/useHistory.ts     ← Scan history merge, pagination, filters, safety map
    components/             ← FilterBar, HistoryItem
  profile/
    hooks/useProfile.ts     ← Stats, photo, username, name editing
    components/             ← Moved from components/profile/
  generator/
    hooks/useQrGenerator.ts ← QR generation: mode, content, branded/private, share
    components/
    data/                   ← Presets, builder logic, validators
  settings/
    hooks/useSettings.ts    ← Feedback, following, comments, account delete sections
    components/
    styles.ts
  auth/components/
  my-qr/hooks/ + components/

hooks/                      ← Re-export shims only; real code lives in features/*/hooks/
  useQrDetail.ts            → features/qr-detail/hooks/useQrDetail
  useHome.ts                → features/home/hooks/useHome
  useHistory.ts             → features/history/hooks/useHistory
  useProfile.ts             → features/profile/hooks/useProfile
  useScanner.ts             → features/scanner/hooks/useScanner
  useQrGenerator.ts         → features/generator/hooks/useQrGenerator
  useSettings.ts            → features/settings/hooks/useSettings

lib/
  services/                 ← Split by responsibility
    qr-service.ts           ← QR CRUD + scan tracking only
    report-service.ts       ← Report logic (weights, counts, subscribe)
    follow-service.ts       ← Follow/unfollow, followers list
    generator-service.ts    ← Branded QR save, design update, velocity, verification
    comment-service.ts
    user-service.ts
    notification-service.ts
    guard-service.ts
    trust-service.ts
    message-service.ts
    types.ts
    utils.ts
    index.ts                ← Re-exports all service files
  repositories/             ← Repository pattern skeleton
    README.md               ← Documents the pattern + usage
    interfaces/
      IQrRepository.ts      ← TypeScript interface (getById, getOrCreate, recordScan, getUserScans)
    firebase/
      FirebaseQrRepository.ts ← Firebase implementation of IQrRepository
  firebase.ts
  firestore-service.ts      ← Re-exports from lib/services/index (backward compat shim)
  qr-analysis.ts
  cache/qr-cache.ts
  use-network.ts

components/                 ← Shared-only components (feature-specific moved to features/)
  layouts/                  ← ScreenHeader, ListEmptyState
  ui/                       ← SkeletonBox, etc.
  ErrorBoundary.tsx
  ErrorFallback.tsx
  GoogleIcon.tsx
  KeyboardAwareScrollViewCompat.tsx

server/                     ← Express backend (image decode only)
contexts/AuthContext.tsx    ← Firebase Auth with auto token refresh
constants/                  ← colors.ts, config.ts, routes.ts
shared/                     ← Drizzle schema (future PostgreSQL)
```

## Firebase Integration (complete)

### Firestore Collections
- `qrCodes/{qrId}` — QR code data (content, contentType, scanCount, commentCount)
- `qrCodes/{qrId}/reports/{userId}` — Reports (safe/scam/fake/spam) per user
- `qrCodes/{qrId}/followers/{userId}` — Followers per QR code
- `qrCodes/{qrId}/comments/{commentId}` — Comments (soft-delete supported)
- `qrCodes/{qrId}/comments/{commentId}/likes/{userId}` — Like/dislike per comment per user
- `qrCodes/{qrId}/comments/{commentId}/reports/{userId}` — Comment reports (also writes to `moderationQueue`)
- `moderationQueue/{docId}` — Global moderation queue for internal team review
- `users/{userId}` — User profile; includes `username` (unique @handle) and `usernameLastChangedAt`
- `users/{userId}/scans/` — Scan history
- `users/{userId}/favorites/` — Favorited QR codes
- `users/{userId}/following/` — Followed QR codes
- `users/{userId}/comments/` — User's comments
- `users/{userId}/generatedQrs/` — Branded QR codes generated by user
- `usernames/{username}` — Username reservation map for uniqueness enforcement
- `qrMessages/{messageId}` — Private messages sent to branded QR code owners
- `feedback/` — Submitted feedback

### Real-time Subscriptions (onSnapshot)
- `subscribeToQrStats` — Live scan count + comment count on QR detail
- `subscribeToQrReports` — Live report counts → trust score recalculation
- `subscribeToComments` — Live first-page comments
- `subscribeToQrMessages` — Owner inbox for branded QR codes
- `subscribeToNotificationCount` — Unread count for tab badge
- `subscribeToNotifications` — Full notification list for panel

### Firebase Realtime Database
Path: `notifications/{userId}/items/{notifId}`
- `markAllNotificationsRead` / `clearAllNotifications` / `notifyQrFollowers`
- `qrScanVelocity/{qrId}` — Per-hour scan buckets for owner dashboard

## Service Layer Design

Each service file owns one responsibility:
- **qr-service.ts**: `getOrCreateQrCode`, `getQrCodeById`, `recordScan`, `getUserScans`, `loadQrDetail`
- **report-service.ts**: `reportQrCode`, `getQrReportCounts`, `subscribeToQrReports`
- **follow-service.ts**: `toggleFollow`, `isUserFollowingQrCode`, `getQrFollowersList`
- **generator-service.ts**: `saveGeneratedQr`, `getUserGeneratedQrs`, `getScanVelocity`, `setQrActiveState`, `submitVerificationRequest`

## QR Safety Analysis Engine (`lib/qr-analysis.ts`)

- **`parseAnyPaymentQr`** — Parses UPI/PhonePe/GPay/Paytm/BHIM/crypto QR URI
- **`analyzeAnyPaymentQr`** — Heuristic safety analysis for payment QRs
- **`analyzeUrlHeuristics`** — Detects HTTP-only, raw IPs, URL shorteners, suspicious TLDs, brand impersonation
- **`checkCommentKeywords`** — Blocks spam/scam keywords in comments
- **`loadOfflineBlacklist` / `checkOfflineBlacklist`** — Offline-capable local blacklist, cached in AsyncStorage

## Comment Moderation Rules

- Users can only delete their own comments
- Reported comments → written to `moderationQueue` for internal review
- Auto-hide at 3+ reports (`isHidden: true`)
- Keyword blacklist blocks submission

## Cache Layer (`lib/cache/qr-cache.ts`)
- Two-level cache: in-memory Map + AsyncStorage persistence
- TTLs: QR detail 5min, owner info 10min, trust score 2min, user stats 3min
- Invalidated on report, favorite, follow, and username change actions

## Workflows

- **Start Backend**: `npm run server:dev` — Express on port 5000 (tsx)
- **Start Frontend**: `npm run expo:dev` — Expo Metro bundler on port 8081

## Authentication

- Firebase Auth via `onIdTokenChanged` (automatic hourly token refresh)
- Email/password sign-in and registration
- Google OAuth via `expo-auth-session` + `signInWithCredential`

## Username System

- Unique `@username` auto-generated from display name on first sign-in
- Format: `^[a-z][a-z0-9_]{2,19}$`
- Uniqueness enforced via `usernames/{username}` collection
- 15-day edit cooldown tracked by `usernameLastChangedAt`

## Branded QR Detection

- `saveGeneratedQr` computes `SHA256(content|userId|SALT).slice(0,32)` as a signature
- QR detail shows "QR Guard Generated" shield badge when `ownerInfo.isBranded` is true
- Signature salt: `QRG_MINT_VERIFIED_2024_PROPRIETARY`

## Key Dependencies

- `expo` ~54.0.27, `expo-router` ~6.0.17
- `firebase` — Firestore + Auth + Realtime Database
- `expo-auth-session` — Google OAuth
- `expo-crypto` — SHA-256 hashing for QR IDs
- `express` ^5.0.1 — Minimal backend (image decode only)
- `@tanstack/react-query` — Data fetching
- `drizzle-orm` with `pg` — Future PostgreSQL migration (dead code for now)

## Environment Variables

- `PORT` — Server port (defaults to 5000)
- `REPLIT_DEV_DOMAIN` — Used for CORS and Expo proxy URL
- `EXPO_PUBLIC_DOMAIN` — Backend API URL
- Firebase keys stored in `.replit` `[userenv.shared]` and hardcoded as fallbacks in `lib/firebase.ts`

## Important Notes

- `server/storage.ts` is **intentionally not imported** anywhere. It is the Drizzle/PostgreSQL migration layer to activate at ~10k users. Do NOT delete it.
- `lib/firestore-service.ts` is a backward-compat re-export shim to `lib/services/index`. Do NOT delete it.
- `hooks/*.ts` files are re-export shims only. Real implementations live in `features/*/hooks/`.
- `components/home/`, `components/scanner/`, `components/qr-detail/`, `components/profile/` are retained for import compatibility but real sources are now in `features/*/components/`.
- No backend auth routes — all auth is client-side Firebase.

## Deployment

- Build: `npm run expo:static:build && npm run server:build`
- Run: `npm run server:prod`
