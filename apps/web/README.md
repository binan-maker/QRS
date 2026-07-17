# apps/web — Next.js Website

> **Phase 4** of the migration roadmap. Not yet bootstrapped.

## Planned contents

```
apps/web/
├── app/
│   ├── (marketing)/     # Landing, pricing, how-it-works (SSG/ISR)
│   ├── (dashboard)/     # Authenticated user dashboard (SSR)
│   ├── q/[id]/          # Web QR redirect (Edge Runtime, <50ms p99)
│   └── api/             # Thin Next.js API route proxies
├── features/
│   ├── qr-viewer/
│   ├── dashboard/
│   └── auth/
└── components/          # Web-specific UI components
```

## Key decisions pending (see MIGRATION_ROADMAP.md §15)

- UI library: Tamagui (shared with mobile) vs separate Tailwind CSS
- i18n: shared `i18next` vs `next-intl` with shared translation files
