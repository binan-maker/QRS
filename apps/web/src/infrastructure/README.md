# apps/web/src/infrastructure — Web-specific adapters

Adapters that connect the web app to external services.
Currently these live in `src/lib/` — they will be reorganised here in Phase 4.

## Planned structure

```
src/infrastructure/
├── api/
│   └── client.ts         # BinroApiClient + createServerApiClient / createClientApiClient
├── auth/
│   ├── firebase.ts       # Firebase client SDK singleton
│   ├── firebase-admin.ts # Admin SDK (server-only) — verifySessionCookie, createSessionCookie
│   └── session.ts        # createSession / destroySession helpers
└── env/
    └── index.ts          # Zod-validated environment variables
```

Currently at `src/lib/`:
- `api-client.ts` → future: `infrastructure/api/client.ts`
- `firebase.ts`   → future: `infrastructure/auth/firebase.ts`
- `firebase-admin.ts` → future: `infrastructure/auth/firebase-admin.ts`
- `auth.ts`       → future: `infrastructure/auth/session.ts`
- `env.ts`        → future: `infrastructure/env/index.ts`
