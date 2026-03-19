# Objective
1. Anonymous mode: zero tracking — no AsyncStorage, no DB, show inline result modal
2. Signature salt: dynamic year-based (generation uses current year, verification tries ±5 years)
3. Full light/dark theme system + modern 2026 redesign across every screen/component

# Tasks

### T001: Core system (quick fixes + theme infrastructure)
- Blocked By: []
- Files: lib/services/types.ts, lib/analysis/signature.ts, constants/Colors.ts, contexts/ThemeContext.tsx, app/_layout.tsx

### T002: Anonymous mode scanner fix
- Blocked By: [T001]
- Files: features/scanner/hooks/useScanner.ts, app/(tabs)/scanner.tsx

### T003: Tab bar + tab screens
- Blocked By: [T001]
- Files: app/(tabs)/_layout.tsx, app/(tabs)/index.tsx, app/(tabs)/history.tsx, app/(tabs)/profile.tsx, app/(tabs)/settings.tsx, app/(tabs)/qr-generator.tsx

### T004: Auth screens + shared components
- Blocked By: [T001]
- Files: app/(auth)/login.tsx, app/(auth)/register.tsx, app/(auth)/forgot-password.tsx, features/auth/components/AuthFormInput.tsx, components/layouts/ScreenHeader.tsx, components/ui/SkeletonBox.tsx

### T005: Feature style factories + remaining screens
- Blocked By: [T001]
- Files: features/settings/styles.ts, features/qr-detail/styles.ts, features/my-qr/styles.ts, app/settings.tsx, app/qr-detail/[id].tsx, app/my-qr/[id].tsx, app/my-qr-codes.tsx, app/favorites.tsx, app/account-management.tsx, app/terms.tsx, app/privacy-policy.tsx

