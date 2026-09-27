# 🩹 Dependency Patches (`/patches`)

Targeted source patches applied automatically during `npm postinstall` via `patch-package` to resolve upstream compatibility issues.

---

## Patch Inventory

- **`expo++expo-asset+12.0.13.patch`**: Resolves asset resolution and packaging edge cases under React 19 concurrent rendering.
- **`react-native+0.81.5.patch`**: Fixes full-bleed edge-to-edge system navigation bar rendering artifacts on Android 14 and 15 devices.
