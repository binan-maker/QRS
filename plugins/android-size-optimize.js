/**
 * android-size-optimize.js
 *
 * Reduces APK/AAB size via several Gradle-level strategies:
 *
 * 1. resConfigs — keep only the 5 languages BinRo ships.
 *    React Native + Firebase + GMS each bundle ~80 locale string files.
 *    Savings: 10–30 MB installed / 3–5 MB download.
 *
 * 2. useLegacyPackaging = false — companion to android:extractNativeLibs=false
 *    in the manifest. Tells AGP 8+ to pack .so files compressed into the AAB.
 *    Savings: ~15–20 MB installed (no second extracted copy on device).
 *
 * 3. NativeDebugSymbols stripped — release builds never need debug symbols
 *    inside the .so files; stripping them saves ~5–10 MB download.
 *
 * 4. Packaging exclusions — removes META-INF/*, license text, redundant
 *    Kotlin metadata, and duplicate native libs that sneak in from transitive
 *    deps. Saves ~1–3 MB.
 *
 * 5. aaptOptions cruncherEnabled — lossless PNG re-compression at build time.
 *
 * 6. ABI + Density splits — generate separate APKs per CPU arch and screen
 *    density.  Only arm64-v8a and armeabi-v7a are included (x86/x86_64 are
 *    emulator-only).  universalApk false ensures no bloated catch-all APK.
 *    Play Store AAB automatically applies these splits per device.
 *    Savings: ~60–80 MB (ABI) + 1–3 MB (density) per device.
 *
 * 7. dexOptions heap — prevents OOM during R8 full-mode pass.
 *
 * 8. Expanded packaging exclusions — strips protos, *.proto, version files,
 *    service loader configs and other dead bytes that creep in from Firebase
 *    and Kotlin transitive deps.
 */

const { withAppBuildGradle } = require("@expo/config-plugins");

function withAndroidSizeOptimize(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;

    // ── 1. Language/locale resource filter ────────────────────────────────
    if (!gradle.includes("resConfigs")) {
      gradle = gradle.replace(
        /(defaultConfig\s*\{[^}]*)(versionName[^\n]*\n)/,
        (match, before, versionLine) =>
          `${before}${versionLine}` +
          `        resConfigs "en", "hi", "ml", "ta", "te"\n`
      );
    }

    // ── 2. useLegacyPackaging = false (compressed .so in AAB) ─────────────
    // AGP 8+ equivalent of android:extractNativeLibs="false".
    // Combined with the manifest flag, this eliminates the on-device copy.
    if (!gradle.includes("useLegacyPackaging")) {
      gradle = gradle.replace(
        /(buildTypes\s*\{)/,
        `packagingOptions {\n` +
        `        jniLibs {\n` +
        `            useLegacyPackaging = false\n` +
        `        }\n` +
        `        // Strip redundant files that bloat the APK\n` +
        `        resources {\n` +
        `            excludes += [\n` +
        `                "META-INF/*.kotlin_module",\n` +
        `                "META-INF/MANIFEST.MF",\n` +
        `                "META-INF/LICENSE",\n` +
        `                "META-INF/LICENSE.txt",\n` +
        `                "META-INF/NOTICE",\n` +
        `                "META-INF/NOTICE.txt",\n` +
        `                "META-INF/*.version",\n` +
        `                "META-INF/AL2.0",\n` +
        `                "META-INF/LGPL2.1",\n` +
        `                "META-INF/proguard/**",\n` +
        `                "META-INF/services/**",\n` +
        `                "androidsupportmultidexversion.txt",\n` +
        `                "**/*.proto",\n` +
        `                "**/*.txt",\n` +
        `                "**/*.md",\n` +
        `                "DebugProbesKt.bin"\n` +
        `            ]\n` +
        `        }\n` +
        `    }\n\n    $1`
      );
    }

    // ── 3. Strip native debug symbols in release ───────────────────────────
    // debugSymbolLevel "none" removes DWARF sections from .so files.
    // This only affects the build machine; crash reports still work via
    // Play Console's deobfuscation mapping file.
    if (!gradle.includes("debugSymbolLevel")) {
      gradle = gradle.replace(
        /(release\s*\{[^}]*minifyEnabled)/,
        `release {\n            debugSymbolLevel "none"\n            // ` +
        `↓ rest of release block follows\n            minifyEnabled`
      );
    }

    // ── 4. PNG cruncher ───────────────────────────────────────────────────
    if (!gradle.includes("cruncherEnabled")) {
      gradle = gradle.replace(
        /(buildTypes\s*\{)/,
        `aaptOptions {\n        cruncherEnabled = true\n    }\n\n    $1`
      );
    }

    // ── 5. ABI + Density splits ───────────────────────────────────────────
    // ABI splits: separate APKs per CPU arch — Play Store serves only the
    // arch the device needs (universalApk false = no bloated catch-all APK).
    // Density splits: separate APKs per screen density bucket.
    // Combined with the ndk.abiFilters in android-abi-filter.js (which already
    // strips x86/x86_64 at compile time), this maximises per-device savings.
    if (!gradle.includes("splits {")) {
      gradle = gradle.replace(
        /(buildTypes\s*\{)/,
        `splits {\n` +
        `        abi {\n` +
        `            enable true\n` +
        `            reset()\n` +
        `            include "arm64-v8a", "armeabi-v7a"\n` +
        `            universalApk false\n` +
        `        }\n` +
        `        density {\n` +
        `            enable true\n` +
        `            reset()\n` +
        `            include "mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"\n` +
        `            compatibleScreens "small", "normal", "large", "xlarge"\n` +
        `        }\n` +
        `    }\n\n    $1`
      );
    }

    // ── 6. Gradle daemon heap ─────────────────────────────────────────────
    if (!gradle.includes("javaMaxHeapSize")) {
      gradle = gradle.replace(
        /(android\s*\{)/,
        `$1\n    dexOptions {\n        javaMaxHeapSize "4g"\n    }\n`
      );
    }

    cfg.modResults.contents = gradle;
    return cfg;
  });
}

module.exports = withAndroidSizeOptimize;
