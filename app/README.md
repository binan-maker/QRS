# 🧭 Navigation Routing (`/app`)

File-system based routing powered by **Expo Router**. Implements the Thin Route Adapter pattern to cleanly separate routing configuration from view implementations.

---

## Route Structure

```
/app
├── _layout.tsx                     # Global providers (theme, auth, keyboard, splash screen gate)
├── +not-found.tsx                  # Fallback 404 screen
├── +native-intent.tsx              # Deep link resolution and routing
│
├── (tabs)/                         # Persistent bottom-bar navigation
│   ├── _layout.tsx                 # Tab bar rendering, icons, and animated hide/show behaviors
│   ├── index.tsx                   # Home screen route adapter
│   ├── scanner.tsx                 # Scanner screen route adapter
│   ├── history.tsx                 # History screen route adapter
│   ├── profile.tsx                 # Profile screen route adapter
│   └── settings.tsx                # Settings screen route adapter
│
├── (auth)/                         # Authentication flows
│   ├── _layout.tsx                 # Auth stack transition configurations
│   ├── login.tsx                   # User authentication
│   ├── register.tsx                # Account creation
│   ├── forgot-password.tsx         # Password reset request
│   └── verify-email.tsx            # Email confirmation OTP
│
├── (account)/                      # Account management & discovery
│   ├── account-management.tsx      # Email updates and account deletion
│   ├── favorites.tsx               # Starred QR codes
│   ├── privacy-settings.tsx        # Privacy toggles
│   └── search.tsx                  # Discovery search
│
├── (qr)/                           # QR verification views
│   └── qr-detail/[id].tsx          # Dynamic QR inspector by ID
│
├── (legal)/                        # Informational & compliance views
│   ├── how-it-works.tsx            # Platform mechanics
│   ├── privacy-policy.tsx          # Privacy policy
│   ├── terms.tsx                   # Terms of service
│   └── trust-scores.tsx            # Score calculation transparency
│
├── profile/[username].tsx          # Deep-linkable public profile by handle
└── qr/[code].tsx                   # Universal link handler for https://binro.in/qr/:code
```
