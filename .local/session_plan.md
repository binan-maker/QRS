# Objective
Full modernization: anonymous mode privacy, dynamic year salt, complete dark/light theme, 2026-level design, AMOLED compatibility, organized codebase.

# Tasks

### T001: Anonymous mode - no AsyncStorage
- **Blocked By**: []
- **Details**:
  - Create `lib/cache/anonymous-session.ts` as a module-level in-memory map
  - In `useScanner.ts` `processScanAnonymous()`: remove AsyncStorage.setItem, use in-memory store
  - In `useQrData.ts`: when content not in DB, check in-memory store first, then AsyncStorage
  - Acceptance: Anonymous scans leave zero trace on device storage

### T002: Fix ALL hardcoded Colors.dark references (~80 files)
- **Blocked By**: []
- **Details**:
  - All components import `useTheme()` and destructure `colors`
  - All `styles.ts` files converted to `makeStyles(colors: AppColors)` factory functions
  - Components call `const styles = makeStyles(colors)` inside component body
  - Acceptance: Switching theme updates all UI elements correctly

### T003: Modernize color palette + design
- **Blocked By**: [T002]
- **Details**:
  - Update `constants/colors.ts` with richer, more vibrant 2026 palette
  - Ensure AMOLED dark mode has true blacks and sufficient contrast
  - Ensure light mode is clean and crisp, not invisible on bright screens
  - Add `shadow`, `overlay`, `successText`, `errorText` semantic tokens
  - Acceptance: App looks premium, colors visible on all devices

### T004: Verify and restart
- **Blocked By**: [T001, T002, T003]
- **Details**:
  - Restart workflows, take screenshot, verify no broken imports
