# 🚀 BinRo — Codebase Architecture & Technical Documentation

Welcome to the **BinRo** monorepo. This repository houses the complete full-stack ecosystem for BinRo: cross-platform mobile app (React Native / Expo), web companion client (Next.js), and backend microservice (Node.js / Express).

---

## 🏛️ System Architecture

BinRo operates as a distributed system designed around high-throughput QR security evaluation, mathematical community trust scoring, and zero-trust payload verification.

```
/
├── app/                  # 🧭 Expo Router application screens & navigation layouts
├── features/             # 📱 Domain-driven mobile feature modules (auth, scanner, history, qr-detail)
├── services/             # 🧠 Domain logic, threat scanning, payment parsers, trust scoring algorithms
├── shared/               # 🤝 Reusable UI components, design tokens, contexts, hooks, utilities
├── lib/                  # 🏛️ Core adapters (auth, db, storage), logger, security, startup prewarmers
├── config/               # ⚙️ Application constants, API endpoints, environment variable contracts
├── store/                # 📦 Global state management (Zustand) with fine-grained selectors
├── validators/           # 🛡️ Runtime validation schemas for auth, profiles, settings, and scan payloads
├── supabase/             # 🗄️ Database schemas, PostgreSQL migrations, and RLS policies
├── packages/             # 📦 Modular shared monorepo packages
│   ├── core/             # Pure entities and error hierarchy (zero external dependencies)
│   ├── db/               # Canonical database types and models
│   ├── ui/               # Shared cross-platform design tokens (colors, spacing, typography)
│   └── config/           # Base environment validation and configurations
├── plugins/              # 🔌 Custom Expo Config Plugins for APK/AAB size and ABI optimization
├── patches/              # 🩹 Targeted upstream npm package compatibility patches
└── apps/
    ├── web/              # 🌐 Next.js SSR/Edge companion web application
    └── api/              # ⚡ Express/Node RESTful backend service & worker queues
```

---

## 📐 Monorepo Subsystems

### 1. `apps/api` (Backend Service)
Clean Architecture Node.js / Express microservice handling:
- Cryptographically signed API responses (`security/response-signer.ts`).
- Server-side matrix decoding from uploaded images (`image-decode.ts`).
- Asynchronous metrics calculation and scheduled maintenance tasks (`workers/`).
- Health probes, memory telemetry, and database pool readiness monitoring (`health/`).

### 2. `apps/web` (Web Companion)
Next.js companion web application offering:
- Public QR code safety inspections via `/qr/:code`.
- Zero-install web scanner utilizing device camera streams.
- Direct download landing pages for the Android native application.

### 3. Mobile Client (`app/`, `features/`, `services/`, `shared/`)
Universal React Native mobile application built on Expo SDK 54:
- Hardware-accelerated camera scanning with low-light auto-assist.
- Local SQLite / AsyncStorage caching with resilient offline synchronization.
- Edge-to-edge system UI styling compatible with modern Android and iOS devices.

---

## 🎯 Code Reusability & Architecture Principles

1. **Centralized Barrel Exports**:
   Every layer provides an `index.ts` barrel export. Callers import through high-level modules rather than deep nested relative paths:
   ```typescript
   import { ScreenHeader, GradientButton, useTheme } from "@/shared";
   import { analyzeAnyPaymentQr, calculateTrustScore } from "@/services";
   import { logger, authAdapter, dbAdapter } from "@/lib";
   import { validateEmail, validatePassword } from "@/validators";
   import { useAuthStore, selectIsAuthenticated } from "@/store";
   import { APP_NAME, API_BASE_URL } from "@/config";
   ```

2. **Thin Route Adapter Pattern**:
   Screen entry points inside `/app` remain ultra-lightweight wrappers that mount feature views from `/features`, decoupling navigation routing from business components.

3. **Isolated Domain Logic**:
   Business logic and parser routines (e.g. UPI, SEPA, EMVCo, and cryptocurrency formats) reside strictly in `/services/analysis/payment-parser`, independent of UI frameworks.

---

## 🛠️ Verification & Build Commands

```bash
# Verify the web app
npm run build --workspace=apps/web

# Start web development server
npm run dev --workspace=apps/web

# Build backend service
npm run build --workspace=apps/api
```
