# 🔌 Expo Config Plugins (`/plugins`)

Custom Expo configuration plugins applied during native compilation (`npx expo prebuild` and EAS Build).

---

## Plugin Manifest

- **`android-size-optimize.js`**: Strips unreferenced locales and native ABIs from production Android APK/AAB bundles.
- **`android-abi-filter.js`**: Restricts native binary architectures to ARM targets (`armeabi-v7a`, `arm64-v8a`) to minimize download footprint.
- **`android-r8.js`**: Enforces strict ProGuard/R8 code shrinking and optimization.
- **`android-device-compat.js`**: Handles edge-to-edge system insets and backward compatibility across Android API levels 26 through 35+.
- **`android-font-filter.js`**: Bundles only actively referenced Inter typeface weights.
- **`android-network-security.js`**: Sets explicit network security configurations.
- **`ios-modular-headers.js`**: Configures CocoaPods podfile settings for modular framework compatibility.
- **`ios-size-optimize.js`**: Configures asset catalog compression and dead code stripping for iOS builds.
