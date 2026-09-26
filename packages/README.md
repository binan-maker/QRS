# 📦 Shared Workspace Packages (`/packages`)

Platform-agnostic TypeScript packages shared across the Mobile application, Web client, and Backend microservice.

---

## Package Directory

| Package | Path | Responsibility |
| :--- | :--- | :--- |
| **`@binro/core`** | `packages/core` | Core business domain models, enum definitions, and unified error hierarchy. Zero runtime dependencies. |
| **`@binro/db`** | `packages/db` | Database schema interfaces and table definitions matching Supabase/PostgreSQL schema. |
| **`@binro/ui`** | `packages/ui` | Shared design tokens: color scales, spacing grid, and typography standards. |
| **`@binro/config`** | `packages/config` | Common environment schemas and base configuration profiles. |
| **`tsconfig`** | `packages/tsconfig` | Canonical TypeScript compiler options for React Native, Next.js, and Node. |
| **`eslint-config`** | `packages/eslint-config` | Shared code styling and lint rules. |
