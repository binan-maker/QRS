# 🤝 Shared Primitives & UI Architecture (`/shared`)

Cross-cutting UI components, design tokens, React contexts, custom hooks, and shared utility functions.

---

## Directory Organization

```
/shared
├── components/          # Reusable UI primitives, modal sheets, and error boundaries
│   ├── ui/              # Buttons, inputs, headers, skeleton loaders, and toasts
│   ├── consent/         # DPDP Act & GDPR compliance modals and toggles
│   ├── feedback/        # ErrorBoundary and crash fallback components
│   └── notifications/   # System alert modals
├── constants/           # Design system tokens (colors, typography, spacing, collections)
├── contexts/            # Theme, Auth, Avatar, and Scroll-aware TabBar providers
├── hooks/               # Custom hooks (useNetworkStatus, useScrollHide, useScaleFns)
├── types/               # Core shared TypeScript interface definitions
├── utils/               # Pure formatting, haptic triggers, platform detection, and QR helpers
└── index.ts             # Master barrel export for the @/shared namespace
```

---

## Design System & Tokens

Colors, typography, and spacing adhere strictly to the tokens exported by `@/shared/constants`. Dynamic theming (Light/Dark mode) is handled transparently through `useTheme()`.
