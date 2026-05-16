[x] 1. Install the required packages
[x] 2. Restart the workflow to see if the project is working
[x] 3. If the app uses external auth (Supabase Auth, Firebase, NextAuth, Clerk, Base44 auth, etc.), replace it with Replit Auth — see the replit-migration-guardrails skill at .local/secondary_skills/replit-migration-guardrails/SKILL.md. Skip if the app has no login flow.
[x] 4. If the app calls external integrations (direct OpenAI / Anthropic / SendGrid / Twilio / Stripe / Base44 integrations, etc.), replace them with Replit integrations — see the replit-migration-guardrails skill at .local/secondary_skills/replit-migration-guardrails/SKILL.md. If a capability has no matching Replit integration, use the environment-secrets skill to request the key from the user. Skip if none apply.
[x] 5. Verify the project works end-to-end: use the testing agent (see the testing skill) to exercise the main flows, then use the feedback tool to screenshot and confirm with the user
[x] 6. Inform user the import is completed and they can start building, mark the import as completed using the complete_project_import tool
[x] 5. Fix Business QR Generator: Smart Redirect card now shows actual destination (URL/phone/UPI/etc.) instead of guard/192.168 URL
[x] 6. Fix Android nav bar invisible/white in light theme (expo-navigation-bar integration)
[x] 7. Firebase cost reduction: My QR Codes switched from real-time listeners to one-time fetches with 5-min AsyncStorage cache
[x] 8. Performance: QR list replaced expensive SVG renders with icon thumbnails
[x] 9. Added getUserGroupsOnce() to group-service.ts for one-time fetch of groups
[x] 10. Improved light theme tab icon contrast (#7A99BC → #4A6E94)
[x] 11. Codebase cleanup & structural reorganisation:
        - Deleted features/generator/landing/ (4 re-export stub files — dead indirection layer)
        - app/(tabs)/qr-generator/index.tsx now imports GeneratorLanding directly
        - Created features/my-qr/MyQrDetailScreen.tsx — moved 942-line screen logic out of app/
        - app/my-qr/[id].tsx reduced to 1-line re-export (matches app/qr-detail/[id].tsx pattern)
        - Moved 12 inline StyleSheet.create() blocks out of QrDetailScreen.tsx (was 1517 lines → 987 lines)
        - All 12 StyleSheet objects now live as named exports in features/qr-detail/styles.ts
        - QrDetailScreen.tsx imports them all from styles.ts — single source of truth
