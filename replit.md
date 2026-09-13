# BinRo — QR Code Verification Platform

India-focused QR code security app with real-time fraud detection, community trust scoring, and UPI/BharatQR parsing.

## Stack

| Layer | Tech |
|---|---|
| Mobile app | Expo / React Native (expo-router) |
| Backend API | Express 5 + TypeScript (tsx) |
| Web dashboard | Next.js (apps/web) |
| Database | Cloud Firestore |
| Auth | Firebase Authentication |
| Storage | Firebase Cloud Storage |
| Realtime | Firebase Realtime Database |

## Running the project

| Workflow | Command |
|---|---|
| Start Backend | `npm run server:dev` → port 5000 |
| Start Frontend | `npm run expo:dev` → Metro bundler port 8081 |

## Environment variables

Public client configuration:

- `EXPO_PUBLIC_FIREBASE_API_KEY`
- `EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN`
- `EXPO_PUBLIC_FIREBASE_PROJECT_ID`
- `EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET`
- `EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID`
- `EXPO_PUBLIC_FIREBASE_APP_ID`
- `NEXT_PUBLIC_FIREBASE_*` equivalents for the web dashboard

Server-only configuration:

- `FIREBASE_SERVICE_ACCOUNT` — Firebase service-account JSON for Admin SDK access
- `SESSION_SECRET` — optional session/application secret

Firebase client configuration is public by design. Keep the Admin service account in Replit Secrets.

## Firebase setup

The app now uses static individual QR codes only. New client writes reject
dynamic destinations, business QR metadata, redirect history, expiry, and scan
limits. The checked-in `firestore.rules` and `storage.rules` files reflect that
policy; deploy them to the `scan-guard-19a7f` Firebase project after signing in
with the Firebase CLI:

```bash
npx firebase-tools deploy --only firestore:rules,storage --project scan-guard-19a7f
```

The Replit environment contains the public Firebase client configuration. The
Firebase Admin service account is still required for server-side deployment and
trusted data migrations.

## Schema and security

Create the Firestore database, enable Email/Password and Google providers in Firebase Authentication, configure Firestore and Storage security rules, and create the Realtime Database before using production data.

Keep the existing project structure and stack; all application data access goes through the Firebase adapters.