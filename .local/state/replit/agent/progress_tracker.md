[x] 1. Install the required packages
[x] 2. Restart the workflow to see if the project is working
[x] 3. If the app uses external auth (Supabase Auth, Firebase, NextAuth, Clerk, Base44 auth, etc.), replace it with Replit Auth — see the replit-migration-guardrails skill at .local/secondary_skills/replit-migration-guardrails/SKILL.md. Skip if the app has no login flow.
[x] 4. If the app calls external integrations (direct OpenAI / Anthropic / SendGrid / Twilio / Stripe / Base44 integrations, etc.), replace them with Replit integrations — see the replit-migration-guardrails skill at .local/secondary_skills/replit-migration-guardrails/SKILL.md. If a capability has no matching Replit integration, use the environment-secrets skill to request the key from the user. Skip if none apply.
[x] 5. Verify the project works end-to-end: use the testing agent (see the testing skill) to exercise the main flows, then use the feedback tool to screenshot and confirm with the user
[x] 6. Inform user the import is completed and they can start building, mark the import as completed using the complete_project_import tool
[x] 7. Fix Business QR Generator: Smart Redirect card now shows actual destination (URL/phone/UPI/etc.) instead of guard/192.168 URL
[x] 8. Fix Android nav bar invisible/white in light theme (expo-navigation-bar integration)
[x] 9. Firebase cost reduction: My QR Codes switched from real-time listeners to one-time fetches with 5-min AsyncStorage cache
[x] 10. Performance: QR list replaced expensive SVG renders with icon thumbnails
[x] 11. Added getUserGroupsOnce() to group-service.ts for one-time fetch of groups
[x] 12. Improved light theme tab icon contrast (#7A99BC → #4A6E94)
[x] 13. Codebase cleanup & structural reorganisation:
        - Deleted features/generator/landing/ (4 re-export stub files — dead indirection layer)
        - app/(tabs)/qr-generator/index.tsx now imports GeneratorLanding directly
        - Created features/my-qr/MyQrDetailScreen.tsx — moved 942-line screen logic out of app/
        - app/my-qr/[id].tsx reduced to 1-line re-export (matches app/qr-detail/[id].tsx pattern)
        - Moved 12 inline StyleSheet.create() blocks out of QrDetailScreen.tsx (was 1517 lines → 987 lines)
        - All 12 StyleSheet objects now live as named exports in features/qr-detail/styles.ts
        - QrDetailScreen.tsx imports them all from styles.ts — single source of truth
[x] 14. Removed QR code grouping feature entirely:
        - Deleted app/qr-groups.tsx (group list screen)
        - Deleted app/qr-group/[id].tsx (group detail screen)
        - Deleted app/create-group.tsx (group creation flow)
        - Deleted components/groups/GroupPickerModal.tsx
        - Deleted components/groups/GroupSelector.tsx
        - Deleted components/groups/GroupsRow.tsx
        - Deleted lib/services/group-service.ts
        - Removed group-service export from lib/services/index.ts
        - Removed GroupPickerModal from features/my-qr/MyQrDetailScreen.tsx
        - Removed folder icon button from features/my-qr/components/MyQrNavBar.tsx
[x] 15. Fixed QR Detail rendering pipeline (3 root bugs):
        - ContentCard: introduced effectiveType = templateKey ?? contentType so all 35
          generator templates (reviewpage, menucatalogue, wifi, contact, etc.) render
          their correct icon/label/structured-fields instead of a generic text card.
        - getDetailContentType (qr-display-utils): now trusts stored templateKey as a
          second-priority fallback before falling through to content-sniffing heuristics.
        - getCombinedVerdict (useQrDetail): owners now see "YOUR QR / SAFE" instead of
          "UNVERIFIED QR"; isQrOwner flag added to isQrGuardVerified check.
[x] 16. Template Selector reduced to exactly 5 templates:
        - registry.ts — rewritten to 5 entries only (url, email, wifi, paymentlink, contact)
        - templates.ts — rewritten to 5 QrTemplate entries (upi_payment, contact_card, wifi, website_url, email)
        - built-in-categories.ts — reduced to 5 entries (url, email, wifi, upi, contact)
        - category-config.ts — simplified to 5 colours / POPULAR_IDS / GROUPS
        - AI generation removed entirely: deleted ai-generator.ts and AiView.tsx
        - HomeView.tsx — removed AI Builder card, removed category pills
        - QrTemplateModal.tsx — removed all AI state, imports, and view logic
        - GeneratorLanding.tsx — removed AI card and category filter
        - ModalView type: removed "ai" variant
        - PickerView.tsx — fixed hardcoded "+" count text
        - npm install ran; backend running on port 5000
[x] 17. Enterprise folder architecture refactor:
        - components/ → shared/components/
        - constants/ → shared/constants/
        - lib/utils/ → shared/utils/
        - lib/services/ → services/
        - lib/cache/ → services/cache/
        - lib/analysis/ → services/analysis/
        - lib/notifications/ → services/notifications/
        - features/qr-detail/content-cards/cards/ → features/qr-detail/cards/
        - features/qr-detail/content-cards/parsers/ → features/qr-detail/parsers/
        - features/qr-detail/content-cards/shared/ → features/qr-detail/shared/
        - features/qr-detail/{QrDetailScreen,dynamic/,static/} → features/qr-detail/screens/
        - ContentCard shim replaced with real switch-based implementation in components/ContentCard.tsx
        - lib/qr-analysis.ts updated to re-export from @/services/analysis/
        - All @/ import paths updated globally (zero stale references)
        - tsconfig.json: added @services/* alias alongside existing @shared/*
[x] 18. QR Generator full cleanup (based on analysis report):
        - Deleted features/generator/landing/ entirely (GeneratorLanding, FeatureRow, ModeCard, constants — all re-export stubs)
        - Deleted features/generator/components/template-modal/AiView.tsx (unused, no imports)
        - QrOutputCard.tsx (387 lines) split into 4 focused sub-components:
            features/generator/components/output/QrPreview.tsx — QR code + corner logo rendering
            features/generator/components/output/QrSecurityBadges.tsx — security strip, threat strip, position note
            features/generator/components/output/QrSavedBanner.tsx — saved banner, live preview, branded/private footer
            features/generator/components/output/QrOutputActions.tsx — content preview, size controls, action buttons
        - QrOutputCard.tsx reduced to thin composer (~60 lines) wiring the 4 sub-components
        - QrFormPage.tsx: all 4 modals (QrTemplateModal, CustomQrBuilderModal, PositionModal, InfoModal)
          now lazy-mounted — only rendered when open, not always in the tree
        - Debounce confirmed already present (350ms in useQrContent.ts) — no change needed
        - Zero stale references to deleted files verified
[x] 19. Scanner full cleanup (based on analysis report):
        - Deleted 15 legacy top-level component files that duplicated the canonical sub-folder versions:
            ScannerOverlay, FinderFrame, OverlayTopBar, OverlayBottomBar (→ overlay/)
            SafetyModal, VerifiedModal, UnverifiedModal, LivingShieldModal (→ modals/)
            ScannerToast, DonationBanner, ConversionBanner (→ feedback/)
            CameraErrorBoundary, CameraUnavailableBanner, PermissionScreen, ProcessingOverlay (→ system/)
        - ScannerScreen.tsx: replaced 11 individual legacy import lines with a single barrel import
          from @/features/scanner/components (index.ts)
        - ScannerScreen.tsx: SafetyModal, VerifiedModal, UnverifiedModal now lazy-mounted
          (only rendered when their open flag is true — removes 3 heavy modal trees from base render)
        - ProcessingOverlay already conditionally rendered ({processing && ...}) — confirmed correct
        - features/scanner/index.ts: re-exports updated to pull from components barrel instead
          of deleted legacy paths
        - Zero stale references verified — clean structure confirmed
[x] 20. Scan History full cleanup (based on analysis report):
        - Confirmed already-good: FlashList used (not ScrollView), React.memo on HistoryItem,
          all derived data in useMemo, pagination via useInfiniteQuery, optimistic delete,
          disk pre-warm cache, 15-min stale time — no changes needed to these areas
        - Fixed date-utils.ts groupByDate: was O(n²) — inner .filter() loop recounted section
          items by re-scanning forward through the entire remaining array for every header.
          Replaced with two-pass O(n) algorithm: first pass builds a countMap, second pass
          inserts headers on label change using the pre-built counts.
        - Fixed useSearch.ts: added 300ms debounce — debouncedQuery state updated via
          useEffect + setTimeout. Timer is cleared on unmount and on closeSearch.
        - Fixed HistoryScreen.tsx: searchedItems now uses debouncedQuery instead of raw
          searchQuery — matchesSearch (which calls parseAnyPaymentQr on every payment item)
          now only runs after user pauses typing, not on every keystroke.
          Raw searchQuery retained for display-only uses (EmptyState, SearchResultsRow labels).
        - Deleted features/history/styles.ts — dead placeholder file with comment only,
          not exported from index.ts, not imported anywhere.
[x] 21. Profile page full cleanup (based on analysis report):
        - Confirmed already-good: ProfileScreen is React.memo, all navigation handlers are
          useCallback, loadStats batches 3 reads into one Promise.all, 3-min stale + in-flight
          guard + disk cache eliminates skeleton flash on re-focus, loadProfileExtras has 5-min
          stale + disk cache, QR listener only mounted while tab is focused (useFocusEffect +
          cleanup on blur), avatar updates are fully optimistic (no profile refresh triggered).
        - Deleted features/profile/publicProfileStyles.ts — dead re-export stub
          (export { publicStyles as S } from "./styles"). PublicProfileScreen.tsx already imports
          publicStyles directly from @/features/profile/styles. No file imported this stub.
        - Deleted features/profile/components/UsernameEditor.tsx — fully dead component.
          Never imported in ProfileScreen, settings, or any other file in the codebase.
          Username editing was previously done inline in ProfileScreen; that code was removed
          but UsernameEditor was left behind unreferenced.
        - Fixed features/profile/components/QrPreviewCard.tsx: removed unused `index` prop
          that was declared in Props interface and destructured but never referenced in the
          component body (animation used hardcoded FadeIn.delay(0) regardless of index).
        - Rewrote features/profile/hooks/useProfile.ts to remove ~10 dead state variables and
          3 dead callbacks that no screen uses:
            Removed state: editingName, newName, savingName, usernameLastChangedAt,
              editingUsername, newUsernameInput, usernameAvailable, checkingUsername,
              savingUsername, usernameError
            Removed callbacks: handleSaveName, handleSaveUsername, handleCancelUsername
            Removed memoized values: lastChangedDate, daysUntilEdit
            Removed useEffect: username availability debounce check (called
              checkUsernameAvailable on every keystroke, fired even though no screen
              was editing username)
            Removed from imports: updateLocalDisplayName from useAuth destructuring,
              checkUsernameAvailable and updateUsername from firestore-service
            Trimmed return object from 34 fields → 19 fields (only what ProfileScreen uses)
[x] 23. Settings full cleanup (based on analysis report):
        - Fixed useSettings.ts: removed unused `token` from useAuth() destructure.
        - Fixed useSettings.ts return object: removed 3 dead return fields (setFeedbackDone,
          hapticsEnabled, toggleHaptics) that were never destructured by SettingsScreen.
          Internal haptics state/logic retained — setHapticsEnabled() still fires correctly.
        - Fixed SettingsScreen.tsx PREFERENCES section: extracted inline options array
          ([{ key:"home"... }, { key:"scanner"... }]) to module-level constant
          STARTUP_SCREEN_OPTIONS — was recreated as a new array reference on every render.
        - Fixed SettingsScreen.tsx: replaced inline onPress={() => setStartupScreen(opt.key)}
          closures inside .map() with stable handleSetHomeScreen / handleSetScannerScreen
          useCallbacks and a startupScreenHandlers useMemo record — mirrors the existing
          themeModeHandlers pattern already used for theme selection.
        - Fixed FollowingSection.tsx: extracted inline renderItem function passed to FlashList
          into a useCallback — was a new function reference every render, defeating FlashList
          memoisation. deps: [colors, isDark].
        - Added useCallback import to FollowingSection.tsx.
[x] 24. Firestore cost & read-efficiency cleanup (based on analysis report):
        - services/follow-service.ts + lib/services/follow-service.ts:
          · getFollowCount: replaced full subcollection query (db.query followers) with
            document field read (qrCodes/{qrId}.followerCount) — O(n) → O(1).
          · getQrFollowCount: now delegates to getFollowCount (single implementation).
          · toggleFollow: adds atomic db.increment on qrCodes/{qrId}.followerCount ±1
            alongside existing users/{userId}.followingCount — keeps the field accurate
            without any extra reads.
          · getCreatorFollowerCount: removed subcollection fallback query
            (db.query creatorFollowers). Now returns userData.creatorFollowerCount ?? 0.
            toggleFollowCreator already increments the field atomically, so the
            subcollection query was both redundant and expensive.
        - services/report-service.ts + lib/services/report-service.ts:
          · Added getQrReportData() — single subcollection query returning { counts,
            weighted } in one pass. Eliminates the duplicate reports read that existed
            because getQrReportCounts and getQrWeightedReportCounts each queried
            qrCodes/{qrId}/reports independently.
          · getQrReportCounts / getQrWeightedReportCounts retained as thin wrappers
            for backward-compat — neither is called anywhere outside report-service.
        - services/qr-detail-service.ts + lib/services/qr-detail-service.ts:
          · loadQrDetail Promise.all reduced from 4 ops to 2:
            Before: getQrReportCounts + getQrWeightedReportCounts (duplicate subcollection
            query) + getFollowCount (subcollection query) + db.get(qrCodes) = 3 queries + 1 read
            After: getQrReportData (1 query) + db.get(qrCodes) (1 read, followerCount read
            from same doc) = 1 query + 1 read — 50% fewer Firestore ops per QR detail open.
[x] 22. Notifications full cleanup (based on analysis report):
        - Confirmed already-good in useNotifications.ts: module-level shared count subscription
          (countCache / countListeners / countUnsub pattern) means multiple callers share ONE
          Firestore listener — no duplicate subscriptions. Full notification list listener only
          activates when notifOpen===true. markAllNotificationsRead and clearAllNotifications
          are single batch calls (not per-notification loops). Listener tears down via
          teardownCountIfUnused when last consumer unmounts.
        - Rewrote NotificationsModal.tsx — four fixes:
          1. Moved getNotifColor to module level (was defined inside component body on every
             render, closing over colors). Now accepts colors as a parameter.
          2. getNotifColor called once per item and result stored in `color` variable — was
             called twice per item per render (once for icon bg, once for icon color).
          3. Extracted NotificationItem as React.memo component at module level — each row is
             now independently memoized. onPress handler is useCallback inside NotificationItem
             so it doesn't recreate on every parent render. Previously every row was an inline
             arrow function re-created on every state change.
          4. Replaced ScrollView + inline .map() with FlatList + renderItem/keyExtractor —
             gives virtualization for large notification lists and proper React reconciliation.
          5. Extracted EmptyNotifications as React.memo component — prevents re-renders when
             parent state changes while list is empty.
