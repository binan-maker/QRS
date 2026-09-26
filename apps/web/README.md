# 🌐 BinRo Web Client (`apps/web`)

Next.js web application companion for the **BinRo** ecosystem. Provides zero-install browser-based QR verification, camera-based scanning, public security inspections, and deep link routing.

---

## 🏗️ Architecture & Directory Overview

```
apps/web/
├── app/
│   ├── qr/[code]/            # Server-rendered QR safety inspections and community reports
│   │   ├── page.tsx          # Data fetcher & share code decoder
│   │   ├── QrVerificationView.tsx # Responsive client-side verification UI
│   │   └── qr.module.css     # Mobile-first and desktop layout styles
│   │
│   ├── scanner/              # In-browser QR camera scanner
│   │   ├── page.tsx          # Scanner layout entry point
│   │   ├── ScannerView.tsx   # Video frame decoder (jsQR + BarcodeDetector API)
│   │   └── scanner.module.css # Viewfinder styling & animated scanner line
│   │
│   ├── profile/              # User account session check and sign-out
│   ├── download/             # App store links and download instructions
│   ├── api/health/supabase/  # Diagnostic Supabase database connectivity probe
│   ├── layout.tsx            # Global HTML document and metadata
│   ├── globals.css           # Global typography, color tokens, and animations
│   └── page.tsx              # Home landing hero and quick action card
│
└── lib/
    ├── qr-data.ts            # Supabase database access layer for qr_codes & qr_comments
    ├── qr-client.ts          # Client-side mutations, subscriptions, and comment threading
    ├── qr-share.ts           # Share code encoder / decoder (Base62 to hex conversion)
    └── supabase.ts           # Supabase client singleton & environment configuration validator
```

---

## 🗄️ Database Integration

The web companion directly queries the canonical PostgreSQL schema hosted in Supabase:
- `public.qr_codes`: Retrieves decoded payload destination, content type, scan counts, and trust scores.
- `public.qr_comments`: Fetches threaded community notes, upvotes, and comments.
- `public.users`: Checks user profiles and session verification status.

---

## 📱 Responsive & Adaptive Layout

- **Mobile Viewports (< 600px)**: Compact navigation, optimized touch targets (minimum 44x44px), full-width card layouts, and bottom navigation bar.
- **Tablet / Desktop Viewports (>= 768px)**: Centered containers with max-width boundaries, modal sheet centering, and spacious grid cards.
- **Universal Cross-Browser Video**: Employs the native `BarcodeDetector` API when available, seamlessly falling back to `jsQR` via canvas frame buffers for universal iOS and Android mobile browser compatibility.

---

## 🚀 Running the Web Application

```bash
# Start Next.js development server
npm run dev --workspace=apps/web

# Build production bundle
npm run build --workspace=apps/web

# Typecheck
npm run typecheck --workspace=apps/web
```
