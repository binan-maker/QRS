# BinRo consumer product and Supabase plan

This document is the implementation contract for the BinRo consumer website,
consumer mobile app, and Supabase backend. It is intentionally based on the
current repository: Expo Router for mobile, Next.js for the website, Express
for protected server operations, and Supabase for Auth, Postgres, Storage, and
Realtime.

## 1. Product promise

BinRo lets a consumer inspect a QR code before opening or paying through it.
The product must:

1. Decode QR content from the camera or photo library.
2. Classify the content (URL, UPI, Wi-Fi, contact, text, and supported
   payment/financial formats).
3. Show a calm, explainable safety result before the user opens a destination.
4. Let the community report unsafe content and leave useful comments.
5. Keep scan history, favorites, account settings, and privacy controls
   synchronized across web and mobile.
6. Never expose a Supabase service-role key to a browser or mobile bundle.

## 2. Consumer website page structure

Current website routes are in `apps/web/app`. The target public and
authenticated structure is:

```text
/
├── Home / scanner entry
├── scanner/
│   └── Browser QR scanner and image upload
├── qr/[code]/
│   └── Public QR result, destination preview, trust score, reports, comments
├── profile/
│   └── Signed-in consumer profile and recent activity
├── auth/
│   ├── login/
│   ├── register/
│   └── forgot-password/
├── download/
│   └── iOS/Android app download and deep-link handoff
├── how-it-works/
├── trust-scores/
├── privacy/
└── terms/
```

### Website page responsibilities

| Route | Anonymous | Signed in | Supabase data |
|---|---|---|---|
| `/` | Start scan, learn the promise | Recent scans shortcut | `qr_scans` after sign-in |
| `/scanner` | Scan and view a result | Save scan to history | Auth session, `qr_scans` |
| `/qr/[code]` | View public QR details and trust score | Report, comment, favorite | `qr_codes`/`unified_qrs`, `qr_reports`, `qr_comments`, `user_favorites` |
| `/profile` | App download/sign-in prompt | Edit profile, history, favorites | `users`, `qr_scans`, `user_favorites` |
| `/auth/*` | Email/password auth and recovery | Redirect to requested page | Supabase Auth |
| `/download` | Platform download links | Same | No private data |
| Legal routes | Read-only policy content | Same | No private data |

Every page needs a loading state, an empty state, an auth-required state where
appropriate, and an actionable error state. QR details must remain usable when
community data is empty or temporarily unavailable.

## 3. Consumer mobile app page structure

The existing Expo Router tree is the base. The complete consumer journey is:

```text
app/
├── (auth)/
│   ├── login
│   ├── register
│   ├── verify-email
│   └── forgot-password
├── (tabs)/
│   ├── index             # Home and recent scans
│   ├── scanner           # Camera/gallery scanner
│   ├── history           # Search, filter, pagination, offline state
│   ├── profile           # Own profile and account entry points
│   └── settings         # Privacy, notifications, feedback, legal
├── (qr)/
│   └── qr-detail/[id]    # Full verdict, destination, reports, comments
├── (account)/
│   ├── account-management
│   ├── favorites
│   ├── privacy-settings
│   └── search
├── profile/[username]    # Public user profile
├── qr/[code]             # Universal-link entry point
└── (legal)/
    ├── how-it-works
    ├── trust-scores
    ├── privacy-policy
    └── terms
```

### Mobile navigation rules

- Anonymous users may scan and view a verdict.
- Saving history, reporting, commenting, favoriting, and profile editing
  require a Supabase session.
- A universal link `/qr/[code]` resolves to the QR detail screen. If the app
  is not installed, the website route shows the same public result and offers
  the app download sheet.
- Sign-out clears user-scoped Zustand/query state and returns to the public
  home.
- Account deletion is a confirmed soft-delete followed by Supabase Auth user
  deletion through the protected API.

## 4. Supabase architecture

### Auth

Use Supabase Auth as the only identity provider:

- Email/password signup.
- Email confirmation.
- Password reset and recovery redirect.
- Google OAuth for web and mobile where provider credentials are configured.
- Persisted access/refresh sessions on web and mobile.
- Server verification through `supabase.auth.getUser(accessToken)`.
- The `public.users` profile is created by the `on_auth_user_created` trigger.

The Auth user ID is the application user ID. Do not create a second Firebase
identity layer or issue application JWTs.

### Database domains

The live project already exposes the core tables. The intended ownership is:

| Domain | Tables | Purpose |
|---|---|---|
| Identity | `users`, `usernames` | Public profile, username uniqueness, counters |
| QR registry | `qr_codes`, `unified_qrs`, `standard_links` | Legacy and new QR records |
| Scan events | `qr_scans` | Anonymous and authenticated scan history |
| Community | `qr_comments`, `comment_likes`, `comment_reports`, `qr_reports` | Feedback, moderation, trust scoring |
| Consumer state | `user_favorites`, `user_generated_qrs`, `user_friends` | Saved and generated content |
| Messaging | `notifications`, `rtdb_store` | Notifications and compatibility state |
| Operations | `audit_logs`, `categories`, `feature_votes` | Moderation, content configuration, feedback |

`unified_qrs` is the write target for new generated/dynamic QRs. Existing
`qr_codes` and `standard_links` remain readable for compatibility. Tables that
support both models use exactly one of the nullable QR foreign keys.

### Storage buckets

Create these Supabase Storage buckets before production:

```text
avatars       public read, authenticated owner write/update/delete
qr-assets     public read for published assets, owner write/update/delete
feedback      private, authenticated upload, server/moderator read
```

Store only object paths and metadata in Postgres. Do not store image bytes or
base64 payloads in a database column.

### Realtime

Enable Postgres changes for:

- `qr_comments` for the active QR detail view.
- `qr_reports` only if moderation/admin tooling needs live updates.
- `qr_codes` and `unified_qrs` for public scan/comment counters.
- `notifications` for the signed-in user's notification badge.

Every subscription must have an unsubscribe path, a reconnect/refetch path,
and a polling fallback for mobile background/resume behavior.

## 5. End-to-end Supabase flows

### Signup and profile bootstrap

```text
register form
  -> supabase.auth.signUp({ email, password, options.data })
  -> auth.users insert
  -> handle_new_auth_user() trigger
  -> public.users + public.usernames rows
  -> email confirmation
  -> session restore
  -> profile query
```

The trigger is idempotent. Username generation must handle collisions and
never trust a client-supplied owner ID.

### Sign-in and protected requests

```text
web/mobile auth client
  -> Supabase session
  -> Authorization: Bearer <access token>
  -> Express authenticate middleware
  -> supabase.auth.getUser(token)
  -> route derives uid from verified user
  -> database write/read
```

The service role is allowed only in the API process for admin-only operations.
Client writes that are safe to expose may use PostgREST with RLS; security
critical actions (report weighting, counters, account deletion, moderation)
must go through the API or a restricted Postgres function.

### Scan and verdict

```text
camera/gallery/web upload
  -> decode QR payload
  -> validate and classify content
  -> calculate local safety hints
  -> fetch QR record/community summary
  -> show safe / flagged / unknown verdict
  -> record qr_scans (authenticated or anonymous)
  -> update denormalized counters atomically
```

Never open a URL before the verdict screen. Anonymous scan records must not
contain an identity; authenticated history rows use the verified session user.

### Report and trust score

```text
report action
  -> authenticated API request
  -> validate report type and QR existence
  -> derive account age/email verification
  -> calculate server-authoritative weight
  -> upsert or toggle qr_reports
  -> write audit_logs
  -> refresh trust score
```

The client may display the score but never supplies `weight`,
`account_age_days`, or `email_verified`. Duplicate reports are prevented by
the QR/user unique constraint.

### Comments

```text
comment form
  -> session check
  -> resolve legacy/unified QR foreign key
  -> insert qr_comments under RLS/API validation
  -> increment comment counters atomically
  -> notification for QR owner when applicable
  -> realtime refresh for all viewers
```

Comment edits are owner-only, deletes are soft deletes, and all displayed text
is treated as untrusted content.

### Favorites and history

- `user_favorites` is unique by `(user_id, qr_id)` and is toggled through an
  idempotent API operation.
- `qr_scans` history is filtered by the verified user ID, ordered by
  `scanned_at desc`, and paginated.
- Sign-out invalidates all user-scoped caches and local stores.
- History failures show a retry action and do not erase cached records.

### Account deletion

```text
confirm deletion
  -> mark public.users.is_deleted and deleted_at
  -> remove/ redact private user content according to policy
  -> delete Storage objects owned by the user
  -> supabase.auth.admin.deleteUser(uid) in API only
  -> clear client session and local data
```

Use a retention policy for audit/security records; do not silently delete
records needed to preserve fraud-detection history.

## 6. RLS and security rules

Required rules:

1. Public reads expose only active QR fields, public profile fields, published
   comments, and aggregate trust data.
2. A user can select/update/delete only their own profile-owned records.
3. A user can insert a scan for themselves or an anonymous scan without a
   user ID; clients cannot set another user's ID.
4. A user can create/update/delete only their own comments, favorites, and
   generated QRs.
5. Reports are unique per user and QR; weight fields are server-controlled.
6. `audit_logs`, moderation data, service-role operations, and private feedback
   are not client-readable.
7. Storage object paths are namespaced by user ID and checked in bucket
   policies.
8. Use `SECURITY DEFINER` functions only with fixed allowlists and an explicit
   `search_path`, as done by `increment_field`.

Before publishing, verify RLS with both an anonymous client and a normal
authenticated client. A successful REST request is not enough; verify that it
cannot read or mutate another user's records.

## 7. Runtime configuration

Shared/public values:

```text
EXPO_PUBLIC_SUPABASE_URL
EXPO_PUBLIC_SUPABASE_ANON_KEY
NEXT_PUBLIC_SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY
```

Server-only secrets:

```text
SUPABASE_URL
SUPABASE_SERVICE_ROLE_KEY
DATABASE_URL
SESSION_SECRET
```

The web and mobile public pairs may use the same Supabase URL and anon key.
The server pair must never be prefixed with `EXPO_PUBLIC_` or `NEXT_PUBLIC_`
and must never be bundled into client code.

## 8. Supabase dashboard checklist

1. Confirm the production project and API URL.
2. Enable Email provider and configure confirmation/reset email URLs.
3. Enable Google provider only after web and mobile OAuth redirect URLs are
   registered.
4. Apply the base database schema and `supabase/new-project.sql`.
5. Apply the repository's RLS/grants files and inspect every policy.
6. Create the `avatars`, `qr-assets`, and `feedback` buckets with policies.
7. Enable Realtime for the listed tables.
8. Configure Auth redirect URLs for the Replit web domain, production domain,
   and the mobile deep-link scheme.
9. Configure email sender/SMTP for production deliverability.
10. Run the anonymous/authenticated RLS test matrix.

## 9. Publish checklist

### Replit

```text
npm run web:typecheck
npm run server:build
npm run web:build
```

Publish the Next.js web process on port 5000. Run the API separately on port
5001 in development; production deployment should expose the API through the
same origin or an explicitly configured API domain.

### Smoke tests

- Home page renders.
- Scanner route loads.
- Public QR route handles an unknown code without crashing.
- Register, confirm, sign in, sign out, and password reset work.
- A signed-in scan appears in history after reload.
- A report is created once and toggles safely.
- A comment appears after insert and after a second-session refresh.
- A favorite survives reload.
- Account deletion clears the session.
- Service-role credentials are absent from client bundles.
- Health endpoint returns success.

## 10. Current repository status and remaining blockers

Completed in this import setup:

- Dependencies installed.
- Backend starts on port 5001.
- Next.js website starts on port 5000.
- Supabase connection attached to the Replit environment.
- Live Supabase read confirmed the core tables are reachable.
- Web typecheck and backend bundle build pass.

Still required before the product can be called fully Supabase-backed in this
runtime:

1. Add the six Supabase runtime variables through Replit Secrets.
2. Apply/verify the production SQL schema, triggers, grants, and RLS policies
   against the intended Supabase project.
3. Replace any remaining legacy Firestore-shaped worker/storage paths with
   direct Supabase queries or explicit Postgres RPCs.
4. Configure OAuth, email delivery, Storage buckets, Realtime, and production
   redirect URLs.
5. Run authenticated browser and mobile smoke tests with a real test account.

Do not mark the release as production-ready until those five items pass.