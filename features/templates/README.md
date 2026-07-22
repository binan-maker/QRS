# BinRo Feature Template

This folder is the **canonical reference implementation** for every new feature in BinRo.
Copy the structure, follow the conventions, and delete what you don't need.

---

## Folder structure

```
features/[feature-name]/
├── index.ts              # Public barrel — only what external consumers need
├── [Feature]Screen.tsx   # Root screen component (omit if not a screen-level feature)
├── constants.ts          # Feature-scoped constants (labels, keys, config)
├── styles.ts             # Theme-aware style factory
├── components/
│   └── [Component].tsx   # Focused, single-responsibility UI components
└── hooks/
    └── use[Feature].ts   # Business logic; composed from smaller sub-hooks if complex
```

`utils/` is optional — add it only when you have pure helper functions that don't
belong in a hook and aren't reusable enough for `shared/`.

---

## Rules

### 1. Barrel exports (`index.ts`)

Export only what external consumers need. Never export internals.

```ts
// ✅ Good — named, intentional
export { default as FeatureScreen } from "./FeatureScreen";
export { useFeature }               from "./hooks/useFeature";
export { type FeatureItem }         from "./constants";

// ❌ Bad — leaks internals
export * from "./hooks/useFeature";
export * from "./components/InternalRow";
```

### 2. Adapter-only data access

Features **never** import Firebase SDK directly. All data flows through adapters.

```ts
// ✅ Allowed
import { db }              from "@/lib/db";
import { authAdapter }     from "@/lib/auth";
import { getUserData }     from "@/lib/firestore-service";
import { getFromCache }    from "@/services/cache/qr-cache";

// ❌ Never
import { getFirestore, doc, getDoc } from "firebase/firestore";
import { getAuth }                   from "firebase/auth";
```

### 3. Style factory pattern

Every feature that owns styled components uses a single theme-aware factory.

```ts
// styles.ts
import { StyleSheet } from "react-native";
import type { AppColors } from "@/shared/constants/colors";

export function makeFeatureStyles(c: AppColors, width = 390) {
  const s  = Math.min(Math.max(width / 390, 0.82), 1.0);
  const rf = (n: number) => Math.round(n * s); // responsive font
  const sp = (n: number) => Math.round(n * s); // responsive spacing

  return StyleSheet.create({
    container: { flex: 1, backgroundColor: c.background },
    // ...
  });
}

// In the component:
const styles = useMemo(() => makeFeatureStyles(colors, width), [colors, width]);
```

### 4. Hook composition pattern

Complex features split logic across focused sub-hooks; the root hook composes them.

```ts
// hooks/useFeature.ts
export function useFeature() {
  const data    = useFeatureData({ userId });
  const actions = useFeatureActions({ userId, data });

  // Use refs to keep callbacks stable across re-renders without
  // adding sub-hook return values to dependency arrays.
  const doSomethingRef = useRef(data.doSomething);
  doSomethingRef.current = data.doSomething;

  const handleAction = useCallback(() => {
    doSomethingRef.current();
  }, []); // stable — never changes identity

  return { ...data, ...actions, handleAction };
}
```

### 5. Preventing stale state after unmount

Any hook that performs async operations must guard against post-unmount state updates.

```ts
const mountedRef = useRef(true);
useEffect(() => {
  mountedRef.current = true;
  return () => { mountedRef.current = false; };
}, []);

// In async callbacks:
const result = await fetchSomething();
if (!mountedRef.current) return;
setState(result);
```

### 6. Memoization rules

| What | How |
|---|---|
| List row components | `memo(function Row(...) { ... })` |
| Style objects | `useMemo(() => makeStyles(colors, width), [colors, width])` |
| Event handlers | `useCallback(() => { ... }, [stableDeps])` |
| Derived display values | `useMemo(() => derive(data), [data])` |
| Animation entering values | Module-level constant (outside component) |

```ts
// ✅ Module-level animation — created once, not on every render
const ENTER_ANIM = FadeInDown.duration(260);

// ❌ Inside component — new object every render
const ENTER_ANIM = FadeInDown.duration(260); // recreated each render
```

### 7. Accessibility

Every interactive element must have role and label. Selection state gets `accessibilityState`.

```tsx
<Pressable
  onPress={handlePress}
  accessibilityRole="button"
  accessibilityLabel="Delete comment"
>

<Pressable
  onPress={selectTheme}
  accessibilityRole="button"
  accessibilityLabel="Dark theme"
  accessibilityState={{ selected: isActive }}
>
```

Use `keyof typeof Ionicons.glyphMap` for icon props — never `string` or `any`.

### 8. TypeScript quality

- No `any` on component props. Use the narrowest type available.
- Prefer typed unions over `string` for IDs and discriminated values.
- Derive types from data with `as const` + `typeof array[number]`.
- Inline lambdas in JSX props (e.g., `onPress={() => fn()}`) always get extracted
  to a `useCallback` at the top of the component.

```ts
// ✅ Derived union — stays in sync automatically
const SECTION_KEYS = ["main", "account", "profile"] as const;
export type Section = (typeof SECTION_KEYS)[number];

// ❌ Manual union — drifts from data
export type Section = "main" | "account" | "profile";
```

### 9. Naming conventions

| Thing | Convention | Example |
|---|---|---|
| Screen component | `PascalCase` + `Screen` suffix | `HistoryScreen` |
| Hook | `camelCase` + `use` prefix | `useHistoryData` |
| Style factory | `make` + `PascalCase` + `Styles` | `makeHistoryStyles` |
| Constants object | `UPPER_SNAKE_CASE` | `SECTION_TITLES` |
| Type/interface | `PascalCase` | `HistoryItem` |
| Component file | `PascalCase.tsx` | `HistoryRow.tsx` |
| Hook file | `camelCase.ts` | `useHistoryData.ts` |

### 10. Dependency boundaries

```
features/[feature]/
  └── may import from:
        shared/           ✅ components, utils, contexts, constants
        lib/              ✅ db, auth, firestore-service (adapters only)
        services/         ✅ cache, user-service (service layer)
        features/[other]  ⚠️  only if explicitly needed; prefer shared/
        firebase/*        ❌ never — use adapters
```

Features must not import from each other's internal files — only from another
feature's `index.ts` public barrel.

---

## Checklist for new features

- [ ] Folder matches the structure above
- [ ] No Firebase SDK imports anywhere in the feature
- [ ] All data access goes through `@/lib/db`, `@/lib/auth`, or `@/services/`
- [ ] `index.ts` exports only the public surface
- [ ] Style factory follows the `makeXStyles(c, width)` signature
- [ ] All interactive elements have `accessibilityRole` + `accessibilityLabel`
- [ ] No `any` on component props
- [ ] Async hooks guard against post-unmount updates with `mountedRef`
- [ ] Module-level constants for animation values
- [ ] Inline JSX lambdas extracted to `useCallback`
- [ ] List row components wrapped in `memo()`
- [ ] Optimistic updates with rollback for destructive operations
