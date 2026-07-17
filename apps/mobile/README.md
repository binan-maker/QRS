# apps/mobile — React Native (Expo)

> **Phase 1 note:** The Expo project currently lives at the **monorepo root** while the workspace scaffold is established. Moving source files here is scoped to Phase 2 of the migration roadmap.

## Future home of

```
apps/mobile/
├── app/             # Expo Router screens (thin wrappers)
├── features/        # Domain feature modules
├── shared/          # Mobile-specific shared UI + utils
├── infrastructure/  # API client, offline queue, push adapter
├── store/           # Zustand stores
├── lib/             # Firebase Auth adapter
├── app.json
├── babel.config.js
├── metro.config.js
└── tsconfig.json
```

## Why not moved yet

The Expo Metro bundler resolves `@/` imports relative to the project root (`package.json` location). Moving the project root to `apps/mobile/` requires:

1. Splitting `package.json` into workspace root + `apps/mobile/package.json`
2. Updating `metro.config.js` to set `projectRoot` to `apps/mobile/`
3. Confirming `expo start --project-root apps/mobile` works end-to-end
4. Updating `.replit` workflow scripts

This is scoped to **Phase 2** of the migration roadmap (`MIGRATION_ROADMAP.md`).
