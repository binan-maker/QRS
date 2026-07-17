# apps/api — Node.js / Express Backend

> **Phase 1 note:** The Express server currently lives at `server/` in the **monorepo root**. Moving it here is scoped to Phase 3 of the migration roadmap (Clean Architecture restructure).

## Future home of

```
apps/api/
└── src/
    ├── domain/          # Pure business logic — zero framework deps
    │   ├── qr/
    │   ├── user/
    │   ├── trust/
    │   └── security/
    ├── application/     # Use cases (orchestrate domain, call ports)
    │   ├── qr/
    │   ├── user/
    │   └── trust/
    ├── infrastructure/  # DB, cache, queue, auth, push adapters
    │   ├── persistence/ # Drizzle repositories
    │   ├── cache/       # Redis adapter
    │   ├── queue/       # BullMQ jobs
    │   └── auth/        # Firebase Admin token verification
    └── interface/       # HTTP layer (Express routes, middleware, DTOs)
        ├── routes/
        ├── middleware/
        └── dto/
workers/
    ├── push.worker.ts   # Re-engagement push (replaces server/scheduler.ts)
    └── analytics.worker.ts
```

## Why not moved yet

The current `server/` imports directly from the root-level `shared/` and `services/` directories — those are mobile-app concerns that will be severed during the Phase 3 Clean Architecture restructure. Moving `server/` before those imports are replaced would just move a tangled dependency graph to a new path without cleaning it.

This is scoped to **Phase 3** of the migration roadmap (`MIGRATION_ROADMAP.md`).
