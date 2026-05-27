# Phase 2 — AI Trust Engine

## What & Why
The current trust system is report-count based (`calculateTrustScore` in `services/trust-service.ts`) with heuristic URL and payment analysis. There is no composite multi-signal confidence score, no India-specific UPI fraud intelligence, no behavioral classification pipeline, and no unified verdict object that downstream UI and the server can both consume. Phase 2 builds the "QR Intelligence Engine v2": a unified pipeline that takes raw QR content and emits a structured, multi-dimensional trust verdict combining heuristic analysis, URL safety, community reports, signature verification, and payment fraud detection.

## Done looks like
- A new `TrustVerdict` type that carries: `riskScore` (0–100), `confidence` (0–1), `riskLevel` ("safe" | "low" | "medium" | "high" | "critical"), `signals` (array of labelled findings), `classification` (qr content type), and `recommendation` ("open" | "caution" | "block")
- A unified `analyzeQr(content, options)` function in `services/analysis/` that runs all signals in parallel and returns a `TrustVerdict`
- Enhanced India-specific UPI scam detection: fake VPA patterns, merchant name spoofing, abnormal amount parameters, phishing UPI deep links
- Enhanced URL analysis: typosquatting against 50+ popular Indian/global brands, redirect-chain depth, suspicious TLD list, data-URI and javascript-URI blocking
- Enhanced scam detection: pattern library expanded with current Indian SMS/QR scam templates
- `calculateTrustScore` updated to incorporate AI signal weight alongside community report weight
- Server `/api/v1/analyze` POST endpoint that accepts `{ content: string }` and returns a `TrustVerdict` (lays SaaS foundation)
- Scanner pipeline updated to call `analyzeQr()` and surface the new verdict fields in the safety modal

## Out of scope
- External ML model calls (all analysis stays on-device / server-side heuristic)
- Real-time phishing feed subscriptions (static pattern library only for now)
- Changes to Firestore data schema (trust score stored as before)
- Analytics dashboards (Phase 3)

## Steps
1. **Define TrustVerdict type** — Add the new `TrustVerdict` interface and `AnalysisSignal` type to `services/analysis/types.ts`. Deprecate/alias the old flat result shape for backward compat.
2. **Build unified analyzeQr pipeline** — Create `services/analysis/analyze-qr.ts` with a single `analyzeQr(content, options?)` async function. It runs URL analysis, payment analysis, scam detection, and qr-validator in parallel via `Promise.all`, then merges signals into a `TrustVerdict`.
3. **Expand India-specific UPI fraud detection** — In `services/analysis/payment-analyzer.ts`, add detection for fake VPA formats, merchant name impersonation (popular Indian apps/banks), abnormal `am=` parameters, and phishing UPI intent URLs. Weight these signals heavily.
4. **Expand URL scam pattern library** — In `services/analysis/scam-detector.ts` and `url-security-analyzer.ts`, add 30+ new patterns targeting current Indian online scam templates (fake government portals, KYC fraud, lottery, OTP phishing). Expand typosquatting brand list to cover top 50 Indian brands.
5. **Improve confidence scoring** — Update `calculateTrustScore` in `services/trust-service.ts` to accept an optional `analysisSignals` parameter. When present, weight the AI heuristic signals (30%) alongside community reports (70%), scaling the AI weight up when report count is low.
6. **Expose /api/v1/analyze endpoint** — Add a versioned route `POST /api/v1/analyze` to the Express server that accepts `{ content: string }`, runs `analyzeQr()` server-side, and returns the `TrustVerdict`. Include rate limiting.
7. **Wire scanner to new pipeline** — Update `features/scanner/hooks/useScanProcessor.ts` to call `analyzeQr()` and map the returned `TrustVerdict` to the existing safety modal props. Surface the new `signals` array as a "Why is this flagged?" detail list in the safety modal.

## Relevant files
- `services/analysis/types.ts`
- `services/analysis/url-security-analyzer.ts`
- `services/analysis/scam-detector.ts`
- `services/analysis/payment-analyzer.ts`
- `services/analysis/qr-validator.ts`
- `services/analysis/url-analyzer.ts`
- `services/trust-service.ts`
- `services/analysis/index.ts`
- `features/scanner/hooks/useScanProcessor.ts`
- `features/scanner/components/modals/SafetyModal.tsx`
- `server/routes.ts`
- `server/middleware/rate-limiter.ts`
