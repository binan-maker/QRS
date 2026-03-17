# Objective
Full professional codebase refactor: split large files, separate UI from logic, add Firebase caching, improve performance.

# Architecture Goal
- Screens: thin wrappers (~200-400 lines) that import hooks + components
- Hooks: all business logic, state, Firebase calls
- Components: pure UI pieces, no logic, no direct Firebase calls
- lib/cache: in-memory + AsyncStorage caching layer to reduce Firestore reads

# Tasks

### T001: Add Firestore caching layer
- **Blocked By**: []
- **Files**: `lib/cache/qr-cache.ts`, updates to `lib/services/qr-service.ts`
- **Goal**: Cache QR detail, owner info, report counts — reduce reads by 70%+

### T002: Extract QR Detail components and modals
- **Blocked By**: []
- **Files**: 
  - `components/qr-detail/SkeletonLoader.tsx`
  - `components/qr-detail/OwnerCard.tsx`
  - `components/qr-detail/MerchantDashboard.tsx`
  - `components/qr-detail/CommentThread.tsx`
  - `components/qr-detail/ReportSection.tsx`
  - `components/qr-detail/modals/FollowersModal.tsx`
  - `components/qr-detail/modals/MessagesModal.tsx`
  - `components/qr-detail/modals/VerificationModal.tsx`
  - `components/qr-detail/modals/CommentReportModal.tsx`
  - `components/qr-detail/QrDetailStyles.ts`

### T003: Rewrite app/qr-detail/[id].tsx to use hook + components (~300 lines)
- **Blocked By**: [T002]

### T004: Rewrite app/(tabs)/scanner.tsx to use useScanner hook (~200 lines)
- **Blocked By**: []

### T005: Extract and simplify app/(tabs)/index.tsx
- **Blocked By**: []
- **Files**: `components/home/NotificationsModal.tsx`, `components/home/ScanCard.tsx`

### T006: Extract and simplify app/(tabs)/profile.tsx
- **Blocked By**: []
- **Files**: `components/profile/UsernameEditor.tsx`, `components/profile/PhotoModal.tsx`

### T007: Extract and simplify app/(tabs)/qr-generator.tsx
- **Blocked By**: []
- **Files**: `components/generator/ModeSelector.tsx`, `components/generator/QrPreview.tsx`

### T008: Verify all workflows running, no errors
- **Blocked By**: [T001, T003, T004, T005, T006, T007]
