# BinRo Backend API (`apps/api`)

Production-grade Node.js and Express RESTful API backend for the **BinRo** security and QR verification ecosystem. Built following Clean Architecture principles (Domain, Application, Infrastructure, and Interface layers).

---

## 🏗️ Architecture Overview

The backend is structured into clear layers with unidirectional dependencies pointing inward:

```
apps/api/
├── src/
│   ├── domain/               # Enterprise business rules, entities, and calculation algorithms
│   │   ├── scan/             # Scan verdict calculation and payload safety models
│   │   ├── trust/            # Mathematical trust scoring contracts & algorithms
│   │   └── user/             # User domain rules (handle validation, change cooldowns)
│   │
│   ├── application/          # Use-case orchestrators (pure domain coordination)
│   │   ├── trust/            # ComputeTrustScoreUseCase, SubmitReportUseCase
│   │   └── user/             # RegisterUserUseCase, UpdateProfileUseCase, DeleteAccountUseCase
│   │
│   ├── infrastructure/       # External drivers, data stores, and third-party integrations
│   │   ├── persistence/      # Supabase & PostgreSQL repository implementations
│   │   ├── auth/             # Supabase JWT token verification adapter
│   │   ├── cache/            # Distributed Redis & in-memory caching
│   │   ├── push/             # Expo Push Notification client
│   │   └── queue/            # Background job queues
│   │
│   ├── interface/            # Input/output boundary (HTTP controllers & DTOs)
│   │   └── dto/              # Request & response data transfer objects
│   │
│   ├── routes/               # Express routing controllers
│   │   ├── comments.ts       # Comment CRUD and upvoting endpoints
│   │   ├── feedback.ts       # Bug reports and app feedback submission
│   │   ├── ifsc.ts           # Indian financial bank branch lookup
│   │   ├── push.ts           # Push notification registration and broadcasting
│   │   ├── qr.ts             # QR code metadata, verification, and metrics
│   │   ├── security.ts       # Decryption, URL security evaluation, and safety verdicts
│   │   ├── users.ts          # Authenticated user profiles and scan history
│   │   └── index.ts          # Central v1 route registry
│   │
│   ├── middleware/           # Reusable Express request pipeline middleware
│   │   ├── auth.ts           # Bearer token validation and user identity attachment
│   │   ├── cors.ts           # Cross-origin policy enforcement
│   │   ├── error-handler.ts  # Structured JSON error responses with operational codes
│   │   ├── rate-limiter.ts   # IP-based sliding window rate limiting
│   │   ├── rate-limit-presets.ts # Specific limits for intensive endpoints
│   │   ├── request-logger.ts # High-throughput audit logger
│   │   └── validate.ts       # Zod schema validation
│   │
│   ├── health/               # Comprehensive health check probes
│   │   ├── checks.ts         # Database, Redis, and upstream dependency readiness
│   │   ├── metrics.ts        # Prometheus-compatible operational metrics
│   │   └── routes.ts         # /healthz and /ready endpoints
│   │
│   ├── security/             # HMAC response signing and cryptographic integrity
│   ├── services/             # Domain helper services (collusion detection, verification)
│   ├── scheduler.ts          # Periodic maintenance and notification dispatching
│   ├── image-decode.ts       # Server-side QR barcode image matrix decoder (Jimp + jsQR)
│   └── index.ts              # Server bootstrap and entry point
│
└── workers/                  # Background worker processes
    ├── analytics.worker.ts   # Asynchronous scan metrics rollups
    ├── maintenance.worker.ts # Cache pruning and soft-delete cleanups
    └── push.worker.ts        # Asynchronous batch push notification delivery
```

---

## 📡 API Endpoints Summary

### Authentication & Users
- `GET    /api/v1/users/me` — Retrieve the current authenticated user profile
- `PATCH  /api/v1/users/me` — Update display name, avatar URL, or handle
- `GET    /api/v1/users/:userId` — Retrieve public profile by ID
- `GET    /api/v1/users/me/scans` — Paginated user scan history

### QR Codes & Trust Scoring
- `GET    /api/v1/qr/:qrId` — Retrieve verified QR metadata and trust score
- `POST   /api/v1/qr/:qrId/comment-count` — Atomically update comment counter
- `POST   /api/qr/decode-image` — Extract and validate QR code payload from uploaded image

### Community & Comments
- `GET    /api/v1/qr/:qrId/comments` — Retrieve paginated comments for a QR code
- `POST   /api/v1/qr/:qrId/comments` — Post a new community comment
- `PATCH  /api/v1/qr/:qrId/comments/:commentId` — Update existing comment
- `DELETE /api/v1/qr/:qrId/comments/:commentId` — Soft-delete a comment
- `POST   /api/v1/qr/:qrId/comments/:commentId/like` — Toggle comment like

### Utilities & Health
- `GET    /status` — Quick liveness ping
- `GET    /healthz` — Detailed subsystem health metrics (database, latency, memory)
- `GET    /api/v1/ifsc/:ifsc` — Indian Financial System Code bank verification
- `POST   /api/validate-email` — Anti-spam disposable email detection

---

## 🔒 Security & Response Integrity

1. **HMAC Response Signing**: All sensitive API payloads can be verified against tampering using the `X-BinRo-Signature` header generated by `security/response-signer.ts`.
2. **Rate Limiting**: Multi-tiered rate limiters protect against credential stuffing, brute force scans, and DDoS.
3. **Payload Sanitization**: Server-side validation via Zod rejects payloads with malicious Unicode, excessive buffer sizes, or invalid schemas.

---

## 💻 Development & Deployment

```bash
# Run in development mode with hot reload
npm run dev --workspace=apps/api

# Build production bundle
npm run build --workspace=apps/api

# Execute typecheck
npm run typecheck --workspace=apps/api

# Start production server
npm run start --workspace=apps/api
```
