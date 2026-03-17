# Objective
Professional codebase reorganization: split large files, separate UI from logic, optimize Firebase costs, boost performance.

# Current Problems
- qr-detail/[id].tsx: 2773 lines (CRITICAL)
- my-qr/[id].tsx: 1453 lines
- scanner.tsx: 1427 lines
- qr-generator.tsx: 1058 lines
- settings.tsx: 1044 lines
- index.tsx: 904 lines
- profile.tsx: 854 lines
- history.tsx: 673 lines

# Architecture Target
- `hooks/` — all state/effects/handlers (logic layer)
- `components/<feature>/` — pure UI components
- `lib/services/` — already partially done, complete it
- `components/common/` — shared UI (SkeletonBox already in components/ui/)

# Tasks

### T001: Create shared components + common hooks
- **Blocked By**: []
- SkeletonBox is already in components/ui/SkeletonBox.tsx — add SkeletonListRow
- Create hooks/useQrDetail.ts (extract logic from qr-detail/[id].tsx)
- Create hooks/useScanner.ts (extract logic from scanner.tsx)
- Create hooks/useQrGenerator.ts (extract logic from qr-generator.tsx)
- Create hooks/useHistory.ts (extract logic from history.tsx)
- Create hooks/useProfile.ts (extract logic from profile.tsx)
- Create hooks/useSettings.ts (extract logic from settings.tsx)

### T002: Split qr-detail/[id].tsx into components
- **Blocked By**: [T001]
- components/qr-detail/LoadingSkeleton.tsx
- components/qr-detail/TrustScoreCard.tsx
- components/qr-detail/ReportSection.tsx
- components/qr-detail/CommentItem.tsx
- components/qr-detail/CommentsSection.tsx
- components/qr-detail/ContentCard.tsx
- components/qr-detail/OwnerCard.tsx
- components/qr-detail/MerchantDashboard.tsx
- components/qr-detail/SafetyCard.tsx
- components/qr-detail/MessagesModal.tsx
- components/qr-detail/FollowersModal.tsx
- components/qr-detail/VerifyModal.tsx
- Thin screen orchestrator: app/qr-detail/[id].tsx

### T003: Split scanner.tsx into components
- **Blocked By**: [T001]
- components/scanner/ScannerOverlay.tsx (finder + scan line)
- components/scanner/SafetyModal.tsx
- components/scanner/VerifiedModal.tsx
- components/scanner/LivingShieldModal.tsx
- components/scanner/PermissionScreen.tsx
- Thin screen: app/(tabs)/scanner.tsx

### T004: Split qr-generator, settings, profile, history, index
- **Blocked By**: [T001]
- Each split into hook + components

### T005: Firebase cost optimization + performance
- **Blocked By**: [T002, T003, T004]
- Replace real-time subscriptions with one-time fetches where live data isn't critical
- Add proper unsubscribe on all listeners
- Add React.memo to list items
- Use FlatList instead of ScrollView for all lists
- Cache fetched data in AsyncStorage

# Done When
- No file exceeds ~400 lines
- All hooks in hooks/ folder
- All reusable UI in components/
- App passes visual check
