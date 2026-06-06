# BinRo

A mobile-first QR code scanning and management app for Android, focused on security and user-generated content.

## Run & Operate

- **Build & Install Dev APK**: `npm install && npx expo run:android` (requires local Android SDK and `adb`)
- **Run Backend**: `npm run server:dev` (Express API on port 5000)
- **Run Frontend (Metro Bundler)**: `npm run expo:dev`
- **Required Env Vars**:
    - `EXPO_PUBLIC_FIREBASE_API_KEY`
    - `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
    - `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
    - `EXPO_PUBLIC_FIREBASE_DATABASE_URL`
    - `EXPO_PUBLIC_FIREBASE_APP_ID`
    - `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
    - `EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID`
    - `EXPO_PUBLIC_ANDROID_CLIENT_ID`
    - `GOOGLE_SAFE_BROWSING_API_KEY` (optional, for real threat intel)
    - `PORT` (defaults to 5000)
    - `REPLIT_DEV_DOMAIN`
    - `EXPO_PUBLIC_DOMAIN`

## Stack

- **Frontend**: Expo (React Native), Expo Router
- **Backend**: Express.js 5.x
- **Runtime**: Node 20+
- **State**: Zustand (`store/`) + React Context (`shared/contexts/`) — both coexist
- **ORM**: _Populate as you build_ (Drizzle ORM for PostgreSQL stub)
- **Validation**: Joi (implied by usage, explicit in security hardening)
- **Build Tool**: Metro Bundler, Expo CLI

## Where things live

- **Expo Router screens**: `app/` — thin wrappers; all screen logic lives in `features/`
- **Zustand stores**: `store/` — global UI/auth/notification state
  - `store/authStore.ts` — Zustand mirror of auth state (complements AuthContext)
  - `store/uiStore.ts` — toasts, modal flags, loading states
  - `store/notificationStore.ts` — notification badge count, read state
- **Feature modules**: `features/` — domain-scoped, each with `components/`, `hooks/`, `styles.ts`, `index.ts`
  - **QR Detail** (`features/qr-detail/`):
    - `QrDetailScreen.tsx` — root router (dispatches to dynamic/guard, dynamic/standard, static)
    - `dynamic/guard/` + `dynamic/standard/` — Living Shield and Standard QR detail screens
    - `static/` — StaticQrDetailScreen
    - `content-cards/` — canonical card system: `cards/` (per-type UI), `parsers/` (per-type parsing), `shared/` (CardHeader, InfoGrid, OpenButton)
    - `components/` — shared detail components (TrustScoreCard, PaymentCard, CommentsSection, etc.)
    - `hooks/` — useQrDetail, useQrData, useQrSafety, etc.
    - `styles/` — split stylesheet directory: layout.ts, banners.ts, guest.ts, comments.ts, owner.ts, index.ts; `styles.ts` is a re-export barrel
  - **My QR** (`features/my-qr/`):
    - `components/cards/` — QrHeroCard, QrStatsRow, GuardDestinationCard, etc.
    - `components/modals/` — DeactivateModal, ConfirmActionModal, FollowersModal, CustomColorModal
    - `components/panels/` — DesignPanel (thin orchestrator), QrSettingsPanel
    - `components/panels/tabs/` — ColorsTab, LogoTab, OptionsTab (tab content sub-components)
    - `components/comments/` — OwnerCommentRow, OwnerCommentsSection
    - `utils/qr-display.ts` — getEffectiveContentType, getDisplayText, extractSocialHandle
  - **Generator** (`features/generator/`):
    - `landing/` — GeneratorLanding, ModeCard, FeatureRow (entry point, imported by `app/(tabs)/qr-generator/index.tsx`)
    - `components/` — all form, output, and modal components
    - `data/` — registry.ts (QR type registry), presets, templates, ai-generator
    - `hooks/` — useQrGenerator, useQrActions, useQrSave, etc.
- **Shared layer**: `shared/` — pure shared layer, NO business logic
  - `shared/components/` — global UI atoms (`ui/`), feedback boundaries, consent, notifications
  - `shared/config/` — region constants, QR type styles
  - `shared/constants/` — colors, typography, content-types
  - `shared/contexts/` — AuthContext, ThemeContext, AvatarContext (import via `@/shared/contexts/`)
  - `shared/i18n/` — multi-language support (EN, HI, ML, TA, TE) + translations/
  - `shared/schemas/` — shared schema types (CategorySchema)
  - `shared/styles/` — reusable StyleSheet token helpers (common.ts)
  - `shared/types/` — shared type definitions (qr, trust, user)
  - `shared/utils/` — formatters, navigation, platform, haptics, number-format, query-client, URL risk, hooks
- **Services layer**: `services/`
  - `services/generator-service.ts` — re-export barrel → `services/generator/` (crud, updates, branding, velocity, verification)
  - `services/user-service.ts` — re-export barrel → `services/user/` (profile, favorites, privacy, username, search, leaderboard)
  - `services/comment-service.ts` — re-export barrel → `services/comments/` (cache, read, write, report)
  - `services/*.ts` — other domain services (qr, follow, report, notification, integrity, etc.)
  - `services/cache/` — anonymous session and QR caching
  - `services/analysis/` — QR/URL heuristic analysis, threat intelligence, scam detection
  - `services/notifications/` — NOTIFICATIONS_ENABLED feature flag
- **Infrastructure**: `lib/` — ONLY pure infrastructure; do not add business logic here
  - `lib/db/` — database adapter pattern (Firebase locked; Supabase/Postgres stubs)
  - `lib/auth/` — auth adapter and Firebase auth provider
  - `lib/firebase.ts` / `lib/firebase/` — Firebase client config
  - `lib/firestore-service.ts` — Firestore service layer
  - `lib/security/` — ECDSA signature verification
  - `lib/qr-analysis.ts` — re-export barrel for `services/analysis/` (backward compat)
  - `lib/haptics.ts`, `lib/number-format.ts`, etc. — re-export barrels pointing to `shared/utils/` (backward compat; new code should import from `@/shared/utils/` directly)
  - **DO NOT ADD** business logic, utilities, or UI helpers to `lib/` — use `shared/` or `services/`
- **QR Type Registry**: `features/generator/data/registry.ts` — single source of truth for all QR types; **add new types here only**
- **Express backend**: `server/`
  - `server/routes.ts` — thin orchestrator (~190 lines); calls `register*Route(app)` helpers
  - `server/routes/ai-qr.ts` — AI QR generation (smart parser + OpenAI fallback)
  - `server/routes/standard-content.ts` — `/go/:slug` standard QR content page
  - `server/routes/donation.ts`, `safe-browsing.ts`, `qr-active.ts`, `index.ts` — other domain routes
- **DB schema (PostgreSQL stub)**: `shared/schema.ts`
- **DB provider config**: `lib/db/config.ts`
- **Firestore Security Rules**: `firestore.rules` (deploy separately via Firebase CLI)

## Architecture decisions

- **Android-only focus**: Web support was removed to streamline development and focus on the primary mobile use case.
- **Pluggable Database**: Database adapter pattern (`lib/db/adapter.ts`) supports Firebase, Supabase, and PostgreSQL. Currently locked to Firebase Firestore for primary data and Firebase Realtime Database for notifications/velocity.
- **Client-side Firebase Auth**: All authentication is handled directly by Firebase on the client, with session syncing and auto-login.
- **Service Layer Design**: Business logic is in `services/` — each service owns a single responsibility. Large services are split into domain subdirectories (`services/generator/`, `services/user/`, `services/comments/`); the original `.ts` file becomes a re-export barrel so no imports break.
- **State management**: Zustand (`store/`) for global UI/notification state; React Context (`shared/contexts/`) retained for auth, theme, and avatar. Both coexist — Zustand does not replace Context.
- **Security by Default**: QR input validation, ECDSA response signing, report rate limits, Firestore circuit breaker, and encrypted threat storage via `expo-secure-store`.
- **QR Type Registry pattern**: `features/generator/data/registry.ts` is the single source of truth. `presets.ts` and `qr-builder.ts` derive from it. Adding a new QR type = append one object to `QR_REGISTRY` + add key to `QR_CATEGORY_KEYS`. No other files need to change.
- **Navigation links (owner flow)**: Generator success → `/my-qr/[docId]`. My QR management header has a globe button → `/qr-detail/[uuid]?ownerDocId=...`. QR detail shows "Manage" button when logged-in user is the QR owner.
- **File size rule**: Files > ~300 lines are candidates for extraction. Pattern: move heavy logic into a sub-directory, keep the original file as a thin orchestrator or re-export barrel.

## Product

- QR code scanning (camera, gallery) and generation.
- Real-time threat intelligence (Google Safe Browsing API v4) and local heuristic analysis.
- User profiles with scan history, favorites, generated QRs, and privacy controls.
- Social features: comments, following QRs, friend requests, notifications.
- Multi-language support (English, Hindi, Malayalam, Tamil, Telugu).
- Anti-fraud and integrity system (weighted reporting, collusion detection, rate limits).
- Consent and legal disclaimer modal for user agreement management.
- Dynamic UI scaling for responsive layouts on various screen sizes.

## User preferences

- _Populate as you build_

## Gotchas

- **Android Cleartext Traffic**: `CLEARTEXT communication not permitted` errors usually mean the dev APK needs to be rebuilt with updated network security config: `npx expo prebuild --platform android --clean && npx expo run:android`.
- **Firebase Rules Deployment**: Changes to `firestore.rules` require manual deployment via Firebase CLI (`firebase deploy --only firestore:rules`) to take effect.
- **PostgreSQL/Drizzle**: The `server/storage.ts` and Drizzle schema are not actively used for database operations; they are a stub for future migration and should not be deleted.
- **Local Dev Env**: Requires Android SDK, `adb`, Node 20+, npm, and a physical Android device or emulator. Replit cannot run `npx expo run:android`.
- **lib/security/**: Only `signature-verifier.ts` is active (used by `services/analysis/threat-service.ts`). Do not add duplicate analysis files here.
- **Re-export barrels**: `services/generator-service.ts`, `services/user-service.ts`, `services/comment-service.ts` are now 1-line barrels. Never add logic back to them — use the subdirectory files instead.

## Pointers

- **Expo Router**: [https://docs.expo.dev/router/](https://docs.expo.dev/router/)
- **Firebase Documentation**: [https://firebase.google.com/docs](https://firebase.google.com/docs)
- **Google Safe Browsing API**: [https://developers.google.com/safe-browsing](https://developers.google.com/safe-browsing)
- **React Native Google Sign-In**: [https://github.com/react-native-google-signin/google-signin](https://github.com/react-native-google-signin/google-signin)
- **`expo-secure-store`**: [https://docs.expo.dev/versions/latest/sdk/securestore/](https://docs.expo.dev/versions/latest/sdk/securestore/)
