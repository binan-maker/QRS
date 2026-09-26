# 🧠 Business Logic & Verification Services (`/services`)

Core domain services encompassing QR code payload analysis, payment protocol parsing, fraud detection, trust scoring algorithms, and offline synchronization.

---

## Service Modules

| Module | Scope |
| :--- | :--- |
| **`analysis/`** | Multi-protocol payment parsers (UPI, EMVCo, SEPA, Crypto), scam signal heuristics, and URL safety inspection. |
| **`trust/`** | Community trust scoring engine factoring in account age, email verification, report weight, and historical scans. |
| **`qr/`** | QR lifecycle services: creation, resolution, metadata enrichment, and statistics. |
| **`qr-display/`** | Visual formatting logic translating raw QR payloads into structured display cards. |
| **`scan-history/`** | Dual-tier scan logging (SQLite locally, Supabase in cloud) with deduplication. |
| **`user/`** | Profile management, username availability checks, and privacy control services. |
| **`comments/`** | Threaded community reviews and upvote aggregations. |
| **`offline/`** | Network-aware offline queueing with automatic background synchronization. |
| **`index.ts`** | Master barrel exposing all services cleanly under `@/services`. |
