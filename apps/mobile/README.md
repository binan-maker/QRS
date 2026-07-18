# apps/mobile — React Native Expo App

**Phase 5 target location.** The mobile application code currently lives at the **repository root** (`app/`, `features/`, `services/`, `shared/`, `store/`) and will be moved here during Phase 5 of the migration roadmap.

## Target Structure (Phase 5)

```
apps/mobile/
├── app/                    # Expo Router screens (thin route wrappers only)
│   ├── (auth)/             # Login, signup, forgot-password screens
│   ├── (tabs)/             # Main tab navigator screens
│   └── _layout.tsx
├── features/               # Feature modules (UI + hooks, no business logic)
│   ├── scanner/            # QR camera scanner
│   ├── qr-detail/          # QR detail + trust score view
│   ├── generator/          # QR generator (form + templates)
│   ├── history/            # Scan history
│   ├── profile/            # User profile management
│   └── settings/           # App settings
├── infrastructure/         # Mobile-specific infrastructure adapters
│   ├── api/                # API client — wraps fetch, injects Firebase ID token
│   ├── storage/            # AsyncStorage adapter + offline queue
│   ├── push/               # Expo push notification adapter
│   └── auth/               # Firebase Auth adapter (swappable in Phase 6)
├── store/                  # Zustand stores (UI state only — no business logic)
│   ├── ui.store.ts         # Theme, navigation state
│   └── offline-queue.store.ts
└── shared/                 # Mobile-specific shared UI components + utils (zero business logic)
```

## Migration Checklist (Phase 5)

- [ ] Move `app/` → `apps/mobile/app/`
- [ ] Move `features/` → `apps/mobile/features/`
- [ ] Move `shared/` → `apps/mobile/shared/` (after removing business logic)
- [ ] Move `store/` → `apps/mobile/store/` (after removing authStore duplicate)
- [ ] Create `apps/mobile/infrastructure/api/client.ts` (replaces direct Firestore SDK calls)
- [ ] Create `apps/mobile/infrastructure/storage/offline-queue.ts`
- [ ] Remove `firebase` client SDK (keep only `firebase/auth`)
- [ ] Update all `@/services/*` imports to use the API client
- [ ] Update `package.json` workspace entry from root → `apps/mobile/`
- [ ] Verify metro bundler config resolves monorepo packages

See `MIGRATION_ROADMAP.md` Phase 5 for full task breakdown.
