# Objective
Full-scale codebase reorganization of QR Guard into a clean, company-grade structure. Every file gets a clear home, every folder has a single responsibility, and nothing is orphaned.

# Target Structure
```
features/
  qr-detail/
    hooks/       ← useQrData, useQrSafety, useQrComments, useQrReports, useQrFollow, useQrFavorite, useQrOwner, useQrDetail (composer)
    components/  ← moved from components/qr-detail/
  scanner/
    hooks/       ← useScanner (moved from hooks/)
    components/  ← moved from components/scanner/
  home/
    hooks/       ← useHome (moved from hooks/)
    components/  ← moved from components/home/
  history/
    hooks/       ← useHistory (moved from hooks/)
    components/  ← unchanged (already there)
  profile/
    hooks/       ← useProfile (moved from hooks/)
    components/  ← moved from components/profile/
  generator/
    hooks/       ← useQrGenerator (moved from hooks/)
    components/  ← unchanged
    data/        ← unchanged
  settings/
    hooks/       ← useSettings (moved from hooks/)
    components/  ← unchanged
    styles.ts    ← unchanged
  auth/
    hooks/       ← auth utilities extracted
    components/  ← unchanged
  my-qr/
    hooks/       ← unchanged (already has hooks/)
    components/  ← unchanged

lib/
  services/
    qr-service.ts          ← QR CRUD only (slim)
    report-service.ts      ← NEW: report logic split from qr-service
    follow-service.ts      ← NEW: follow logic split from qr-service
    generator-service.ts   ← NEW: generated QR, design, velocity, active state
    comment-service.ts     ← unchanged
    user-service.ts        ← unchanged
    message-service.ts     ← unchanged
    notification-service.ts ← unchanged
    guard-service.ts       ← unchanged
    trust-service.ts       ← unchanged
    types.ts               ← unchanged
    utils.ts               ← unchanged
    index.ts               ← updated to include new files
  repositories/
    README.md              ← documents the repository pattern
    interfaces/
      IQrRepository.ts     ← interface definition
    firebase/
      FirebaseQrRepository.ts ← Firebase implementation
  analysis/   ← unchanged
  cache/      ← unchanged

components/
  layouts/    ← unchanged (shared across features)
  ui/         ← unchanged (shared)
  ErrorBoundary.tsx      ← shared
  ErrorFallback.tsx      ← shared
  GoogleIcon.tsx         ← shared
  KeyboardAwareScrollViewCompat.tsx ← shared
  (home/, scanner/, qr-detail/, profile/ MOVED to features/)

hooks/
  useQrDetail.ts  ← re-export shim → features/qr-detail/hooks/useQrDetail
  useHistory.ts   ← re-export shim → features/history/hooks/useHistory
  useHome.ts      ← re-export shim → features/home/hooks/useHome
  useProfile.ts   ← re-export shim → features/profile/hooks/useProfile
  useScanner.ts   ← re-export shim → features/scanner/hooks/useScanner
  useQrGenerator.ts ← re-export shim → features/generator/hooks/useQrGenerator
  useSettings.ts  ← re-export shim → features/settings/hooks/useSettings
```

# Tasks

### T001: Split lib/services/qr-service.ts into 3 new focused service files
- **Blocked By**: []
- Create report-service.ts, follow-service.ts, generator-service.ts
- Slim qr-service.ts to QR CRUD + scan tracking only
- Update index.ts to export new files

### T002: Split hooks/useQrDetail.ts into 7 focused hooks under features/qr-detail/hooks/
- **Blocked By**: [T001]
- useQrData, useQrSafety, useQrComments, useQrReports, useQrFollow, useQrFavorite, useQrOwner
- Make hooks/useQrDetail.ts a thin composer hook
- Keep hooks/useQrDetail.ts as re-export shim for backward compat

### T003: Move hooks/ to their feature folders with re-export shims
- **Blocked By**: []
- useHistory → features/history/hooks/
- useHome → features/home/hooks/
- useProfile → features/profile/hooks/
- useScanner → features/scanner/hooks/
- useQrGenerator → features/generator/hooks/
- useSettings → features/settings/hooks/

### T004: Move components/ subfolders to feature folders
- **Blocked By**: []
- components/home/ → features/home/components/
- components/scanner/ → features/scanner/components/
- components/qr-detail/ → features/qr-detail/components/
- components/profile/ → features/profile/components/
- Update all screen imports

### T005: Add lib/repositories/ skeleton layer
- **Blocked By**: [T001]
- Add IQrRepository interface
- Add FirebaseQrRepository implementation stub
- Add README explaining the pattern

### T006: Audit app/settings.tsx vs app/(tabs)/settings.tsx
- **Blocked By**: []
- Determine if one is dead code

### T007: Update replit.md
- **Blocked By**: [T001, T002, T003, T004]
