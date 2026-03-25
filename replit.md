# QR Guard

A full-stack mobile-first QR code scanning and management app built with Expo (React Native) and Express.

## Recent Changes

### Native Google Sign-In, Auto-Login, Responsive Auth Pages
- **Native Google Sign-In** (`contexts/AuthContext.tsx`, `lib/auth/adapter.ts`, `lib/auth/providers/firebase.ts`) — replaced `expo-auth-session` browser-based OAuth (which opened Chrome) with `@react-native-google-signin/google-signin` (v16) on Android/iOS. Native Google account picker appears in-app (like Google Pay). Web preview keeps expo-auth-session as fallback. Configured via `GoogleSignin.configure()` with webClientId and androidClientId.
- **Auto-login / Silent sign-in** — on app start, `GoogleSignin.signInSilently()` is called (native only). If there is a saved Google session, the user is signed in automatically without any button press. Firebase `onIdTokenChanged` already handles email/password session restore across devices.
- **Multi-device session sync** — Firebase Auth persistence is maintained across devices via the `onIdTokenChanged` listener; session state is always derived from the Firebase ID token.
- **Multi-account switching** — added `switchGoogleAccount()` in AuthContext: calls `GoogleSignin.signOut()` first then `signIn()` to show the account picker for switching accounts.
- **Auth layout headers removed** (`app/(auth)/_layout.tsx`) — set `headerShown: false` for all auth Stack screens (login, register, forgot-password). Each page handles its own navigation with the custom back button.
- **Responsive auth pages** — all three auth pages (`login.tsx`, `register.tsx`, `forgot-password.tsx`) now use `useWindowDimensions()` to compute a `scale` factor relative to 390px base width (clamped to 0.82–1.15×). All font sizes, icon sizes, paddings, logo sizes, and spacing are dynamically computed. Small screen mode (`height < 680`) hides logo rings to save vertical space.
- **Firebase ID token support** (`lib/auth/adapter.ts`, `lib/auth/providers/firebase.ts`) — added `signInWithGoogleIdToken(idToken)` method to the auth adapter interface and Firebase provider. Uses `GoogleAuthProvider.credential(idToken)` (id token variant) vs the existing `signInWithGoogleToken(accessToken)` (access token variant for web).
- **app.json** — added `@react-native-google-signin/google-signin` plugin for Expo config plugin support.

### Comments Reply Bug Fix & Optional Haptic Feedback
- **Comments reply crash fixed** (`app/qr-detail/[id].tsx`) — `CommentItem` was missing 6 required props (`allComments`, `userLikes`, `commentMenuId`, `deletingCommentId`, `revealedComments`, `userId`) when called from the QR detail screen. Expanding replies caused a crash because child comments tried to access `userLikes[id]` and `revealedComments.has(id)` on `undefined`. All missing props are now passed correctly.
- **Haptic feedback wrapper** (`lib/haptics.ts`) — new wrapper module that re-exports `expo-haptics` functions but gates them on a module-level `_enabled` flag. All 33+ files that previously imported `expo-haptics` now import from `@/lib/haptics` so the toggle is respected app-wide.
- **Haptic toggle in Settings** (`app/settings.tsx`, `features/settings/hooks/useSettings.ts`) — new "PREFERENCES" section in Settings page with a "Haptic Feedback" toggle switch. Preference is persisted to AsyncStorage (`haptic_enabled` key) and restored on app startup via `app/_layout.tsx`.

### Sign-Out & Account Deletion Navigation Fix + Responsive Tab Pages
- **Redirect fixed** (4 locations) — After sign-out or account deletion, all four redirect calls now navigate to `/(tabs)/` (the Home tab) instead of the old incorrect `/(tabs)/scanner`. Files changed: `features/settings/hooks/useSettings.ts` (lines 69, 277), `features/account/components/DeleteAccountModal.tsx` (line 59), `features/profile/hooks/useProfile.ts` (line 204).
- **Responsive Home, History, Profile, QR Generator pages** — All four main tab pages now import `useWindowDimensions`, compute `scale = clamp(width/390, 0.82, 1.15)`, and apply it via an `rf(fontSize)` helper inside their `makeStyles(colors, width)` functions. All font sizes (greeting, section titles, empty states, stat values, labels, badges, etc.) scale proportionally across small and large screens. The QR Generator was converted from a module-level static `const styles` to a dynamic `makeStyles()` function.

### Firestore Security Rules Fixes (`firestore.rules`)
- `isValidWeight` range corrected to `0.04–2.1` to cover Tier 1's minimum weight of `0.05`.
- Comment soft-delete rule now allows `deletedAt` and `text` fields in update so `softDeleteComment()` (which sets `text: "[deleted]"` and `deletedAt`) succeeds for users deleting their own comments.
- **IMPORTANT**: Changes to `firestore.rules` must be deployed via Firebase CLI (`firebase deploy --only firestore:rules`) — saving the file locally is not enough.

### Integrity Service Error Messages
- All rate-limit errors now show exact time remaining (e.g., "10 hours 23 minutes") instead of generic messages.
- Tier 0 block message shows exact countdown until the account's first 24 hours are up.
- Tier rate limits updated to be less restrictive (see tier table below).

### Firebase-Only Lock + Indian QR Code Support
- **DB config locked to Firebase** — `lib/db/config.ts` now uses `"firebase" as const`; the type no longer allows "supabase" or "postgres". `lib/db/index.ts` directly imports Firebase providers instead of using a runtime switch — no accidental connections possible.
- **Full EMV TLV parser** (`lib/analysis/payment-parser.ts`) — `parseEmvTlv()` decodes the EMV QRCPS (ISO 20022) TLV format byte-by-byte; `parseEmvQr()` uses it to extract merchant name (tag 59), merchant city (tag 60), amount (tag 54), currency (tag 53), MCC (tag 52), bill/reference numbers (tag 62), and scans merchant account info tags 26–51 for VPA, bank account number, and IFSC.
- **BharatQR / NPCI detection** — AID `A000000677` (BharatQR), `A000000524` (RuPay), bank-specific strings (HDFCBANK, oksbi, okaxis, okicici) all correctly identified; network, bank, city displayed on the payment card.
- **Indian bank account QR parser** (`parseIndianBankAccountQr`) — handles 4 formats: key:value pipes, key=value query strings, JSON, and line-by-line passbook QRs. Resolves bank name from IFSC prefix using a 35-bank lookup table. Account number is masked (shows only last 4 digits).
- **BBPS (Bharat Bill Payment System) parser** (`parseBbpsQr`) — handles `bbps://` scheme and `bbpsonline.com` URLs; extracts biller ID, category, customer reference, and amount.
- **PaymentCard UI updated** — new "extra fields" section in the gradient card shows account number (masked), IFSC, bank name, account type for bank account QRs; bill number, reference label, MCC for BharatQR EMV codes; biller ID and category for BBPS codes.
- **IFSC-to-bank lookup** — 35-entry map resolves IFSC prefixes (SBIN→SBI, HDFC→HDFC Bank, UTIB→Axis Bank, etc.) to both human names and `PaymentAppId` for correct card branding.

### Safety-First UX (Jobs Redesign)
- **Instant local verdict** — `computeInstantVerdict()` in `features/qr-detail/hooks/useQrSafety.ts` runs synchronously using `BUILT_IN_BLACKLIST` + URL/payment heuristics the moment content is known. No network required.
- **`getCombinedVerdict()`** in `useQrDetail.ts` merges local + community trust into a single verdict, with blacklist hits always winning.
- **Hero verdict card** in `app/qr-detail/[id].tsx` — large SAFE / CAUTION / DANGEROUS displayed immediately at top. No spinner.
- **Community Details** section collapses behind a toggle so the verdict is the first thing users feel, not a dashboard.

### Mobile / Native Fixes
- **Polyfills** (`polyfills.ts`) — added `TextEncoder`/`TextDecoder` via `@stardazed/streams-text-encoding` to prevent crashes in Firebase and analysis code on Hermes/JSC.
- **Firebase AsyncStorage** (`lib/firebase.ts`) — safer `require` with `.default ?? module` fallback to prevent null `AsyncStorage` on newer Metro versions.

### Play Store (AAB)
- `eas.json` added with `development` (APK/debug), `preview` (internal APK), and `production` (AAB/store) profiles.
- Run `eas build --platform android --profile production` to generate an AAB for Google Play.

## Architecture

- **Frontend**: Expo (React Native) with Expo Router for navigation, running on port 8081
- **Backend**: Express server running on port 5000 (only handles `/api/qr/decode-image`)
- **Primary Database**: Pluggable via `lib/db/config.ts` — default: Firebase Firestore
- **Realtime Database**: Pluggable — default: Firebase Realtime Database (notifications, scan velocity)
- **Auth**: Firebase Auth — email/password + Google OAuth (`expo-auth-session`)
- **PostgreSQL / Drizzle**: Ready stub at `lib/db/providers/postgres.ts`; schema in `shared/schema.ts`

## Environment Variables

All sensitive configuration is managed via environment variables — **no secrets are hardcoded in source files**.

| Variable | Description |
|---|---|
| `EXPO_PUBLIC_FIREBASE_API_KEY` | Firebase Web API key |
| `EXPO_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase Storage bucket |
| `EXPO_PUBLIC_FIREBASE_DATABASE_URL` | Firebase Realtime Database URL |
| `EXPO_PUBLIC_FIREBASE_APP_ID` | Firebase Android App ID |
| `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase Messaging Sender ID |
| `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID` | Google OAuth Web Client ID |
| `EXPO_PUBLIC_ANDROID_CLIENT_ID` | Google OAuth Android Client ID |

- In **Replit**: set via the Secrets / Environment Variables panel (values are stored securely, NOT in source code)
- In **local dev**: copy `.env.example` → `.env` and fill in your values (`.env` is in `.gitignore`)
- For **GitHub**: only `.env.example` (with placeholder names) is committed — real values are never in the repo

## Database Provider Abstraction

**To switch backend → edit ONE line** in `lib/db/config.ts`:
```ts
export const DB_PROVIDER = "firebase"  // ← change to "supabase" or "postgres"
```
- `lib/db/adapter.ts` — TypeScript interface (DbAdapter, RealtimeAdapter)
- `lib/db/providers/firebase.ts` — Firebase implementation (active)
- `lib/db/providers/supabase.ts` — Supabase stub (fill in, then flip config)
- `lib/db/providers/postgres.ts` — **Full** PostgreSQL implementation (generic JSONB document store + polling realtime adapter). Activate by setting `DB_PROVIDER = "postgres"` and providing `DATABASE_URL`.
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

## Privacy & Anonymous Mode

- **Signed-in Anonymous Scan**: When a signed-in user scans in anonymous mode, ZERO database interaction occurs — no `getOrCreateQrCode`, no `recordScan`, no scan count increment, no velocity tracking. Content is stored only in device AsyncStorage.
- **Double safety guard**: `processScan` in `useScanner.ts` detects `user && anonymousMode` and calls `processScanAnonymous` (no DB). Additionally, `recordScan` in `qr-service.ts` has an early-return guard for `userId && isAnonymous`.
- **Non-signed-in users**: Scans proceed normally — scan count increments, QR codes created/found in DB, velocity tracked. No user-specific data stored.

## Error Handling & Bug Reporting

- **`components/ErrorBoundary.tsx`**: React class error boundary wrapping the entire app, catches all render-time crashes.
- **`components/ErrorFallback.tsx`**: Production-ready crash screen with:
  - "Reload App" button (uses `reloadAppAsync`)
  - "Report Issue" button — opens an in-app form to submit a bug report directly to Firebase `bugReports` collection
  - "Dismiss and try to continue" option
  - Works in both development and production builds

## Scan Source Tracking

- Each scan record includes `scanSource: "camera" | "gallery"` stored in both AsyncStorage and Firestore.
- History page has "Camera" and "Gallery" filter tabs to separate the two scan types.

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

## Anti-Manipulation & Integrity System

`lib/services/integrity-service.ts` — central anti-fraud engine enforced server-side for ALL social actions.

### Account Tiers (vote weight only — rate limits disabled)
| Tier | Criteria | Vote Weight |
|------|----------|-------------|
| 0 | Unverified + < 24h old | 0.01 |
| 1 | Unverified 1-7d OR Verified <1d | 0.05 |
| 2 | 7-30d (any) | 0.3 |
| 3 | 30-90d verified | 0.7 |
| 4 | 90-180d verified | 1.5 |
| 5 | >180d verified | 2.0 |

**Rate limits are currently disabled.** No comments/day, reports/day, or comment cooldown restrictions are enforced. Only vote weight differs by tier. Limits can be re-enabled in `lib/services/integrity-service.ts` TIER_CONFIG when needed.

### Sybil / Multi-Account Attack Prevention
- QR code **owner cannot report their own QR** (enforced in `report-service.ts`)
- A user **cannot report the same QR code twice** — duplicate reports are blocked
- New accounts (<24h) get tier 0 weight (0.01) but are NOT blocked from social actions
- Each vote is stored with its `weight` — low-tier votes carry near-zero influence
- Trust score uses **weighted vote counts** not raw counts

### Collusion / Vote-Stuffing Detection (`analyzeReportsForCollusion`)
- Runs automatically after every report
- Detects: >8 same-direction votes in 1 hour, >70% low-tier voter concentration
- Sets `suspiciousVoteFlag`, `suspiciousSafeMultiplier`, `suspiciousNegMultiplier` on QR document
- Trust score applies these multipliers and clamps score toward Uncertain
- UI shows "Unusual voting activity detected" warning banner on affected QR codes

### Comment Anti-Spam
- Min cooldown between comments: 15-300 seconds based on tier
- Daily comment cap per user (1-30 depending on tier)
- Per-QR comment limit per user per day (1-15 depending on tier)
- Duplicate comment detection: same text within 60 minutes is blocked
- Length enforced: 3-500 characters

### Rate Limiting Storage (on user document)
- `reportRateWindowStart`, `reportRateCount` — rolling 24h report limit
- `commentRateWindowStart`, `commentRateCount` — rolling 24h comment limit
- `lastCommentAt` — cooldown enforcement
- `commentReportRateWindowStart`, `commentReportRateCount` — rolling 24h comment-report limit

### QR Document Flags
- `suspiciousVoteFlag: boolean` — set by collusion detection
- `suspiciousFlagReason: string` — human-readable reason
- `suspiciousSafeMultiplier: number` — applied to safe vote weight
- `suspiciousNegMultiplier: number` — applied to negative vote weight
- `voteVelocityWindowStart`, `voteVelocityCount` — global vote rate cap (30/hour)

## Deployment

- Build: `npm run expo:static:build && npm run server:build`
- Run: `npm run server:prod`
