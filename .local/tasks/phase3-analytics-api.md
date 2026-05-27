# Phase 3 — Analytics & API Platform

## What & Why
The app has a `my-qr-analytics` folder and screens but the analytics pipeline is shallow — scan counts exist in Firestore but there is no event system, no time-series data, no geographic or device breakdown, and no creator-facing dashboard with actionable insights. On the server side, there is no versioned API and no public-facing analysis endpoint for potential SaaS usage. This phase builds the analytics event pipeline, improves the creator dashboard with real charts and trends, and formalises the server API under a `/api/v1/` namespace with proper OpenAPI-style route documentation.

## Done looks like
- Every QR scan emits a structured analytics event `{ qrId, timestamp, country, platform, contentType, verdict }` written to Firestore `qrEvents` subcollection (no PII)
- Creator dashboard (`app/my-qr-analytics/`) shows: total scans (all time + 7d + 30d), scan trend sparkline, top scan hours, platform breakdown (Android/iOS), and safety verdict breakdown (safe/flagged %)
- Server routes reorganised under `/api/v1/` prefix — all existing routes (`/safe-browsing`, `/qr-active`, `/donation`, `/validate-email`, `/decode-qr`, `/analyze`) moved under versioned namespace
- New `GET /api/v1/qr/:uuid/analytics` endpoint returns aggregated analytics for a QR (owner-authenticated)
- New `POST /api/v1/analyze` endpoint (from Phase 2) is included in versioned namespace
- Old unversioned routes kept as pass-through redirects to versioned equivalents for backward compat
- `server/routes.ts` is split into domain modules: `server/routes/analytics.ts`, `server/routes/qr.ts`, `server/routes/security.ts`

## Out of scope
- Paid analytics tiers / paywalling (future)
- Real-time WebSocket scan feeds
- Third-party analytics integrations (Mixpanel, Amplitude)
- Geographic map visualisations (data collected, charts not yet built)

## Steps
1. **Analytics event schema** — Define a `ScanEvent` type and a `recordScanEvent(event)` function in `services/scan-history-service.ts` that writes to `qrCodes/{qrId}/events` subcollection with server timestamp. Call it from the scan processor after a successful decode.
2. **Aggregation service** — Add `getQrAnalyticsSummary(qrId, ownerId)` to `services/qr-detail-service.ts` that reads the events subcollection and returns total scans, 7d trend, 30d trend, platform counts, and verdict breakdown, with a 10-minute Firestore cache.
3. **Creator dashboard UI** — Rewrite the `app/my-qr-analytics/` screens to consume `getQrAnalyticsSummary`. Show scan counts, a 7-day bar chart using `react-native-svg` (already installed), platform breakdown, and verdict breakdown with colour-coded bars.
4. **Server API versioning** — Create `server/routes/index.ts` that mounts all domain routers under `/api/v1/`. Move inline route handlers from `server/routes.ts` into `server/routes/security.ts` (safe-browsing, validate-email, decode-qr, analyze), `server/routes/qr.ts` (qr-active, analytics), and `server/routes/payments.ts` (donation). Keep old paths as 301 redirects.
5. **Analytics API route** — Add `GET /api/v1/qr/:uuid/analytics` in `server/routes/qr.ts`. Verify the requester owns the QR via Firebase token, call the aggregation service, and return the summary JSON.
6. **Wire event recording in scanner** — After `useScanProcessor` decodes a QR and runs analysis, call `recordScanEvent` with the QR id, platform, content type, and trust verdict. Fire-and-forget (do not block scan result display).

## Relevant files
- `app/my-qr-analytics/`
- `services/scan-history-service.ts`
- `services/qr-detail-service.ts`
- `features/scanner/hooks/useScanProcessor.ts`
- `server/routes.ts`
- `server/routes/`
- `server/index.ts`
- `server/middleware/rate-limiter.ts`
- `shared/types/`
