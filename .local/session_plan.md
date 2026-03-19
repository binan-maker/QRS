# Objective
Professional codebase refactor: remove duplicates, extract styles/components, separate UI from logic, optimize Firebase costs.

# Tasks

### T001: Delete dead duplicate component directories
- **Blocked By**: []
- **Details**:
  - Delete `components/qr-detail/`, `components/scanner/`, `components/profile/`, `components/home/`
  - Keep `components/ui/`, `components/layouts/`, `components/ErrorBoundary.tsx`, `components/ErrorFallback.tsx`, `components/GoogleIcon.tsx`, `components/KeyboardAwareScrollViewCompat.tsx`
  - Acceptance: No imports broken, dead code gone

### T002: Extract StyleSheet from large screen files
- **Blocked By**: [T001]
- **Details**:
  - `app/qr-detail/[id].tsx` → extract styles to `app/qr-detail/styles.ts`
  - `app/my-qr/[id].tsx` → extract styles to `app/my-qr/styles.ts`
  - `app/account-management.tsx` → extract styles to `features/account/styles.ts`
  - Other large screens: `app/how-it-works.tsx`, `app/my-qr-codes.tsx`, `app/trust-scores.tsx`
  - Acceptance: Screen files are leaner, styles are importable

### T003: Extract sub-components from qr-detail and my-qr screens
- **Blocked By**: [T002]
- **Details**:
  - `app/qr-detail/[id].tsx`: extract `SafetyWarningCard`, `ReportGrid`, `CommentsSection`, `CommentInputBar`
  - `app/my-qr/[id].tsx`: extract `QrPreviewCard`, `QrMetaCard`, `LivingShieldCard`, `ActiveStatusCard`, `DesignEditor`
  - Move extracted components to `features/qr-detail/components/` and `features/my-qr/components/`
  - Acceptance: Screen files < 300 lines

### T004: Extract DeleteAccountModal from account-management
- **Blocked By**: []
- **Details**:
  - Extract modal to `features/account/components/DeleteAccountModal.tsx`
  - Extract auth helpers to `lib/auth/utils.ts`
  - Acceptance: account-management.tsx < 200 lines

### T005: Extend Firebase caching coverage
- **Blocked By**: []
- **Details**:
  - Add TTL caching for more service functions
  - Extend `lib/cache/qr-cache.ts` with more cache entries
  - Deduplicate concurrent Firestore reads
  - Acceptance: Fewer redundant reads on repeated navigation

