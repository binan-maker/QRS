# 📱 Application Features (`/features`)

Domain-driven feature modules encapsulating user interface screens, custom hooks, subcomponents, and local view models.

---

## Directory Organization

```
/features
├── auth/           # Login, registration, password recovery, and OTP verification
├── home/           # Main dashboard, Hero scan card, and quick scan metrics
├── scanner/        # Live camera viewfinder, custom overlay graphics, low-light assist
├── qr-detail/      # In-depth QR report view, community comments, safety badges
├── history/        # Filterable scan log, date aggregations, search filters
├── search/         # Unified query interface for codes and user profiles
├── favorites/      # Bookmarked and pinned QR entries
├── profile/        # User profile editor, image cropper modal, public profile view
├── account/        # Email settings, data exports, account deletion flows
├── settings/       # Dark/light theme toggles, notification options, startup view preferences
├── legal/          # Privacy policy, terms of service, and trust score transparency docs
└── index.ts        # Master export for all features
```
