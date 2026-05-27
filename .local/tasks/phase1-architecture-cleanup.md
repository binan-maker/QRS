# Phase 1 — Architecture Stabilization

## What & Why
The codebase has significant duplication from organic growth: `lib/services/` (22 files) mirrors `services/`, `lib/analysis/` (15 files) mirrors `services/analysis/`, `lib/cache/` mirrors `services/cache/`, `lib/utils/` mirrors `shared/utils/`, top-level `components/` mirrors `shared/components/`, and top-level `constants/` mirrors `shared/constants/`. This creates maintenance risk, synchronization bugs, and bundle bloat. The `contexts/` directory (AuthContext, ThemeContext, AvatarContext) is imported via `@/contexts/` in ~238 files but lives outside the `shared/` layer. The server also directly imports from `lib/utils/` and `lib/analysis/` via relative paths. This phase eliminates all duplication, centralises the shared layer, and leaves a single canonical path for every module.

## Done looks like
- `lib/services/`, `lib/analysis/`, `lib/cache/`, `lib/utils/` directories are deleted
- Top-level `components/` and `constants/` directories are deleted
- `contexts/` is moved to `shared/contexts/` and all `@/contexts/` imports are updated to `@/shared/contexts/`
- All `@/components/` imports are updated to `@/shared/components/`
- All `@/constants/` imports are updated to `@/shared/constants/`
- `server/routes.ts` no longer imports from `../lib/utils/` or `../lib/analysis/` — uses `@/` aliases or direct service imports
- `lib/qr-analysis.ts` re-exports cleanly from `@/services/analysis/`
- Metro bundler starts without "cannot resolve" errors
- Backend starts without import errors

## Out of scope
- Adding new features or new analysis capabilities (Phase 2)
- Changing business logic inside any service
- State management library changes (Zustand/Redux)
- Any UI changes

## Steps
1. **Delete duplicated lib subdirectories** — Remove `lib/services/`, `lib/analysis/`, `lib/cache/`, and `lib/utils/` entirely. These are exact copies of `services/`, `services/analysis/`, `services/cache/`, and `shared/utils/` respectively; nothing imports them via `@/` aliases.
2. **Delete duplicated top-level directories** — Remove `components/` and `constants/` at the project root. They are byte-for-byte identical to `shared/components/` and `shared/constants/`.
3. **Move contexts into shared** — Move `contexts/AuthContext.tsx`, `contexts/ThemeContext.tsx`, and `contexts/AvatarContext.tsx` into `shared/contexts/`. Update the `@shared/*` alias in tsconfig if needed so `@/shared/contexts/` resolves.
4. **Mass-update @/contexts imports** — Replace every `from "@/contexts/..."` import (≈238 files across `app/`, `features/`, `shared/components/`) with `from "@/shared/contexts/..."`.
5. **Mass-update @/components imports** — Replace every `from "@/components/..."` import with `from "@/shared/components/..."`.
6. **Mass-update @/constants imports** — Replace every `from "@/constants/..."` import with `from "@/shared/constants/..."`.
7. **Fix server relative imports** — `server/routes.ts` imports `../lib/utils/email-validator` and `../lib/analysis/qr-validator` via relative paths. Update these to import from the canonical `services/` paths.
8. **Update lib/qr-analysis.ts** — Ensure the barrel re-exports from `@/services/analysis/` (already partially done but verify after lib/analysis deletion).
9. **Verify** — Confirm Metro bundler and the Express backend start cleanly with zero unresolved module errors.

## Relevant files
- `lib/services/`
- `lib/analysis/`
- `lib/cache/`
- `lib/utils/`
- `components/`
- `constants/`
- `contexts/AuthContext.tsx`
- `contexts/ThemeContext.tsx`
- `contexts/AvatarContext.tsx`
- `shared/`
- `lib/qr-analysis.ts`
- `server/routes.ts`
- `tsconfig.json`
- `app/_layout.tsx`
- `app/(tabs)/_layout.tsx`
