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
