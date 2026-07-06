/**
 * android-abi-filter.js
 *
 * THE #1 APK size reducer: strips x86 / x86_64 native libraries.
 *
 * A universal APK ships native .so files for all 4 ABIs:
 *   arm64-v8a, armeabi-v7a, x86, x86_64
 * Every library (React Native, Firebase, Reanimated, Camera, Gesture Handler,
 * etc.) is duplicated 4×, so native libs alone account for 80–120 MB.
 *
 * x86 / x86_64 are EMULATOR-ONLY ABIs. Zero real user devices need them.
 * Removing them cuts native lib bulk roughly in half.
 *
 * ABIs kept:
 *   arm64-v8a   → all modern 64-bit Android phones (95 %+ of active devices)
 *   armeabi-v7a → older 32-bit phones (compatibility fallback)
 *
 * Savings: ~60–80 MB from a typical React Native APK.
 *          On Play Store (AAB), each device receives only its ABI slice,
 *          bringing the download size down to ~15–20 MB.
 */

const { withAppBuildGradle } = require("expo/config-plugins");

function withAndroidAbiFilter(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;

    // ── 1. ABI filter in defaultConfig ────────────────────────────────────
    // Restricts which native library folders are packaged into the APK.
    // Expo prebuild places versionName inside defaultConfig — we inject
    // the ndk block immediately after it.
    if (!gradle.includes("abiFilters")) {
      gradle = gradle.replace(
        /(versionName\s+"[^"]*")/,
        `$1\n        ndk {\n            abiFilters "arm64-v8a", "armeabi-v7a"\n        }`
      );
    }

    cfg.modResults.contents = gradle;
    return cfg;
  });
}

module.exports = withAndroidAbiFilter;
