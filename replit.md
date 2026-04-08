# QR Guard

A full-stack mobile-first QR code scanning and management app built with Expo (React Native) and Express. Supports Android (Play Store), and web browsers.

## Recent Changes

### QR Code Groups
Users can now organise their generated QR codes into named groups (e.g., per organisation, project, or personal use).

**New files:**
- **`lib/services/group-service.ts`** — Full CRUD service for QR groups stored in Firestore at `users/{userId}/qrGroups/{groupId}`. Supports real-time subscriptions, create/update/delete groups, add/remove individual QR codes from groups.
- **`app/qr-groups.tsx`** — Groups list screen with stats strip, search, inline group creation (name, description, colour picker, icon picker) and swipe-to-delete.
- **`app/qr-group/[id].tsx`** — Group detail screen showing all QR codes in the group with coloured header, inline edit, and per-card remove/share actions.
- **`components/groups/GroupPickerModal.tsx`** — Bottom sheet modal for adding/removing a QR from any group, with search and inline "Create New Group" flow.

**Updated files:**
- **`app/my-qr-codes.tsx`** — Added "Groups" button in the nav bar and a folder icon on every QR card that opens the GroupPickerModal.
- **`app/(tabs)/qr-generator.tsx`** — After a QR is saved to profile, an "Add to Group" button appears that opens the GroupPickerModal for the just-created QR.
- **`features/generator/hooks/useQrGenerator.ts`** — Now tracks `savedDocId` (the Firestore docId of the last saved QR) and exposes it.
- **`lib/services/generator-service.ts`** — `saveGeneratedQr` now returns the newly created document ID (`string`) instead of `void`.
- **`lib/services/index.ts`** — Exports `group-service`.



### Consent & Legal Disclaimer Modal
- **`components/ConsentModal.tsx`** — Full-screen consent gate shown before any user can interact with the app (both new and existing users, whenever the consent version bumps). Contains 11 legal sections covering: Beta disclaimer, no-warranty clause, limitation of liability, data collection disclosure, data usage, data breach disclaimer, third-party disclaimer, assumption of risk, dispute resolution (Indian law, arbitration-first, class-action waiver), terms update policy, and contact info. A checkbox must be ticked before the "I Accept — Continue to App" button activates.
- **Consent versioning** — Consent stored in AsyncStorage under key `qrguard_consent_version`. Changing `CONSENT_VERSION` constant in `ConsentModal.tsx` forces all users (new and existing) to re-accept.
- **`app/_layout.tsx`** — `ConsentGatedApp` component wraps the entire app and shows `ConsentModal` until the user accepts. Expo Router navigation renders behind the modal, fully blocked.
- **Terms route registered** — `terms` added to the Stack navigator so the modal's Terms of Service link works.
- **To bump consent**: increment `CONSENT_VERSION` in `components/ConsentModal.tsx`, rebuild web (`npm run web:build`), restart backend.

### Web Support Added
- **Web build** (`web-build/`) — generated via `npm run web:build` (runs `expo export --platform web`). The backend serves this as a full SPA to any browser that visits the site.
- **Backend updated** (`server/index.ts`) — `configureExpoAndLanding` now detects the `web-build/` directory and serves `index.html` with SPA fallback for all non-API, non-Expo routes. Mobile Expo clients (with `expo-platform` header) still receive the native manifest as before.
- **Rebuild web**: run `npm run web:build` whenever you make UI changes to regenerate the web bundle.

### Real Threat Intelligence + i18n Multi-Language Support

#### Threat Detection — Honest & Real
- **Removed false "AI" claims** — All UI references to "QR Guard AI" replaced with accurate labels: "Security analysis by QR Guard" and "Verified by QR Guard Security".
- **`server/routes/safe-browsing.ts`** — New server endpoint `POST /api/check-url` that calls **Google Safe Browsing API v4** (real threat intelligence, updated in real-time by Google). Detects MALWARE, SOCIAL_ENGINEERING, UNWANTED_SOFTWARE, and POTENTIALLY_HARMFUL_APPLICATION. Falls back gracefully when `GOOGLE_SAFE_BROWSING_API_KEY` is not set.
- **`lib/security/threat-intelligence.ts`** — New client library that queries the server's Google Safe Browsing proxy. Returns full threat metadata (type, platform, confidence). Falls back to `api-unavailable` when the server is unreachable so local heuristics remain active.
- **`server/routes.ts`** — Registered `registerSafeBrowsingRoute(app)` in the main route registration.
- **`.env.example`** — Added `GOOGLE_SAFE_BROWSING_API_KEY` documentation with setup instructions.

#### i18n Framework — 5 Languages
- **Packages installed**: `i18next@23`, `react-i18next@13`, `expo-localization`
- **`lib/i18n/index.ts`** — i18next setup with automatic device language detection, fallback to English. Exports `SUPPORTED_LANGUAGES` and `SupportedLanguageCode` types.
- **`lib/i18n/useAppTranslation.ts`** — Typed `useAppTranslation()` hook for use in components.
- **`lib/i18n/translations/en.ts`** — English (default): complete translation for all screens, tabs, safety, auth, errors, content types, risk levels.
- **`lib/i18n/translations/hi.ts`** — Hindi (हिंदी): full translation.
- **`lib/i18n/translations/ml.ts`** — Malayalam (മലയാളം): full translation.
- **`lib/i18n/translations/ta.ts`** — Tamil (தமிழ்): full translation.
- **`lib/i18n/translations/te.ts`** — Telugu (తెలుగు): full translation.
- **`app/_layout.tsx`** — Imports `@/lib/i18n` at startup to initialize the i18n framework.

#### Usage in Components
Use `useAppTranslation()` hook in any component:
```tsx
import { useAppTranslation } from "@/lib/i18n/useAppTranslation";
const { t } = useAppTranslation();
// Then use: t("tabs.home"), t("safety.dangerDetected"), etc.
```

Change language programmatically:
```tsx
import i18n from "@/lib/i18n";
i18n.changeLanguage("ml"); // Switch to Malayalam
```

### Evidence-Based Trust UI, Professional VerdictBanner, Dynamic Threats, Secure Storage & Security Hardening

#### Evidence Logic Cards
- **`lib/analysis/types.ts`** — Added `Evidence` type `{ type: "positive"|"negative"|"neutral"|"info", label, value }`. Updated `UrlSafetyResult` and `PaymentSafetyResult` to carry an `evidence: Evidence[]` array alongside the existing `warnings[]`.
- **`lib/analysis/url-analyzer.ts`** — `analyzeUrlHeuristics` now populates `evidence` for every check: protocol (HTTPS positive vs HTTP negative), host type, URL shortener, TLD, brand verification, subdomain depth, path patterns, redirect chains, URL length, and Punycode encoding.
- **`lib/analysis/payment-analyzer.ts`** — `analyzeAnyPaymentQr` now populates `evidence` items: payment network, region, recipient name/VPA, transaction type (crypto irreversible), wallet address, and pre-filled amount checks.
- **`features/qr-detail/components/EvidenceCard.tsx`** — New component rendering evidence as a 2-column chip grid ("Logic Cards"). Each chip shows an icon, a small label, and the detail value. Color-coded: green for positive, red for negative, sky-blue for info, muted gray for neutral. Dark, technical card aesthetic matching a "hardware tool" feel.
- **`app/qr-detail/[id].tsx`** — `EvidenceCard` rendered below `SafetyWarningCard` for URL and payment content types.

#### VerdictBanner — Professional Muted Palette
- Replaced bright `LinearGradient`-filled icon circles and saturated colored backgrounds with a "Hardware/Specialist Tool" aesthetic.
- Dark subtle tinted backgrounds per verdict (deep green / amber / red tints), thin border at 16% opacity.
- Left-side colored accent bar replaces background fill for color signaling.
- Bordered square icon box (semi-transparent fill, 27% opacity border) instead of gradient-filled circle.
- Technical status labels: "ANALYSIS COMPLETE", "RISK DETECTED", "THREAT CONFIRMED" with a small status dot.
- No `LinearGradient` in the banner at all.

#### Dynamic Threat Definitions from Backend
- **`server/routes.ts`** — Added `GET /api/threats` endpoint returning a versioned JSON object of dynamic threat patterns, allowing the app's threat intelligence to be updated server-side without app store releases.
- **`lib/analysis/threat-service.ts`** — New service: `fetchThreatDefinitions()` fetches `/api/threats` on demand (with 6h in-memory cache) and persists new dynamic patterns to device storage via `saveOfflineBlacklist`.
- **`features/qr-detail/hooks/useQrSafety.ts`** — Calls `fetchThreatDefinitions()` on mount (fire-and-forget) to refresh threat definitions from the server whenever the detail screen opens.

#### Living Shield Security — Destination Validation
- **`server/routes.ts`** — Added `isSafeRedirectDestination()` validation on all Living Shield (`/guard/:uuid`) redirects. Blocks `javascript:`, `data:`, and any non-HTTP(S) protocol. Returns a blocked-page HTML response instead of redirecting to an unsafe URL, closing the redirect-hijacking vector.

#### AsyncStorage → expo-secure-store for Threat Storage
- Installed `expo-secure-store`.
- **`lib/analysis/blacklist.ts`** — Replaced `AsyncStorage` (unencrypted, OS-clearable) with `expo-secure-store` (OS keychain/keystore, encrypted at rest). Dynamic threat patterns are now stored encrypted. Implemented chunked storage (15 patterns per SecureStore key) to respect the 2KB per-key limit, with a metadata key tracking chunk count and freshness timestamp.

### Premium Brand Redesign — One Brand Blue + Navigation Bar Fix
- **New color system** (`constants/colors.ts`) — Replaced the 6-color rainbow palette with a single "QR Guard Blue" brand color (`#4B8EF5` dark / `#0052CC` light). Added `primaryShade`, `safeShade`, `dangerShade`, `warningShade` for monochromatic gradient pairs. Semantic colors (green/amber/red) reserved for safe/warning/danger states only — never used decoratively. Removed separate cyan/purple accent colors entirely. `accent` is now always equal to `primary`.
- **Android navigation bar fix** (`contexts/ThemeContext.tsx`) — Added `expo-system-ui` `setBackgroundColorAsync(colors.background)` call in a `useEffect` keyed on `colors.background`. This syncs the Android nav bar color with the current app theme whenever it changes, eliminating the dark/light color mismatch on theme switch.
- **Tab bar scan button** (`app/(tabs)/_layout.tsx`) — Replaced `["#00E5FF", "#006FFF"]` with `[colors.primary, colors.primaryShade]` monochromatic blue gradient. Shadow color updated to `colors.primary`.
- **TrustScoreCard** (`features/qr-detail/components/TrustScoreCard.tsx`) — Replaced rainbow REPORT_TYPES and STATS gradients. Safe=green, Scam=red, Fake=amber, Spam=blue. Stat icons all use primary blue, reports icon uses danger red.
- **HistoryItem** (`features/history/components/HistoryItem.tsx`) — Replaced 15-entry static rainbow TYPE_META with a dynamic function using colors from theme. URL/wifi/email/sms=blue, phone/otp=green, payment=amber, location/danger=red, document=neutral gray.
- **ContentCard** (`features/qr-detail/components/ContentCard.tsx`) — Same semantic gradient logic as HistoryItem applied to TYPE_CONFIG.
- **OwnerCard** (`features/qr-detail/components/OwnerCard.tsx`) — Business type=amber, Government=blue, Individual=green. Replaced hardcoded `#EF4444`/`#10B981`/`#8B5CF6`/`#EC4899` with theme colors.
- **SafetyWarningCard** (`features/qr-detail/components/SafetyWarningCard.tsx`) — Replaced `#EF4444`/`#DC2626`/`#F59E0B`/`#F97316` with `colors.danger`/`colors.dangerShade`/`colors.warning`/`colors.warningShade`.
- **ModeSelector** (`features/generator/components/ModeSelector.tsx`) — Replaced `#FBBF24` business mode color with `colors.warning`/`colors.warningDim`.
- **QrOutputCard** (`features/generator/components/QrOutputCard.tsx`) — Replaced `#FBBF24` business note color with `colors.warning`.
- **LivingShieldModal** (both `components/scanner/` and `features/scanner/`) — Replaced all `#FBBF24` with `colors.warning`, migrated from static `Colors.dark.*` to `useTheme()` for proper light/dark support.
- **Home screen** (`app/(tabs)/index.tsx`) — Replaced rainbow `gradientMap` with semantic `getScanGradient()` function (payment=amber, location=red, phone/otp=green, else=blue). Hero card gradient uses dark navy/light blue theme-aware colors.
- **Auth screens** (`app/(auth)/login.tsx`, `register.tsx`, `forgot-password.tsx`) — Replaced `["#00E5FF","#0090CC","#006FFF"]`/`["#B060FF","#006FFF","#00E5FF"]`/`["#00D68F","#00A67E"]` logo and button gradients with `[colors.primary, colors.primaryShade]`.
- **QR Generator** (`app/(tabs)/qr-generator.tsx`) — Generate button gradient updated from cyan-blue to `[colors.primary, colors.primaryShade]`.
- **Favorites** (`app/favorites.tsx`) — TYPE_CONFIG gradients updated to use brand blue/semantic values (no more purple/cyan/orange). Sign-in button gradient updated. Heart color changed from `#FF4D6A` to `#F87171` (softer red).
- **My QR Codes** (`app/my-qr-codes.tsx`) — Business pill updated to `[colors.warning, colors.warningShade]`, Individual pill to `[colors.primary, colors.primaryShade]`.
- **How It Works** (`app/how-it-works.tsx`) — `#FBBF24` replaced with `colors.warning`.
- **Profile** (`app/(tabs)/profile.tsx`) — Background gradient updated from hardcoded `#050B18`/`#061527` to theme-aware `colors.background`/`colors.surface`.

### Search Fix, Notifications, Friend Notifications, Privacy Settings Cleanup (Round 2)
- **LinearGradient crash fixed** (`app/search.tsx`) — the action button (Add Friend / Sent / etc.) previously used `LinearGradient` with `rgba()` color strings which crash on Android native. Replaced with a plain `View` using `backgroundColor` with hex + alpha suffix strings. LinearGradient import kept for the hero gradient.
- **Notification badge capped at 9+** (`app/(tabs)/index.tsx`) — changed `notifCount > 99 ? "99+"` to `notifCount > 9 ? "9+"` so the badge stays compact.
- **Notifications enabled** (`lib/notifications/config.ts`) — flipped `NOTIFICATIONS_ENABLED` from `false` to `true` to activate the full notification system.
- **Notification types added** (`lib/services/types.ts`) — defined `NotificationType` union and `Notification` interface (with `fromUsername` field) that were imported but missing. Added `"friend_request"`, `"friend_accepted"`, `"friend_declined"` to the union. Extended `NotificationData` with `fromUsername`.
- **Notification service refactored** (`lib/services/notification-service.ts`) — changed internal `pushNotification` to accept an `opts` object for `qrCodeId` and `fromUsername` instead of a positional `qrCodeId` arg. Added `notifyFriendRequest` and `notifyFriendAccepted` exports. Updated all existing call sites.
- **Friend service fires notifications** (`lib/services/friend-service.ts`) — `sendFriendRequest` now calls `notifyFriendRequest` to the recipient. `acceptFriendRequest` looks up the acceptor's stored info from Firestore and calls `notifyFriendAccepted` to the original requester.
- **NotificationsModal handles friend events** (`features/home/components/NotificationsModal.tsx`) — added icons and colours for `friend_request` (`person-add`, safe green), `friend_accepted` (`people`, primary), `friend_declined` (`person-remove`, danger). Tapping a friend notification navigates to `fromUsername` profile instead of QR detail.
- **Privacy settings — QR invite section removed** (`app/privacy-settings.tsx`) — removed the "My Friend QR Code" collapsible panel, the `showInviteQR` state, `handleShareProfile`, the `profileUrl` constant, and now-unused imports (`QRCode`, `Share`, `MaterialCommunityIcons`). Cleaned up orphaned styles.
- **Privacy settings — at-least-one enforcement** (`app/privacy-settings.tsx`) — the five public visibility toggles (`showStats`, `showFriendsCount`, `showScanActivity`, `showRanking`, `showActivity`) now validate before toggling: if the user would turn off the last enabled option, an Alert fires and the toggle is blocked.

### Private Account Redesign, Unfriend Button & Privacy Policy Updates
- **Branded private profile screen** (`app/profile/[username].tsx`) — replaced the plain text private account view with a fully designed layout. Non-friends viewing a private profile now see: a gradient hero cover with the user's avatar and glow ring, display name and @username, and a branded card showing "[FirstName] has made this account private" with the QR Guard shield branding. The card uses the existing cover gradient colours and dark/light theming.
- **Friends see full profile** — When `friendStatus === "friends"`, the private account gate is skipped entirely and the viewer sees the complete profile, matching the public profile layout.
- **Unfriend button** (`app/profile/[username].tsx`) — On public and private (friend-visible) profiles, when already friends, the single "Friends" button is replaced with two components: a green "Friends ✓" status badge and a separate "Unfriend" destructive button. Tapping Unfriend shows the existing confirmation Alert before removing the friend.
- **Privacy setting wording** (`app/privacy-settings.tsx`) — The private/public toggle description now reads "Your profile is visible to everyone worldwide (default)" for public, and "Only friends can see your full profile — everyone else sees your name and avatar only" for private.
- **Privacy Policy updated** (`app/privacy-policy.tsx`) — Added new section 8 "Profile Privacy Controls" covering public/private modes, what non-friends can see, the friends request system, and the unfriend flow. All subsequent section numbers incremented. Effective date updated to March 26, 2026.
- **Terms of Service updated** (`app/terms.tsx`) — Added new section 9 "Profile Visibility & Friends" explaining default public visibility, private mode behaviour, and the unfriend feature. Effective date updated to March 26, 2026.

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
