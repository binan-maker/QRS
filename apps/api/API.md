# BinRo — REST API Reference

**Base URL (dev):** `http://localhost:5000/api/v1`  
**Base URL (prod):** `https://<your-domain>/api/v1`

---

## Authentication

All protected endpoints require a Firebase ID token in the `Authorization` header:

```
Authorization: Bearer <Firebase_ID_Token>
```

Tokens are issued by Firebase Authentication and verified server-side via Firebase Admin SDK. Firebase Auth is **not** replaced — it remains the identity layer. The backend only validates the token, never issues its own.

**Error responses for auth failures:**

| HTTP | code | Meaning |
|---|---|---|
| 401 | `AUTH_REQUIRED` | No Bearer token provided |
| 401 | `TOKEN_INVALID` | Token expired, revoked, or malformed |
| 401 | `AUTH_FAILED` | General verification failure |
| 503 | `SERVICE_UNAVAILABLE` | Firebase Admin SDK not configured |

---

## Rate Limits

Endpoints are grouped into tiers. Limits apply per-UID (authenticated) or per-IP (public).

| Tier | Limit | Applies to |
|---|---|---|
| `strict` | 10 req / 60 s | Report submission, destructive writes |
| `standard` | 30 req / 60 s | General authenticated mutations |
| `relaxed` | 60 req / 60 s | Read-heavy authenticated endpoints |
| `public` | 20 req / 60 s | Unauthenticated endpoints |

**Rate-limit response:**
```json
{ "error": "Too many requests — please slow down", "code": "RATE_LIMITED", "status": 429, "retryAfterMs": 60000 }
```

---

## Response Format

**Success:**
```json
{ "data": { ... } }
```

**Success with pagination:**
```json
{
  "data": [ ... ],
  "pagination": { "hasMore": true, "nextCursor": "<id>", "limit": 20 }
}
```

**Error:**
```json
{ "error": "Human-readable message", "code": "MACHINE_READABLE_CODE", "status": 400 }
```

**Validation error:**
```json
{
  "error": "Validation failed",
  "code": "VALIDATION_ERROR",
  "status": 400,
  "issues": [ { "field": "text", "message": "String must contain at least 1 character(s)" } ]
}
```

All JSON responses on `/api/*` carry an ECDSA P-256 signature in the `x-content-signature` header for tamper detection.

---

## Pagination

Endpoints that return lists support cursor-based pagination:

| Query param | Default | Description |
|---|---|---|
| `limit` | `20` | Items per page (max 100) |
| `cursor` | — | Opaque cursor from previous response's `nextCursor` |

---

## Users

### `GET /api/v1/users/me`
Own full profile. **Auth required.**

**Response:**
```json
{
  "data": {
    "id": "uid123",
    "displayName": "Ravi Kumar",
    "email": "ravi@example.com",
    "photoUrl": "https://...",
    "username": "ravikumar",
    "scanCount": 42,
    "commentCount": 7,
    "followingCount": 3,
    "totalLikesReceived": 15,
    "friendsCount": 5,
    "isOnline": true,
    "lastSeen": "2026-07-17T10:00:00Z",
    "createdAt": "2025-01-01T00:00:00Z"
  }
}
```

---

### `PATCH /api/v1/users/me`
Update own profile. **Auth required.**

**Body:**
```json
{
  "displayName": "Ravi Kumar",
  "photoUrl": "https://...",
  "pushToken": "ExponentPushToken[...]",
  "username": "ravikumar"
}
```

All fields optional. `username` must be lowercase letters, digits, or underscores (3–30 chars) and globally unique.

---

### `GET /api/v1/users/:userId`
Public profile of any user. No auth required.

Returns only public fields: `id`, `displayName`, `photoUrl`, `username`, `scanCount`, `commentCount`, `followingCount`, `createdAt`.

---

### `GET /api/v1/users/me/scans`
Own scan history. **Auth required.** Paginated.

**Query:** `?limit=20&cursor=<id>`

**Response item:**
```json
{
  "id": "scan123",
  "qrCodeId": "qr456",
  "content": "upi://pay?pa=merchant@upi",
  "contentType": "upi",
  "scanSource": "camera",
  "isAnonymous": false,
  "scannedAt": "2026-07-17T09:00:00Z"
}
```

---

### `GET /api/v1/users/me/favorites`
Favorited QRs. **Auth required.** Paginated.

### `POST /api/v1/users/me/favorites/:qrId`
Add a QR to favorites. **Auth required.**

### `DELETE /api/v1/users/me/favorites/:qrId`
Remove from favorites. **Auth required.**

---

### `GET /api/v1/users/me/notifications`
List notifications. **Auth required.** Paginated.

**Response item:**
```json
{
  "id": "notif123",
  "type": "new_comment",
  "message": "Someone commented on your QR",
  "qrCodeId": "qr456",
  "fromUsername": "priya_s",
  "isRead": false,
  "createdAt": "2026-07-17T08:00:00Z"
}
```

### `PATCH /api/v1/users/me/notifications/:id/read`
Mark one notification as read. **Auth required.**

### `POST /api/v1/users/me/notifications/read-all`
Mark all unread notifications as read (up to 100 in one call). **Auth required.**

### `DELETE /api/v1/users/me/notifications/:id`
Delete a notification. **Auth required.**

---

## Legacy QR Codes

### `PATCH /api/v1/qr/:qrId/active`
Toggle a legacy QR code active/paused. **Auth required.** Owner only.

**Body:**
```json
{ "isActive": false, "deactivationMessage": "This QR is temporarily unavailable" }
```

---

### `POST /api/v1/qr/:qrId/report`
Submit or toggle a crowd-sourced fraud report. **Auth required.** Rate: `strict`.

**Body:**
```json
{ "reportType": "scam" }
```

`reportType` options: `safe`, `scam`, `spam`, `fake`, `phishing`, `other`

**Response:**
```json
{ "data": { "success": true, "action": "added" } }
```

`action` is `"added"` or `"removed"` (toggle behaviour).

---

### `POST /api/v1/qr/:qrId/comment-count`
Increment or decrement the legacy QR's comment counter via Admin SDK (bypasses Firestore security rules). **Auth required.**

**Body:** `{ "delta": 1 }` or `{ "delta": -1 }`

---

### `GET /api/v1/qr/:uuid/analytics`
Aggregated scan analytics for a legacy QR. **Auth required.** Owner only.

**Response:**
```json
{
  "data": {
    "totalScans": 1234,
    "scans7d": 88,
    "scans30d": 312,
    "trend7d": [12, 10, 14, 8, 11, 9, 24],
    "platformBreakdown": { "android": 700, "ios": 450, "web": 60, "unknown": 24 },
    "verdictBreakdown": { "safe": 1200, "flagged": 20, "unknown": 14 },
    "topHours": [0, 0, 2, 4, 12, 30, 55, 90, 100, 80, 70, 60, 55, 50, 45, 40, 60, 80, 90, 70, 50, 30, 10, 5],
    "cachedAt": 1752753000000
  }
}
```

---

### `POST /api/v1/qr/validate-vpa`
Validate a UPI VPA (Virtual Payment Address). No auth required. Returns `valid: null` when external validation is unavailable — callers must still allow the payment in that case.

**Body:** `{ "vpa": "merchant@upi" }`

**Response:**
```json
{ "valid": true, "customerName": "Merchant Name", "vpa": "merchant@upi" }
```

`valid: null` means the validation service is unavailable — callers **must** still allow the payment.

---

## Unified QRs (New Model)

All QRs created after the new model was introduced live here. Legacy QRs remain in the `/api/v1/qr` group.

### `GET /api/v1/unified-qr`
List own QRs. **Auth required.** Paginated.

**Query:** `?limit=20&cursor=<id>`

---

### `POST /api/v1/unified-qr`
Create a new QR. **Auth required.**

**Body:**
```json
{
  "destination": "https://example.com",
  "rawDestination": "https://example.com",
  "contentType": "url",
  "isDynamic": true,
  "qrType": "individual",
  "title": "My Shop QR",
  "businessName": "Acme Corp",
  "template": "business-card",
  "scanLimit": 1000,
  "expiryDate": "2027-01-01T00:00:00Z",
  "expiryPreset": "1y",
  "design": {
    "fgColor": "#1A1A2E",
    "bgColor": "#FFFFFF",
    "logoPosition": "center",
    "logoUri": "https://...",
    "label": "Scan me"
  },
  "formValues": { "value": "https://example.com", "extra": { "phone": "9876543210" } }
}
```

**Required fields:** `destination`  
**qrType values:** `individual`, `business`, `government`  
**expiryPreset values:** `24h`, `7d`, `30d`, `90d`, `1y`

---

### `GET /api/v1/unified-qr/:id`
Get a single QR. Auth optional (private QRs require owner auth).

---

### `PATCH /api/v1/unified-qr/:id`
Update title, design, or limits. **Auth required.** Owner only.

**Body (all optional):**
```json
{
  "title": "New title",
  "scanLimit": 500,
  "expiryDate": "2027-06-01T00:00:00Z",
  "expiryPreset": "90d",
  "design": { "fgColor": "#000000", "label": "Updated" }
}
```

---

### `PATCH /api/v1/unified-qr/:id/destination`
Update redirect URL (dynamic QRs only). **Auth required.** Owner only.

**Body:** `{ "destination": "https://new-url.com" }`

Returns `400 NOT_DYNAMIC` if the QR is static.

---

### `PATCH /api/v1/unified-qr/:id/status`
Activate or deactivate. **Auth required.** Owner only.

**Body:**
```json
{ "status": "inactive", "deactivationMessage": "This offer has ended" }
```

Returns `403 FORBIDDEN` for government QRs.

---

### `DELETE /api/v1/unified-qr/:id`
Permanently delete. **Auth required.** Owner only. Rate: `strict`.

---

### `GET /api/v1/unified-qr/:id/analytics`
Scan analytics. **Auth required.** Owner only. Same response shape as legacy QR analytics.

---

## Comments

### `GET /api/v1/qr/:qrId/comments`
Paginated comment list. Auth optional.

**Query:** `?limit=20&cursor=<id>`

Pinned comments appear first. Hidden/deleted comments are excluded.

**Response item:**
```json
{
  "id": "c123",
  "userId": "uid456",
  "userName": "Priya S",
  "text": "This QR is legitimate!",
  "parentId": null,
  "likes": 4,
  "isVerifiedOwner": false,
  "isPinned": false,
  "isEdited": false,
  "createdAt": "2026-07-15T12:00:00Z",
  "updatedAt": "2026-07-15T12:00:00Z"
}
```

---

### `POST /api/v1/qr/:qrId/comments`
Create a comment. **Auth required.** Also bumps `commentCount` on the QR.

**Body:**
```json
{ "text": "Verified — this is my shop QR.", "parentId": null }
```

`parentId` is the ID of a parent comment for reply threads. Omit or set `null` for top-level.

---

### `PATCH /api/v1/qr/:qrId/comments/:commentId`
Edit own comment. **Auth required.** Comment owner only.

**Body:** `{ "text": "Updated text" }`

Sets `isEdited: true`.

---

### `DELETE /api/v1/qr/:qrId/comments/:commentId`
Soft-delete a comment (anonymises text, hides from list). **Auth required.** Comment owner OR QR owner.

Also decrements `commentCount` on the QR.

---

### `POST /api/v1/qr/:qrId/comments/:commentId/like`
Toggle like on a comment. **Auth required.**

**Response:** `{ "data": { "liked": true } }`

---

## Follows

### `POST /api/v1/follows/qr/:qrId`
Follow a QR. **Auth required.**

### `DELETE /api/v1/follows/qr/:qrId`
Unfollow a QR. **Auth required.**

### `GET /api/v1/follows/qr/:qrId`
Check if the authenticated user follows a QR. **Auth required.**

**Response:** `{ "data": { "following": true, "qrId": "abc" } }`

---

### `POST /api/v1/follows/users/:userId`
Follow a creator. **Auth required.** Returns `400 SELF_FOLLOW` if userId === own uid.

### `DELETE /api/v1/follows/users/:userId`
Unfollow a creator. **Auth required.**

### `GET /api/v1/follows/users/:userId`
Check if the authenticated user follows a creator. **Auth required.**

---

## Friends

### `GET /api/v1/friends`
List friends or pending requests. **Auth required.**

**Query:** `?status=friends` (default) | `?status=pending` | `?status=all`

**Response item:**
```json
{ "userId": "uid789", "status": "friends", "addedAt": "2026-05-01T00:00:00Z" }
```

---

### `POST /api/v1/friends/request/:userId`
Send a friend request. **Auth required.**

Returns `409 ALREADY_FRIENDS` or `409 REQUEST_PENDING` if applicable.

---

### `PATCH /api/v1/friends/request/:userId/accept`
Accept an incoming friend request. **Auth required.**

Increments `friendsCount` for both users.

---

### `PATCH /api/v1/friends/request/:userId/decline`
Decline an incoming friend request. **Auth required.**

Removes the pending entries from both sides.

---

### `DELETE /api/v1/friends/:userId`
Unfriend. **Auth required.** Rate: `strict`.

Decrements `friendsCount` for both users.

---

## Business

### `POST /api/v1/business/register`
Register a business account. **Auth required.**

---

## Security & Utilities

### `POST /api/v1/check-url`
Proxy Google Safe Browsing API. Public.

**Body:** `{ "url": "https://suspicious-site.com" }`

---

### `GET /api/v1/analyze`
Local heuristic QR/URL analysis. Public.

---

### `GET /api/v1/ifsc/:ifsc`
IFSC bank code lookup. Public.

**Example:** `GET /api/v1/ifsc/SBIN0000300`

---

### `POST /api/v1/push/notify`
Send an Expo push notification. Internal (no rate limit enforcement — call only from trusted server code).

**Body:**
```json
{ "toUserId": "uid123", "title": "New Comment", "body": "Someone commented on your QR" }
```

---

## Error Code Reference

| Code | HTTP | Description |
|---|---|---|
| `AUTH_REQUIRED` | 401 | Missing Authorization header |
| `TOKEN_INVALID` | 401 | Expired, revoked, or malformed token |
| `AUTH_FAILED` | 401 | General Firebase Auth failure |
| `FORBIDDEN` | 403 | Authenticated but not allowed |
| `USER_NOT_FOUND` | 404 | User does not exist |
| `QR_NOT_FOUND` | 404 | QR code does not exist |
| `COMMENT_NOT_FOUND` | 404 | Comment does not exist |
| `REQUEST_NOT_FOUND` | 404 | Friend request not found |
| `NOT_DYNAMIC` | 400 | Attempted destination change on a static QR |
| `SELF_FOLLOW` | 400 | Attempted to follow yourself |
| `SELF_FRIEND` | 400 | Attempted to friend yourself |
| `ALREADY_FRIENDS` | 409 | Already friends |
| `REQUEST_PENDING` | 409 | Friend request already sent |
| `USERNAME_TAKEN` | 409 | Username already claimed |
| `VALIDATION_ERROR` | 400 | Zod schema validation failed |
| `RATE_LIMITED` | 429 | Rate limit exceeded |
| `SERVICE_UNAVAILABLE` | 503 | Firebase Admin or DB not configured |
| `INTERNAL_ERROR` | 500 | Unexpected server error |

---

## Architecture Notes

### Firebase Authentication (retained)
Firebase Auth remains the sole identity provider. The server verifies `Authorization: Bearer <ID_TOKEN>` on every protected endpoint using `firebase-admin.auth().verifyIdToken()`. No custom JWT issuance.

### Shared auth middleware
`apps/api/src/middleware/auth.ts` exports `authenticate` (required) and `optionalAuth` (attach if present). Eliminates the previous pattern of copy-pasted `verifyIdToken` in every route handler.

### Layered rate limiting
`apps/api/src/middleware/rate-limit-presets.ts` exports named presets (`strictLimit`, `standardLimit`, `relaxedLimit`, `publicLimit`). Per-UID keys for authenticated endpoints, per-IP for public. Redis (Upstash) when configured; in-memory fallback otherwise.

### Zod validation
All request bodies are validated with `validateBody(schema)` middleware before handlers run, returning structured `VALIDATION_ERROR` responses.

### Response signing
The existing ECDSA P-256 response signing middleware in `apps/api/src/security/sign-middleware.ts` wraps every `/api/*` JSON response with an `x-content-signature` header — unchanged.

### PostgreSQL migration path
Every Firestore read/write is annotated with a `// TODO:` comment showing the equivalent SQL query. When the PostgreSQL database is ready and data is migrated, replace the Firestore call with a Drizzle query against the schema in `packages/db/src/schema.ts`.

### Future scaling considerations
- **Horizontal scaling:** Redis rate-limiter is already wired. Switch `DATABASE_URL` to a connection-pooled PostgreSQL (e.g. PgBouncer) and the backend scales stateless.
- **Caching:** `apps/api/src/lib/route-cache.ts` exists for response caching. Analytics endpoints are the primary candidates.
- **Queue-based writes:** High-volume counters (scan counts, like counts) should move to a write queue (BullMQ + Redis) to avoid Firestore write contention.
- **CDN:** QR redirect routes (`/q/:id`, `/guard/:uuid`) can be cached at the edge once PostgreSQL is the authoritative store.
