# 🏛️ Core Infrastructure & Services (`/lib`)

System-level infrastructure layer providing provider-agnostic adapters for authentication, persistence, storage, and telemetry.

---

## Architecture & Subsystems

- **`auth/`**: Pluggable authentication adapter managing session caching, token refreshes, and OAuth handshakes.
- **`db/`**: Resilience-hardened database adapter featuring circuit breakers and distributed counters.
- **`storage/`**: Binary object storage adapter managing user avatar uploads and offline caching.
- **`logger.ts`**: High-performance, scoped diagnostic logger with environment-aware log level gates.
- **`errors.ts`**: Strongly typed error class hierarchy (`AuthError`, `NotFoundError`, `ValidationError`).
- **`startup-prefs.ts`**: Synchronous pre-warming mechanism for essential cache keys during bundle evaluation.
- **`index.ts`**: Unified infrastructure barrel accessible via `@/lib`.
