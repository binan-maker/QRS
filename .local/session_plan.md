# Objective
Split all files >500 lines into small, focused modules. Keep backward-compatible barrel re-exports so existing imports keep working.

# Target Files
- lib/firestore-service.ts (1847 lines)
- app/qr-detail/[id].tsx (2773 lines)
- app/(tabs)/qr-generator.tsx (1587 lines)
- app/my-qr/[id].tsx (1453 lines)
- app/(tabs)/scanner.tsx (1426 lines)
- lib/qr-analysis.ts (1243 lines)
- app/settings.tsx (1043 lines) [duplicate of app/(tabs)/settings.tsx?]
- app/(tabs)/index.tsx (904 lines)
- app/(tabs)/profile.tsx (854 lines)

# Tasks

### T001: Split lib/firestore-service.ts → lib/services/
- Blocked By: []
- Details:
  - Create lib/services/types.ts (all interfaces/types)
  - Create lib/services/qr-service.ts (QR CRUD, scan, design, generator, velocity, followers)
  - Create lib/services/comment-service.ts (getComments, addComment, toggleLike, report, delete)
  - Create lib/services/user-service.ts (stats, photo, username, account, favorites, following)
  - Create lib/services/notification-service.ts (notify, subscribe, mark read)
  - Create lib/services/guard-service.ts (saveGuardLink, updateGuardLink, getGuardLink, setActive)
  - Create lib/services/message-service.ts (sendMessage, subscribeToMessages, markRead, getUnreadCount)
  - Create lib/services/verification-service.ts (submitVerification, getVerificationStatus)
  - Update lib/firestore-service.ts to re-export everything from services/ (barrel)

### T002: Split lib/qr-analysis.ts → lib/analysis/
- Blocked By: []
- Details:
  - Create lib/analysis/types.ts (interfaces)
  - Create lib/analysis/url-analysis.ts (URL heuristics, blacklist)
  - Create lib/analysis/payment-analysis.ts (payment parsing/analysis)
  - Create lib/analysis/trust-score.ts (calculateTrustScore, detectContentType, etc.)
  - Update lib/qr-analysis.ts as barrel re-export

### T003: Split app/(tabs)/qr-generator.tsx
- Blocked By: [T001]
- Details:
  - Create lib/qr-presets.ts (QR_PRESETS, buildQrContent, getRawContent, validate, filterByKeyboardType, getFirestoreContentType)
  - Create components/qr-generator/PresetPicker.tsx (preset grid/tabs)
  - Create components/qr-generator/QrFormFields.tsx (TextInput fields + extra fields)
  - Create components/qr-generator/QrDesignPanel.tsx (colors, logo position, templates)
  - Create components/qr-generator/QrPreviewCard.tsx (QR preview, save, share, custom hex modal)
  - app/(tabs)/qr-generator.tsx becomes slim orchestrator < 350 lines

### T004: Split app/my-qr/[id].tsx
- Blocked By: [T001]
- Details:
  - Create hooks/useMyQrDetail.ts (all data fetching/state)
  - Create components/my-qr/StatsRow.tsx (stats boxes)
  - Create components/my-qr/DesignEditor.tsx (colors, logo position, QR preview, custom color modal)
  - Create components/my-qr/LivingShieldCard.tsx (guard URL editor)
  - Create components/my-qr/CommentsPanel.tsx (comments list + CommentRow)
  - Create components/my-qr/FollowersModal.tsx (full-page followers)
  - Create components/my-qr/DeactivateModal.tsx (deactivation modal)
  - app/my-qr/[id].tsx becomes slim orchestrator < 350 lines

### T005: Split app/qr-detail/[id].tsx
- Blocked By: [T001, T002]
- Details:
  - Create hooks/useQrDetail.ts (all data fetching/state)
  - Create components/qr-detail/QrInfoCard.tsx (info, owner, verification)
  - Create components/qr-detail/PaymentAnalysisCard.tsx (payment safety analysis)
  - Create components/qr-detail/TrustScoreCard.tsx (trust score display)
  - Create components/qr-detail/CommentSection.tsx (comments list + add + CommentRow)
  - Create components/qr-detail/ReportModal.tsx (report QR modal)
  - Create components/qr-detail/FollowersSheet.tsx (followers bottom sheet)
  - Create components/qr-detail/SkeletonLoader.tsx (skeleton components)
  - app/qr-detail/[id].tsx becomes slim orchestrator < 350 lines

### T006: Split app/(tabs)/scanner.tsx
- Blocked By: [T001, T002]
- Details:
  - Create hooks/useScanner.ts (scan state, permissions, analysis logic)
  - Create components/scanner/ScanResultView.tsx (result display)
  - Create components/scanner/PaymentSafetyView.tsx (payment safety UI)
  - app/(tabs)/scanner.tsx slim orchestrator

### T007: Split app/(tabs)/index.tsx + profile.tsx
- Blocked By: [T001]
- Details:
  - Create components/home/RecentScansSection.tsx
  - Create components/home/SafetyStatsSection.tsx
  - Create components/profile/UserStatsRow.tsx
  - Create components/profile/ActivitySection.tsx
