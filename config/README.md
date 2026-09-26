# ⚙️ Application Configuration (`/config`)

Centralized configuration registry for runtime environment resolution, API endpoint routing, third-party credentials, and application-level limits.

---

## Architecture & Responsibilities

- **`env.ts`**: Validates required environment variables at runtime using Zod schemas (`EXPO_PUBLIC_*`).
- **`api.ts`**: Computes the backend endpoint URL based on environment (development, staging, production) and constructs standard HTTP headers with Bearer tokens and JSON payloads.
- **`app.ts`**: Houses app-wide immutables: application branding, fallbacks, network request timeout windows, and realtime database caps.
- **`supabase.ts`**: Provides the verified configuration object (`url`, `anonKey`) for Supabase service instances.
- **`index.ts`**: Barrel export exposing all configurations uniformly through the `@/config` alias.

---

## Usage

```typescript
import { APP_NAME, API_BASE_URL, apiUrl, SUPABASE_CONFIG } from "@/config";

const endpoint = apiUrl("/api/v1/qr/decode-image");
```
