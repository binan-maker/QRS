// ─── Redirect barrel ─────────────────────────────────────────────────────────
// Allows `import { firebaseApp } from "@/lib/firebase/index"` or
// `@/lib/firebase/` to resolve alongside `@/lib/firebase` (without slash).
// All actual Firebase initialisation is in the parent file: lib/firebase.ts.
// New code should import from `@/lib/firebase` directly (no trailing slash).
// ─────────────────────────────────────────────────────────────────────────────

export * from "../firebase";
