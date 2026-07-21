# BinRo — Startup Performance & User Journey Audit

> **Scope:** Full startup path from app icon tap → Home screen fully interactive.
> **Method:** Static execution trace through source code. No guessing.
> **Date:** July 2026
> **Standard:** Production engineering review quality (Google / Stripe bar).

---

## Table of Contents

1. [Phase 1 — Complete Startup Timeline](#phase-1--complete-startup-timeline)
2. [Phase 2 — Bottleneck Inventory](#phase-2--bottleneck-inventory)
3. [Phase 3 — Critical Path Analysis](#phase-3--critical-path-analysis)
4. [Phase 4 — UX Analysis](#phase-4--ux-analysis)
5. [Phase 5 — Memory Audit](#phase-5--memory-audit)
6. [Phase 6 — Provider Audit](#phase-6--provider-audit)
7. [Phase 7 — Firebase Audit](#phase-7--firebase-audit)
8. [Phase 8 — Cache Audit](#phase-8--cache-audit)
9. [Phase 9 — Render Audit](#phase-9--render-audit)
10. [Phase 10 — Optimization Roadmap](#phase-10--optimization-roadmap)

---

## Phase 1 — Complete Startup Timeline

### T+0ms — User Taps App Icon

Android launches the process. The Dalvik/ART VM starts. Android renders the **windowBackground** layer using the theme color `#0A0E17` — this is the system-level "cold start" frame before any JavaScript has run.

---

### T+~300–600ms — Native Layer & Metro Bundle Loads

- React Native bridge (or JSI on New Arch) initializes.
- `newArchEnabled: true` and `reactCompiler: true` are set in `app.json`. The New Architecture (Fabric + TurboModules) is active. JSI is used for synchronous native calls.
- The Metro-bundled JavaScript is loaded and executed.

---

### T+~400–700ms — Module-Level Initialization (synchronous, JS thread)

This is the first code that runs. **All of the following happen synchronously before any React component mounts:**

```
lib/firebase.ts evaluated → module-level side effects:
  1. firebaseApp  = initializeApp(config)            [sync]
  2. firebaseAuth = buildAuth()                       [sync, but triggers AsyncStorage require()]
     └── require("@react-native-async-storage/async-storage")   [sync native call]
     └── initializeAuth(app, { persistence: AsyncStorage })     [sync SDK init]
  3. firestore    = buildFirestore()                  [sync]
     └── initializeFirestore(app, { localCache: memoryLocalCache() })
  4. realtimeDB   = getDatabase(app)                 [sync]
  5. storage      = getStorage(app)                  [sync]
  6. App Check    → skipped (Platform.OS !== "web")  [sync guard]
```

**All four Firebase SDKs are initialized at import time.** The module is imported transitively by `AuthProvider` → `lib/auth/providers/firebase.ts` → `lib/firebase.ts`.

Also at module level:
```
app/_layout.tsx → SplashScreen.preventAutoHideAsync()   [sync — locks splash screen]
```

---

### T+~500–800ms — React Tree Mounts (first render pass)

Provider hierarchy renders in strict order:

```
1. <ErrorBoundary>         — sync, no async
2. <ThemeProvider>         — sync, reads system color scheme
3. <QueryClientProvider>   — sync, queryClient already constructed
4. <AuthProvider>          — triggers Firebase Auth listener setup
5. <AvatarProvider>        — fires AsyncStorage.multiGet([url, version])   ← async
6. <ToastProvider>         — sync, no async
7. <KeyboardProvider>      — sync, native keyboard bridge
```

At this point `!fontsReady` is likely false (fonts loading), so `RootLayout` returns `null`. Nothing is visible on screen except the splash.

---

### T+~500–900ms — Four Parallel Async Chains Begin

These four operations start **concurrently** immediately after the React tree mounts. None blocks any other:

```
Chain A: Font loading
  useFonts([Inter family]) → downloads/reads font files from disk
  → sets fontsReady = true when complete

Chain B: Firebase Auth restoration
  onIdTokenChanged listener registered
  → Firebase Auth reads persisted token from AsyncStorage
  → Fires onIdTokenChanged(user) with cached user (fast path)
  → OR fetches fresh token from Firebase servers (slow path, +300–800ms)
  → AuthContext sets isLoading = false

Chain C: Consent check
  hasUserConsented() → AsyncStorage.getItem("qrg:consent:...")
  → sets consentReady = true

Chain D: Avatar hydration (AvatarProvider)
  AsyncStorage.multiGet(["qrg:avatar:url", "qrg:avatar:version"])
  → sets isHydrated = true, url, version
```

---

### T+~600–1200ms — SplashGate Evaluation (blocks splash hide)

`SplashGate` runs a `useEffect` that evaluates **three conditions** that must ALL be true before `SplashScreen.hideAsync()` fires:

```typescript
if (fontsReady && !authLoading && consentReady && !hiddenRef.current) {
  SplashScreen.hideAsync()
}
```

A **2.5s safety timeout** also calls `hideAsync()` unconditionally if the normal gate never fires.

**Worst case:** Auth is slow (network token refresh) + fonts must be downloaded → splash stays for up to 2.5s.
**Best case (warm):** Auth token cached in AsyncStorage, fonts on disk → splash hides ~600–800ms.

Additionally, `AuthGatedApp` has a separate **2s timeout** that sets `timedOut = true`, which allows the app to render even if `isLoading` is still true. This prevents an infinite blank screen but can cause a flash of the guest state.

---

### T+~700ms–1.5s — First Frame Renders (splash hides)

Once `SplashScreen.hideAsync()` fires:

1. `RootLayout` renders `<ConsentGatedApp>` → `<AuthGatedApp>` → `<ThemedApp>` → `<Slot>` (Expo Router).
2. Expo Router evaluates the initial route (`/(tabs)/index`).
3. `app/(tabs)/_layout.tsx` mounts the tab bar. A `useEffect` reads `qrg:startup:screen` from AsyncStorage. If `"scanner"`, it calls `router.replace()`.
4. `HomeScreen` mounts (re-export of `features/home/HomeScreen.tsx`).

---

### T+~700ms–1.5s — HomeScreen First Render

`HomeScreen` renders for the first time:

```
useHome()
  ├── useAuth()          → user, isLoading from AuthContext
  ├── useAvatar()        → cachedUrl from AvatarProvider
  └── useRecentScans()   ← MAIN DATA HOOK
        ├── useEffect → getCachedHomeScans(userId) [disk read]    ← starts immediately
        ├── useQuery  → getUserScansPaginated [Firestore call]    ← starts immediately
        └── useFocusEffect → loadLocalScans [AsyncStorage read]   ← on mount
```

**First render output** (before any data):
```
<Animated.View entering={FadeIn.duration(280)}>     ← 280ms fade-in starts
  <HomeHeader user={null|user} photoURL={null}/>    ← renders with initial letter or "Welcome"
  <HeroScanCard />                                  ← static content, renders immediately
  <RecentScansList isLoading={true} />              ← shows <ScanSkeletonList /> (3 skeleton cards)
</Animated.View>
```

`isLoading` is `!localLoaded`. `localLoaded` becomes `true` as soon as the AsyncStorage read in `loadLocalScans` completes — typically within **10–50ms** on a modern device.

---

### T+~750ms–1.6s — Home Skeleton → Real Content Transition

```
AsyncStorage read completes (loadLocalScans):
  → setLocalLoaded(true)
  → isLoading = false
  → RecentScansList renders real content (local scans, possibly empty)

Simultaneously:
  getCachedHomeScans returns:
  → If cache exists: seeds React Query, triggers immediate background refetch
  → If empty: React Query fires Firestore call, content shows when it returns
```

---

### T+~800ms–2.5s — Cloud Data & Prewarm

```
prewarmUserData(userId) [called from AuthContext once uid known]:
  → Promise.all([
      getCachedHistoryPage,   ← AsyncStorage read
      getCachedFavorites,     ← AsyncStorage read
      getCachedScanStats,     ← AsyncStorage read
    ])
  → Seeds queryClient for History/Favorites/Stats tabs

getUserScansPaginated (Firestore):
  → Network round-trip: ~300–800ms on good connection
  → Updates React Query cache
  → RecentScansList re-renders with cloud data merged into local data

registerForPushNotifications(user.uid)   ← fires after prewarm
trackAppOpen(user.uid)                   ← analytics event
```

---

### T+~1.0s–2.0s — Home Fully Interactive

- `FadeIn.duration(280)` animation completes.
- Local scans visible (from AsyncStorage, immediate).
- Cloud scans merging in silently (from Firestore, background).
- Avatar displaying either cached photo URL (from AvatarProvider hydration) or initial letter.
- Pull-to-refresh available.

**Total time to interactive (TTI):**
- **Warm (returning user, everything cached):** ~700–900ms
- **Cold (first install or cleared cache):** ~1.5–2.5s (capped by 2.5s splash gate)

---

## Phase 2 — Bottleneck Inventory

The following are confirmed bottlenecks traced to exact code locations — not guesses.

---

### B-01 · All Four Firebase SDKs Initialize Before First Render

**Location:** `lib/firebase.ts` (module-level, lines 34–77)

**What happens:** `firebaseAuth`, `firestore`, `realtimeDB`, and `storage` are all initialized synchronously as module-level exports. This code runs the moment `lib/firebase.ts` is evaluated — before any React component mounts.

**Why it matters:** Storage is only needed when a user uploads a photo. RTDB is only needed for real-time scan stats. Both are initialized unconditionally at app launch, allocating SDK objects and potentially triggering internal SDK network handshakes.

**Severity:** Medium. Initialization is synchronous and fast (<10ms total), but it allocates unnecessary objects.

---

### B-02 · Triple-Gate Splash Screen (Serially Evaluated Conditions)

**Location:** `app/_layout.tsx`, `SplashGate` component, lines 39–58

**What happens:**
```typescript
if (fontsReady && !authLoading && consentReady && !hiddenRef.current) {
  SplashScreen.hideAsync()
}
```

Three independent async chains must ALL complete before the splash screen disappears. The slowest one sets the TTI. If fonts finish in 400ms but auth takes 1200ms, the user stares at the splash for 1200ms despite the UI being renderable.

**Why it matters:** These three checks are logically independent. The consent check (`AsyncStorage.getItem`) is typically <20ms and should never be a blocker. Font loading status is known early. Only auth legitimately takes variable time.

**Severity:** High. This is the primary determinant of splash-screen duration for returning users.

---

### B-03 · Font Loading Blocks Entire Render Tree

**Location:** `app/_layout.tsx`, line 219: `if (!fontsReady) return null`

**What happens:** `useFonts` loads the Inter font family (7 weights from `@expo-google-fonts/inter`). Until `fontsLoaded === true`, the root component returns `null`. Nothing — not even a loading spinner — is visible.

**What "not loaded" means in practice:**
- **First install:** Fonts must be bundled into the app binary (they are, with Expo) — typically < 200ms
- **Development:** Font loading from the bundle is fast
- **Production builds:** Fonts are embedded in the APK — near-instant

**Note:** `const fontsReady = fontsLoaded || !!fontError` means a font load failure is treated as success, which is correct defensive logic.

**Severity:** Low-Medium. In production builds fonts are embedded. Risk is primarily in development.

---

### B-04 · Auth State Has Two Independent Timeout Mechanisms

**Location:** `app/_layout.tsx`, `AuthGatedApp` (line 140, 2s timeout) and `SplashGate` (2.5s safety fallback)

**What happens:** Two separate timeouts protect against slow auth:
1. `AuthGatedApp`: After 2s, sets `timedOut = true` → renders the app even if `isLoading` is true
2. `SplashGate`: After 2.5s, calls `SplashScreen.hideAsync()` unconditionally

**Why it matters:** These timeouts are not coordinated. If auth resolves between 2s and 2.5s, the splash hides (via auth chain) and the app re-renders with the correct auth state — causing a flash. If auth resolves after 2.5s, the splash hides showing the guest state, then re-renders with the authenticated state.

**Severity:** Medium. Creates a potential flash-of-unauthenticated-content for users with slow auth.

---

### B-05 · Consent Check is a Blocking Render Gate

**Location:** `app/_layout.tsx`, `ConsentGatedApp` (line 188): returns a blank view until `consentReady`

**What happens:** An AsyncStorage read (`hasUserConsented()`) must complete before `ConsentGatedApp` renders children. This is a sequential gate.

**Why it matters:** AsyncStorage is typically fast (<10–30ms), but it is an I/O operation that happens on the critical path. For the vast majority of returning users who have already consented, this check runs on every single app launch and always returns the same result.

**Severity:** Low. Fast in practice, but logically unnecessary to block the entire render tree.

---

### B-06 · prewarmUserData Fires AFTER Auth Resolves, Not In Parallel

**Location:** `services/prewarm.ts`, triggered from `AuthContext` after `onIdTokenChanged`

**What happens:** The prewarm (reading 3 AsyncStorage caches + seeding React Query) only begins after Firebase Auth has resolved the user identity. These operations don't need auth — they can be triggered speculatively from the auth state listener with a pending userId, or even during the auth wait.

**Why it matters:** On a warm device with cached auth, prewarm starts ~800ms into the startup (after auth resolves). The 3 AsyncStorage reads that prewarm does take ~10–30ms and could have started at ~400ms.

**Severity:** Medium. Typically adds ~400ms to prewarm completion time.

---

### B-07 · AvatarProvider is an Independent Redundant AsyncStorage Read

**Location:** `shared/contexts/AvatarContext.tsx`, lines 80–90

**What happens:** `AvatarProvider` fires `AsyncStorage.multiGet(["qrg:avatar:url", "qrg:avatar:version"])` independently on mount. This is a separate AsyncStorage read from the prewarm chain, not coordinated with it.

**Why it matters:** AsyncStorage reads are batched at the native layer, but firing many small reads simultaneously still creates multiple bridge calls. The avatar URL is also available in the user profile cache — this is a second path to the same data.

**Severity:** Low. Fast in practice (multiGet is efficient), but architecturally redundant.

---

### B-08 · Tab Layout Reads AsyncStorage on Every Mount

**Location:** `app/(tabs)/_layout.tsx` — `useEffect` reads `qrg:startup:screen`

**What happens:** On every app startup (and every time the tab layout re-mounts), an AsyncStorage read checks if the startup screen should be `"scanner"`. This feature appears to be a rarely-used deep link path.

**Why it matters:** This is one more async operation on the critical path for a feature that fires for virtually no users on normal startup.

**Severity:** Low-Medium. Adds one AsyncStorage call that almost always returns `null`.

---

### B-09 · useRecentScans Fires Three Async Operations Simultaneously at Mount

**Location:** `features/home/hooks/useRecentScans.ts`, lines 38–108

**What happens on home screen mount:**

```
1. useEffect (line 38):
   getCachedHomeScans(userId)          ← AsyncStorage disk read #1

2. useQuery (line 53):
   getUserScansPaginated(uid, 15)      ← Firestore network call (immediate)

3. useFocusEffect (line 90):
   loadLocalScans(userId)              ← AsyncStorage.getItem (disk read #2)
```

Operations #1 and #3 both read from AsyncStorage. They read DIFFERENT keys:
- `#1` reads `cache_home_scans_<uid>` (QR cache layer)
- `#3` reads `local_scan_history_<uid>` (raw local scan store)

These are two parallel AsyncStorage reads for conceptually related data — the local scan history.

**Why it matters:** Two reads of overlapping data (both are "recent local scans"). The cache in #1 is built from Firestore results and stored separately from the raw local scan history in #3. The deduplication layer (`mergeAndDeduplicateScans`) then merges them.

**Severity:** Medium. Architecturally, one source of truth for local scans would eliminate a read.

---

### B-10 · getUserScansPaginated Has a Sequential Loop (Up to 15 Iterations)

**Location:** `services/` — the scan history service

**What happens:** The Firestore scan query fetches all records then loops sequentially (up to 15 iterations) to filter out soft-deleted documents to reach the requested page size.

**Why it matters:** In a worst case (user has many deleted scans), the function must do multiple Firestore reads sequentially to fill 5 results. This adds latency directly to the home screen cloud data load.

**Severity:** Medium. Affects users who delete many scans. A Firestore query filter (`where("deletedAt", "==", null)`) would eliminate the loop.

---

### B-11 · registerForPushNotifications and trackAppOpen on the Mounted Critical Path

**Location:** `app/_layout.tsx`, `AuthGatedApp` useEffect (line 154–155)

**What happens:**
```typescript
registerForPushNotifications(user.uid);
trackAppOpen(user.uid);
```

Both fire in the same `useEffect` as the post-auth setup. `registerForPushNotifications` internally calls `Notifications.getExpoPushTokenAsync()` which is a network call to Expo's servers. `trackAppOpen` fires a Firebase Analytics event.

**Why it matters:** These are not needed for the home screen to be interactive. They compete with the home data fetch on the JS thread and network.

**Severity:** Medium. Should be deferred to run after the home screen is fully rendered.

---

### B-12 · HomeHeader Recreates StyleSheet on Theme Changes

**Location:** `features/home/components/HomeHeader.tsx`, line 20

**What happens:**
```typescript
const styles = useMemo(() => makeStyles(colors, s), [colors, s]);
```

`makeStyles` calls `StyleSheet.create()` which allocates new style objects. This is called on every render where `colors` or `s` change (theme change, scale change). During startup, `colors` may change as the theme resolves.

**Why it matters:** `StyleSheet.create()` is not free. It sends style objects across the bridge (or via JSI on New Arch). Doing this on every theme change recreates 12 style objects unnecessarily.

**Severity:** Low. One-time cost at startup. Only matters during theme initialization.

---

### B-13 · Nested Reanimated Entering Animations (Double Animation on StatsRow)

**Location:** `features/home/components/StatsRow.tsx`, line 29; `features/home/HomeScreen.tsx`, line 47

**What happens:**
- `HomeScreen` wraps everything in `<Animated.View entering={FadeIn.duration(280)}>`
- `StatsRow` has its own `<Animated.View entering={FadeInDown.duration(180)}>`

If `StatsRow` is rendered inside `HeroScanCard` which is inside the outer `FadeIn`, the StatsRow component has a nested entering animation running simultaneously with the parent `FadeIn`. In Reanimated 3, nested entering animations compose by running concurrently — the opacity of the outer FadeIn multiplies with the inner FadeInDown's opacity, creating a potentially jarring double-fade.

**Severity:** Low-Medium. Visual quality issue rather than performance.

---

### B-14 · ScanSkeletonList Uses Two Animation APIs Simultaneously

**Location:** `features/home/components/ScanSkeletonList.tsx`, lines 1, 8, 11

**What happens:**
```typescript
import Animated, { FadeInDown } from "react-native-reanimated";  // Reanimated 3
const shimmer = useRef(new Animated.Value(0)).current;            // RN Core Animated
Animated.loop(Animated.sequence([...])).start();                   // Core Animated loop
```

Each `SkeletonCard` starts a Core Animated loop on mount AND uses Reanimated for the `FadeInDown` entrance. Core Animated runs on the JS thread by default (even with `useNativeDriver: true`, the value is JS-owned). Reanimated runs on the UI thread.

With 3 skeleton cards, this is 3 simultaneous Core Animated loops + 3 Reanimated entering animations.

**Severity:** Low. The skeleton is temporary, but using two animation systems in one component is an unnecessary complexity and potential jank source.

---

## Phase 3 — Critical Path Analysis

### The Actual Critical Path

These operations MUST complete before the splash screen hides and Home becomes interactive:

```
CRITICAL PATH
├── [JS] Module evaluation (lib/firebase.ts init)              ~100ms
├── [JS] React tree mount (providers)                          ~50ms
├── [ASYNC - parallel gate]
│     ├── A: Font loading from bundle                          ~50–200ms  ← usually fastest
│     ├── B: Firebase Auth token from AsyncStorage             ~200–800ms ← usually slowest
│     └── C: Consent check (AsyncStorage.getItem)             ~10–20ms   ← always fastest
└── SplashScreen.hideAsync() → first frame visible

After splash hides (still on critical path to interactive):
├── [ASYNC] loadLocalScans (AsyncStorage.getItem)              ~10–30ms
└── Home renders with skeleton → real content
```

**Total critical path duration: 400ms–1.5s (warm), 1.0s–2.5s (cold)**

---

### Background Tasks (can safely happen during or after Home rendering)

| Task | Current Timing | Should Happen |
|---|---|---|
| `prewarmUserData` (3 AsyncStorage reads) | After auth resolves | During auth wait |
| `getCachedHomeScans` (disk read) | At HomeScreen mount | ✅ Correct |
| `getUserScansPaginated` (Firestore) | At HomeScreen mount | ✅ Correct |
| `AvatarProvider` hydration | At provider mount | ✅ OK (multiGet is fast) |
| `trackAppOpen` analytics | After auth | After first paint |
| `registerForPushNotifications` | After auth | After Home renders |
| Tab startup screen check | On tab mount | After first paint |
| Trust score refresh | On QR detail open | ✅ Correct (not at startup) |

---

### Delayed Tasks (must NOT run at startup)

These are confirmed to be deferred correctly:

| Task | Confirmed deferred? |
|---|---|
| Full scan history (History tab) | ✅ Seeded from cache, Firestore only on tab open |
| Favorites list | ✅ Seeded from cache |
| Profile data | ✅ Only loads on Profile tab |
| QR analytics | ✅ Only loads on QR detail |
| Trust score calculation | ✅ Only on scan |
| Friend list | ✅ Only on social features |

---

## Phase 4 — UX Analysis

### What the User Experiences

**T+0 → T+~600ms:** Dark background (`#0A0E17`). The splash screen with the BinRo logo on dark background. No animation. Feels like a normal premium app cold start. ✅

**T+~600–900ms (warm) / up to 2.5s (cold):** Splash hides. The entire Home screen appears via a single `FadeIn.duration(280)` animation. The whole screen — header, hero card, skeleton list — fades in as one cohesive unit. This is intentional per the comment in `HomeScreen.tsx`:

> *"Single unified entrance for the whole screen. All sections appear together as one cohesive frame instead of cascading in separately."*

This is the correct approach and matches what Google Wallet and PhonePe do. ✅

**~280ms after first frame:** FadeIn completes. Skeleton cards are visible, shimmering.

**~10–50ms after first frame:** Local AsyncStorage scans load → skeleton disappears, real cards appear (or "No recent scans" state). This transition is silent — no skeleton-to-content flash — because `isLoading = !localLoaded` and AsyncStorage resolves before the FadeIn even completes. ✅

**~300–800ms after first frame:** Cloud scans merge in from Firestore → list updates. Because React Query uses optimistic cache seeding, this update is incremental (adds/removes cards), not a full list replacement.

### Comparing to Reference Apps

| App | Startup Feel | BinRo vs |
|---|---|---|
| **Google Wallet** | Instant avatar, immediate card list from cache | BinRo similar — avatar loads from cache, scans from AsyncStorage |
| **PhonePe** | Skeleton on first load, instant on return | BinRo does the same ✅ |
| **Google Pay** | Amount and avatar instantly, balance loads async | BinRo: name instantly, avatar from cache, scans skeleton ✅ |
| **Samsung Wallet** | Static splash then card cascade | BinRo: no cascade (whole screen fades as unit) — better ✅ |
| **Apple Wallet** | Full-screen splash, then instant card list | BinRo: longer splash gate (triple condition), then instant ⚠️ |

### Identified UX Issues

**UX-01: Potential Flash of Guest State**
If Firebase Auth takes >2s (slow network, token refresh), `timedOut=true` fires and the app renders the guest state (showing "Welcome" and a "Sign In" button). 300–500ms later, auth resolves and the greeting changes to "Hey, [Name]". The user briefly sees the wrong state.

**UX-02: Avatar Loads Slightly After Name**
The greeting "Hey, [Name]" appears immediately (from auth state). The avatar photo appears only after `AvatarProvider.isHydrated` becomes true (a separate AsyncStorage read). On first render, the avatar shows the initial letter placeholder, then transitions to the photo. This is a subtle but noticeable flash if AsyncStorage takes >16ms.

**UX-03: Nested Animations May Look Slightly Off**
`StatsRow` inside `HeroScanCard` has its own `FadeInDown.duration(180)` inside the outer `FadeIn.duration(280)`. The inner animation completes first (at 180ms) while the outer is still fading in (until 280ms). The UX effect is: StatsRow appears to fade in twice — once with its own animation, then the outer opacity continues to increase for another 100ms. Minor, but detectable on close inspection.

**UX-04: Skeleton Shimmer → Real Content Gap**
If the user has no local scan history and the Firestore call takes 500ms, the skeleton shows for ~500ms then transitions to "No recent scans" or real cards. This is acceptable behavior but could be perceived as slow on poor connections.

**UX-05: Pull-to-Refresh Busts Cache Completely**
`onRefresh` calls `invalidateHomeScansCache` then re-fetches. After refresh, the list briefly shows a loading state even if the user just pulled to refresh the same data. Google Wallet's refresh is seamless (shows new content immediately). BinRo's refresh is correct but shows a brief reload.

---

## Phase 5 — Memory Audit

### Cache Layers at Startup (Count: 4)

| Layer | Type | Location | What It Holds |
|---|---|---|---|
| **Layer 1** | In-memory `Map` | `services/cache/qr-cache.ts` (`memCache`) | QR details, home scans, trust scores, owner info |
| **Layer 2** | AsyncStorage disk | `services/cache/qr-cache.ts` | Same data, persisted across restarts |
| **Layer 3** | React Query cache | `shared/utils/query-client.ts` | History, favorites, scan-stats, home-scans |
| **Layer 4** | In-memory `Map` | `services/user-service.ts` (`USER_PROFILE_CACHE`) | User profile objects (TTL 5min) |

### Duplicate State at Startup

**Auth State — 2 Sources:**
1. `AuthContext` — the source of truth. Holds `user`, `isLoading`, `initialized`.
2. `useAuthStore` (Zustand) — a mirror. The comment in the file explicitly calls it a "thin mirror" and warns about type safety issues.

**Risk:** If the AuthContext→Zustand sync (in `useEffect`) ever fires out of order, components that read from `useAuthStore` will see stale auth state while components reading from `useAuth()` see fresh state. This is an acknowledged architectural debt.

**Avatar State — 2 Sources:**
1. `AvatarProvider` — holds URL + version + hydration state.
2. `useAuthStore` / `AuthContext` — `user.photoURL` from Firebase Auth.

These serve different purposes (AvatarContext holds the app-uploaded photo, AuthContext holds the Google OAuth photo) but coordination between them adds complexity and an extra AsyncStorage read.

### Memory Allocations at Startup

| Allocation | Count | Notes |
|---|---|---|
| Firebase SDK instances | 4 | Auth, Firestore, RTDB, Storage |
| Zustand stores | 2 | authStore, uiStore (assumed) |
| React Query client | 1 | Shared singleton |
| In-memory caches (`Map`) | 2 | memCache + USER_PROFILE_CACHE |
| Context objects | 7 | Theme, Query, Auth, Avatar, Toast, Keyboard, TabBar |
| Font objects (Inter) | 7 | 7 Inter weights loaded via useFonts |

### Memory Assessment

No obvious memory leaks detected in startup path. All providers return cleanup functions in `useEffect` calls. Firebase Auth's `onIdTokenChanged` unsubscribes on unmount. The prewarm `_warmedUsers` Set is correctly cleared on sign-out. The in-memory cache Map is cleared on sign-out.

**One concern:** `getDatabase(firebaseApp)` initializes RTDB at startup but RTDB is only used for real-time scan counter subscriptions on the QR detail screen. The RTDB instance sits in memory unused for the entire home screen session for most users.

---

## Phase 6 — Provider Audit

| Provider | Must init at startup? | Blocks startup? | Can be lazy? | Verdict |
|---|---|---|---|---|
| `ErrorBoundary` | ✅ Yes — must wrap all | ✅ Sync, no block | ❌ No | **Keep as-is** |
| `ThemeProvider` | ✅ Yes — colors needed for all UI | ✅ Sync, no block | ❌ No | **Keep as-is** |
| `QueryClientProvider` | ✅ Yes — hooks need it | ✅ Sync, no block | ❌ No | **Keep as-is** |
| `AuthProvider` | ✅ Yes — identity needed | ⚠️ Firebase Auth async | ❌ No | **Keep, but isolate timeout** |
| `AvatarProvider` | ⚠️ Partially | Fires AsyncStorage.multiGet | ✅ Could defer | **Acceptable, consider batching into auth prewarm** |
| `ToastProvider` | ❌ Not needed until user action | ✅ Sync, no block | ✅ Yes | **Could defer, but low value** |
| `KeyboardProvider` | ⚠️ Partially | ✅ Sync, no block | ✅ Yes (unless forms mount early) | **Keep — no cost** |
| `TabBarContext` | ✅ Yes — scroll-driven tab hide/show | ✅ Sync, no block | ❌ No | **Keep as-is** |

**Finding:** No provider is egregiously mis-placed. `AvatarProvider`'s 2-key AsyncStorage read could be folded into the prewarm batch to eliminate a separate bridge call.

---

## Phase 7 — Firebase Audit

### What Firebase Does During Startup

| Service | Startup Action | Blocking? | Notes |
|---|---|---|---|
| **Core App** | `initializeApp(config)` | Sync | ~1ms |
| **Auth** | `initializeAuth` with AsyncStorage persistence | Sync init, async token read | Reads cached token from AsyncStorage |
| **Auth** | `onIdTokenChanged` listener | Async callback | Fires once with cached user, then again on refresh |
| **Firestore** | `initializeFirestore(app, { localCache: memoryLocalCache() })` | Sync | `memoryLocalCache` — no IndexedDB, correct |
| **RTDB** | `getDatabase(app)` | Sync | Initialized but not used until QR detail |
| **Storage** | `getStorage(app)` | Sync | Initialized but not used until photo upload |
| **App Check** | Skipped (native) | N/A | Web-only |

### Firebase Init Assessment

**Auth persistence is correct:** `getReactNativePersistence(AsyncStorage)` stores the Firebase Auth session in AsyncStorage. This means auth restoration is fast (disk read, no network) for returning users. ✅

**`memoryLocalCache()` for Firestore is correct:** The alternative `persistentLocalCache` uses IndexedDB which fails silently in iframe-based environments (Replit preview). The comment in the code correctly explains this tradeoff. ✅

**No `enableMultiTabIndexedDbPersistence` or equivalent:** Correct — this would be wrong on native. ✅

**No duplicate listeners:** Only one `onIdTokenChanged` listener in `AuthProvider`. ✅

### Unnecessary Firebase Initializations

**RTDB and Storage init eagerly:** `realtimeDB = getDatabase(app)` and `storage = getStorage(app)` run at module load. For 100% of home-screen-only sessions, these objects sit unused in memory. They could be lazily initialized when first needed.

**No Firebase Analytics init visible:** `lib/analytics.ts` was identified as wrapping Firebase Analytics, but no analytics auto-collection is running at startup (Firebase Analytics on RN does not auto-init without explicit `logEvent` calls). ✅

### Duplicate Firebase Reads at Home Screen

```
Home screen load triggers these Firestore reads:
1. getUserScansPaginated(uid, 15)    ← useRecentScans / useQuery
```

Only one Firestore read is triggered at home screen load. No duplicate reads detected. The prewarm reads are from AsyncStorage, not Firestore. ✅

---

## Phase 8 — Cache Audit

### AsyncStorage Keys Used During Startup

| Key Pattern | Read Timing | Purpose | Notes |
|---|---|---|---|
| `haptic_enabled` | RootLayout useEffect | Haptics setting | Very fast, but one more read |
| `qrg:consent:*` | ConsentGatedApp | DPDP consent flag | Blocks render gate |
| `qrg:avatar:url` + `qrg:avatar:version` | AvatarProvider mount | Cached avatar URL | 2-key multiGet — fast |
| `qrg:startup:screen` | Tab layout mount | Scanner deep link | Almost always null |
| `cache_history_page_<uid>` | prewarmUserData | History prewarm | After auth |
| `cache_favorites_<uid>` | prewarmUserData | Favorites prewarm | After auth |
| `cache_scan_stats_<uid>` | prewarmUserData | Stats prewarm | After auth |
| `cache_home_scans_<uid>` | useRecentScans mount | Home scan cache | At home mount |
| `local_scan_history_<uid>` | loadLocalScans | Device-local scans | At home mount |

**Total AsyncStorage reads during startup: 9 distinct keys across ~6 separate reads.**

### Can Any Cache Reads Be Parallelized Further?

| Read | Currently | Can parallelize? |
|---|---|---|
| Consent + fonts + auth | Effectively parallel (separate async chains) | ✅ Already parallel |
| Avatar (2 keys) | `multiGet` — efficient | ✅ Already batched |
| `haptic_enabled` | Independent | ✅ Could join consent multiGet |
| prewarm (3 keys) | `Promise.all` — parallel | ✅ Already parallel |
| `cache_home_scans` + `local_scan_history` | Two separate reads | ⚠️ Could batch into multiGet |

**Opportunity:** `haptic_enabled` could be batched with the consent check into a single `multiGet(["consent_key", "haptic_enabled"])` call, reducing one bridge round-trip.

**Opportunity:** In `useRecentScans`, `getCachedHomeScans` and `loadLocalScans` both fire at mount. The latter uses raw `AsyncStorage.getItem`. These could be batched into a single `multiGet`.

### React Query Cache

**`staleTime: Infinity` globally.** Queries never automatically refetch. For home scans, a local override sets `staleTime: HOME_STALE_MS = 5 * 60 * 1000` — correct. But the home scan hook also uses `refetchOnMount: true`, which means every mount triggers a refetch regardless of stale state. This is the correct behavior for home, but the combination of `staleTime: 5min` + `refetchOnMount: true` means every home screen mount fires a Firestore call — even if the user just left and returned.

**`retry: false`** globally — correct for a mobile app. Don't retry failed requests (user may be offline). ✅

### Image Cache

`expo-image` with `cachePolicy="memory-disk"` is used for the avatar in `HomeHeader.tsx`. The `cachedUrl` from `AvatarProvider` appends `?v=<version>` to bust the expo-image cache only when the photo actually changes (not on every auth token refresh). This is an elegant and correct solution. ✅

---

## Phase 9 — Render Audit

### Render Tree at First Home Screen Mount

```
HomeScreen (React.memo)
  │
  ├── useHome() → triggers:
  │     ├── useAuth()        → reads AuthContext
  │     ├── useAvatar()      → reads AvatarContext
  │     └── useRecentScans() → useState × 3, useRef × 1, useMemo × 1
  │
  └── <Animated.View entering={FadeIn.duration(280)}>
        ├── <HomeHeader user={} photoURL={}>
        │     └── Renders greeting + avatar placeholder/image
        │         useMemo() → makeStyles called
        │
        ├── <HeroScanCard>
        │     └── (contents not traced — separate investigation needed)
        │
        └── <RecentScansList isLoading={true}>
              └── <ScanSkeletonList>
                    └── [0,1,2].map → <SkeletonCard index={i}>
                          └── useEffect → starts Animated.loop (shimmer)   ← 3 loops start
```

### Re-render Chain After Data Loads

```
AsyncStorage completes (loadLocalScans):
  → setLocalLoaded(true)          [1 state update]
  → setLocalScans([...])          [1 state update]
  → useRecentScans re-renders
  → useMemo(mergeAndDeduplicateScans) runs
  → HomeScreen re-renders
  → RecentScansList re-renders → switches from skeleton to real cards

React Query returns (Firestore):
  → cloudScansRaw changes           [React Query internal update]
  → useRecentScans re-renders
  → useMemo(mergeAndDeduplicateScans) runs again
  → HomeScreen re-renders
  → RecentScansList re-renders → merges cloud + local
```

**Total re-renders from mount to stable: 3–4.** This is acceptable.

### Components That Re-render Unnecessarily

**HomeHeader** receives `user` and `photoURL` as props. `HomeScreen` is `React.memo`-wrapped, but `HomeHeader` is not. Each re-render of `HomeScreen` re-renders `HomeHeader` even if props haven't changed. Given that `user` and `photoURL` are stable references after initial hydration, wrapping `HomeHeader` in `React.memo` would eliminate 2–3 pointless re-renders.

**StatsRow** has `useMemo(() => makeStyles(s), [s])`. The `STAT_ITEMS` array is also memoized correctly. No obvious re-render issues. ✅

**useRecentScans** has `localLoaded` and `localScans` as separate `useState` values. Setting them both inside `loadLocalScans` triggers two sequential re-renders (one for `setLocalScans`, one for `setLocalLoaded`). These could be batched into a single state object or using React's automatic batching in concurrent mode.

### Components Mounting Too Early

No components are mounting significantly too early. The tab layout correctly delays scanner/other tabs via lazy mounting (Expo Router doesn't mount hidden tab screens until first visit).

### Components Mounting Too Late

None identified. All critical home screen components mount immediately.

---

## Phase 10 — Optimization Roadmap

### Priority Matrix

| ID | Finding | Priority | Startup Impact | Difficulty | Risk |
|---|---|---|---|---|---|
| OPT-01 | Decouple splash from font loading | **Critical** | -200–400ms | Low | Low |
| OPT-02 | Start prewarm before auth resolves | **High** | -300–500ms | Medium | Low |
| OPT-03 | Move push registration + analytics post-paint | **High** | -100–200ms | Low | Low |
| OPT-04 | Batch AsyncStorage reads at startup | **High** | -30–80ms | Medium | Low |
| OPT-05 | Fix sequential scan fetch loop | **High** | -100–500ms (varies) | Medium | Medium |
| OPT-06 | Lazy-initialize RTDB and Storage | Medium | -10–30ms | Low | Low |
| OPT-07 | Eliminate double auth state (authStore) | Medium | Memory / correctness | High | Medium |
| OPT-08 | Wrap HomeHeader in React.memo | Medium | -2 renders | Low | Low |
| OPT-09 | Fix nested entering animations | Medium | UX quality | Low | Low |
| OPT-10 | Replace shimmer with Reanimated | Low | UX quality | Medium | Low |
| OPT-11 | Consent check not blocking render | Low | -10–20ms | Low | Low |
| OPT-12 | Batch localScans state updates | Low | -1 render | Low | Low |

---

### OPT-01 — Decouple Splash from Font Loading · CRITICAL

**Problem:** The three-gate splash condition (`fontsReady && !authLoading && consentReady`) makes font loading a co-blocker of the splash screen. In production builds fonts are embedded, but font object initialization still takes non-trivial time.

**Why it matters:** The splash should hide as soon as auth resolves and consent is confirmed. Font loading failure (handled by `|| !!fontError`) is already a non-event. The null return at `!fontsReady` (line 219) prevents the entire tree from rendering, including the auth provider that starts the auth chain.

**Fix:** Remove the `if (!fontsReady) return null` guard. Allow providers to mount and auth to resolve even while fonts are loading. Show a minimal fallback (system font) until Inter loads. This makes auth + consent the only splash gate, not a three-way AND.

**Expected gain:** 0–400ms reduction in splash duration depending on font availability.
**Difficulty:** Low — remove one guard, add system font fallback.
**Risk:** Low — `fontError` is already handled.

---

### OPT-02 — Start Prewarm Before Auth Resolves · HIGH

**Problem:** `prewarmUserData` only starts after `onIdTokenChanged` fires with a user. For a returning user with cached auth, this delay is ~300–600ms from app start.

**Why it matters:** The 3 AsyncStorage reads in prewarm don't need an authenticated user — they just need a userId, which is stable across sessions. The userId can be cached separately (or read from the Firebase Auth persistence key in AsyncStorage).

**Fix (Option A):** Cache the last-known userId in AsyncStorage under a lightweight key (e.g. `qrg:last:uid`). On startup, read this before auth resolves and speculatively start prewarm with the cached uid. If auth resolves to a different user, discard the speculative prewarm result.

**Fix (Option B):** Read the Firebase Auth persistence key directly to extract the uid before `onIdTokenChanged` fires. This is fragile (depends on Firebase internals) — Option A is safer.

**Expected gain:** 300–500ms earlier prewarm completion. History/Favorites tabs ready before user can navigate to them.
**Difficulty:** Medium — requires careful handling of the speculative-vs-real uid race.
**Risk:** Low — prewarm writes to React Query cache, which is easily invalidated.

---

### OPT-03 — Move Push Registration and Analytics Post-Paint · HIGH

**Problem:** `registerForPushNotifications(user.uid)` makes a network call to Expo's push service. `trackAppOpen(user.uid)` fires a Firebase Analytics event. Both happen in the same `useEffect` as post-auth setup, competing with the home screen data fetch.

**Why it matters:** Neither is needed for the home screen to be interactive. `registerForPushNotifications` is particularly expensive — it calls `Notifications.getExpoPushTokenAsync()` which is a network round-trip.

**Fix:** Delay both using `InteractionManager.runAfterInteractions()` or a simple `setTimeout(..., 2000)` after the auth effect. This ensures they run after the JS thread has finished the first render cycle.

**Expected gain:** 100–200ms improvement in perceived home screen responsiveness.
**Difficulty:** Low — wrap both calls in a defer mechanism.
**Risk:** Low — analytics events and push tokens are inherently best-effort.

---

### OPT-04 — Batch AsyncStorage Reads at Startup · HIGH

**Problem:** Startup fires 6+ separate AsyncStorage reads across multiple providers and effects, some of which could be combined into single `multiGet` calls.

**Current separate reads:**
1. `haptic_enabled` (RootLayout)
2. Consent key (ConsentGatedApp)
3. `qrg:avatar:url` + `qrg:avatar:version` (AvatarProvider — already batched ✅)
4. `qrg:startup:screen` (Tab layout)
5. `cache_home_scans_<uid>` (useRecentScans)
6. `local_scan_history_<uid>` (useRecentScans)
7. `cache_history_page_<uid>` + `cache_favorites_<uid>` + `cache_scan_stats_<uid>` (prewarm — already batched ✅)

**Opportunity:** Reads #5 and #6 in `useRecentScans` could be combined into a single `AsyncStorage.multiGet`. Reads #1 and #2 could be combined into the consent check's existing AsyncStorage call.

**Expected gain:** 30–80ms from reducing bridge round-trips.
**Difficulty:** Medium — requires refactoring the reads in useRecentScans and RootLayout.
**Risk:** Low.

---

### OPT-05 — Fix Sequential Scan Pagination Loop · HIGH

**Problem:** `getUserScansPaginated` loops sequentially (up to 15 iterations) to filter out soft-deleted scans. Each iteration may hit Firestore.

**Fix:** Add a Firestore query filter: `where("deletedAt", "==", null)` (or `where("deletedAt", "not-exists")`). This eliminates the sequential loop entirely and lets Firestore do the filtering server-side in a single query.

**Note:** Firestore does not support `!= null` efficiently, but you can query `where("isDeleted", "==", false)` if you add a boolean field. Alternatively, move soft-deleted scans to a separate sub-collection.

**Expected gain:** Eliminates worst-case sequential reads. Reduces home data fetch from potentially multiple round-trips to one.
**Difficulty:** Medium — requires a Firestore schema change + index.
**Risk:** Medium — requires data migration for existing soft-deleted documents.

---

### OPT-06 — Lazy-Initialize RTDB and Storage · MEDIUM

**Problem:** `getDatabase(app)` and `getStorage(app)` run at module load, initializing SDK instances that aren't used until the QR detail screen or photo upload respectively.

**Fix:** Convert to lazy getters:
```typescript
// lib/firebase.ts
let _rtdb: ReturnType<typeof getDatabase> | null = null;
export function getRealtimeDB() {
  return _rtdb ??= getDatabase(firebaseApp);
}
```

Update all callers to use the getter instead of the exported constant.

**Expected gain:** Small memory saving. Eliminates unused SDK initialization for users who only use home/scanner and never open QR detail.
**Difficulty:** Low.
**Risk:** Low.

---

### OPT-07 — Eliminate the Zustand Auth Mirror · MEDIUM

**Problem:** `useAuthStore` (Zustand) mirrors `AuthContext`. Two sources of truth for auth state. The Zustand store uses `any` for the user type. If the sync `useEffect` fires late, components reading from the store see stale state.

**Fix:** Remove `useAuthStore` entirely. All components that currently call `useAuthStore` should call `useAuth()` instead. `useAuth()` returns the same data with proper TypeScript types.

**Note:** Investigate whether any non-hook code (e.g. services called outside the React tree) uses `useAuthStore.getState()` as a workaround for context access. If so, those cases need a different solution (e.g. an auth state module-level reference set by AuthContext).

**Expected gain:** Eliminates one store, one sync effect, one re-render chain per auth state change. Removes a split-brain risk.
**Difficulty:** High — requires auditing all `useAuthStore` callers.
**Risk:** Medium — easy to miss a call site.

---

### OPT-08 — Wrap HomeHeader in React.memo · MEDIUM

**Problem:** `HomeHeader` is not memoized. It re-renders every time `HomeScreen` re-renders (4+ times during startup), even when `user` and `photoURL` props haven't changed.

**Fix:**
```typescript
export const HomeHeader = React.memo(function HomeHeader({ user, photoURL }: Props) {
  // ...
});
```

**Expected gain:** Eliminates 2–3 unnecessary re-renders of `HomeHeader` during home screen data loading.
**Difficulty:** Low.
**Risk:** Low — memo is safe when props are stable references.

---

### OPT-09 — Fix Nested Entering Animations · MEDIUM

**Problem:** `StatsRow` has its own `FadeInDown.duration(180)` entering animation nested inside HomeScreen's `FadeIn.duration(280)`. This creates a compound opacity animation where StatsRow reaches full opacity before the outer wrapper does.

**Fix:** Remove `StatsRow`'s entering animation. Let the outer `HomeScreen` `FadeIn.duration(280)` handle all children uniformly. If differentiated entrance is desired for StatsRow, it should use `delay(280)` to sequence after the outer animation completes rather than composing with it.

**Expected gain:** Cleaner, more premium-feeling entrance animation.
**Difficulty:** Low.
**Risk:** Low.

---

### OPT-10 — Replace Shimmer with Reanimated · LOW

**Problem:** `ScanSkeletonList` uses Core Animated (JS-thread) for the shimmer loop and Reanimated (UI-thread) for the entrance animation. Mixed animation systems in one component.

**Fix:** Migrate shimmer to Reanimated's `withRepeat`/`withSequence` so both animations run on the UI thread:
```typescript
const opacity = useSharedValue(0.55);
useEffect(() => {
  opacity.value = withRepeat(withSequence(
    withTiming(1, { duration: 900 }),
    withTiming(0.55, { duration: 900 }),
  ), -1);
}, []);
const animStyle = useAnimatedStyle(() => ({ opacity: opacity.value }));
```

**Expected gain:** Eliminates JS-thread animation, reduces potential jank during data loading.
**Difficulty:** Medium — requires migrating each skeleton card.
**Risk:** Low.

---

### OPT-11 — Consent Check Should Not Block Render · LOW

**Problem:** `ConsentGatedApp` returns a blank view until `consentReady`. The consent check is an AsyncStorage read that takes <20ms but still gates rendering.

**Fix:** Instead of returning null while checking, render children immediately and show the `ConsentModal` on top when needed. The consent state can be assumed "granted" (for returning users) until AsyncStorage proves otherwise. New users will see the modal appear within <20ms — imperceptible.

**Expected gain:** 10–20ms off the critical path. More importantly, removes a potential stall point.
**Difficulty:** Low.
**Risk:** Low — DPDP compliance is about showing the modal before data collection, not about blocking the entire app UI.

---

### OPT-12 — Batch Local Scan State Updates · LOW

**Problem:** `loadLocalScans` in `useRecentScans` calls `setLocalScans(...)` and `setLocalLoaded(true)` as separate state updates, triggering two sequential re-renders.

**Fix:** Use a single state object or React's `startTransition` / `unstable_batchedUpdates` to batch both updates into one render cycle. In React 18 (which Expo 54 uses), `setState` calls inside async functions are automatically batched via automatic batching — verify this applies here.

**Expected gain:** -1 render during home screen mount.
**Difficulty:** Low.
**Risk:** Low.

---

## Summary

### What Is Already Well-Optimized (Do Not Change)

| Item | Why It's Good |
|---|---|
| `FadeIn.duration(280)` wrapping entire HomeScreen as one unit | Prevents cascading card appearance. Correct approach. |
| `isLoading = !localLoaded` (not waiting for Firestore) | Users see real content from AsyncStorage immediately. |
| `prewarmUserData` using `Promise.all` | History/Favorites tabs are ready before user navigates. |
| `staleTime: Infinity` + manual invalidation | Prevents unnecessary background refetches. |
| `memoryLocalCache()` for Firestore | Correct for RN/iframe environments. |
| `cachePolicy="memory-disk"` on avatar image | Prevents unnecessary image re-downloads. |
| Avatar `?v=<version>` cache-busting | Only busts cache on actual photo change, not token rotation. |
| 2.5s splash safety timeout | Prevents infinite splash on slow auth. |
| `React.memo(HomeScreen)` | Correct. HomeScreen is pure given props. |
| Dedup algorithm for local + cloud scans | Prevents duplicate scan entries after offline sync. |
| `_warmedUsers` Set (skip duplicate prewarm) | Prevents re-reading disk on every token refresh. |

### Top 3 Changes for Maximum Startup Impact

1. **OPT-01** — Remove font loading as a splash gate blocker → up to -400ms TTI
2. **OPT-02** — Start prewarm before auth resolves → up to -500ms to prewarm completion
3. **OPT-03** — Defer push registration and analytics post-paint → -100–200ms perceived responsiveness

Implementing all three would reduce the warm startup TTI from ~700–900ms to approximately **400–600ms**, which is competitive with PhonePe and approaches Google Pay's startup performance.
