# DEPRECATED — Legacy server directory

This directory (`server/`) is an older copy of the backend that is **no longer used**.

The canonical backend lives at **`apps/api/src/`** and is started by `npm run server:dev`.

Key differences from this directory:
- `apps/api/src/` uses TypeScript path aliases (`@shared/*`, `@services/*`) configured in `apps/api/tsconfig.json`
- This directory used relative import paths

**Do not add new code here.** All server-side work goes into `apps/api/src/`.
