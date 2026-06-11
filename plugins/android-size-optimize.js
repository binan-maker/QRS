/**
 * android-size-optimize.js
 *
 * Reduces APK/AAB size by configuring Android Gradle for:
 *
 * 1. resConfigs ("en","hi","ml","ta","te") — strips locale resources for
 *    every language the app does NOT support.  React Native, Firebase, and
 *    Google Play Services each bundle locale strings for ~80 languages; this
 *    keeps only the 5 BinRo ships.  Savings: 10–30 MB installed / 3–5 MB DL.
 *
 * 2. aaptOptions.cruncherEnabled = true — re-compresses PNG assets at build
 *    time using AAPT2's lossless PNG cruncher.
 *
 * 3. Enables splits for density so the AAB only delivers the screen-density
 *    resources each device actually needs (hdpi / xhdpi / xxhdpi / xxxhdpi).
 *    This has no effect on the install size reported in Play Console, but
 *    reduces the per-device download by ~1–3 MB.
 *
 * 4. Sets javaMaxHeapSize for the Gradle daemon — prevents OOM during the
 *    R8 full-mode optimisation pass on lower-memory build machines.
 */

const { withAppBuildGradle } = require("@expo/config-plugins");

function withAndroidSizeOptimize(config) {
  return withAppBuildGradle(config, (cfg) => {
    let gradle = cfg.modResults.contents;

    // ── 1. Language/locale resource filter ────────────────────────────────
    // Insert resConfigs inside defaultConfig { … } if not already present.
    if (!gradle.includes("resConfigs")) {
      gradle = gradle.replace(
        /(defaultConfig\s*\{[^}]*)(versionName[^\n]*\n)/,
        (match, before, versionLine) =>
          `${before}${versionLine}` +
          `        resConfigs "en", "hi", "ml", "ta", "te"\n`
      );
    }

    // ── 2. PNG cruncher ───────────────────────────────────────────────────
    // Add aaptOptions block right before the buildTypes block.
    if (!gradle.includes("cruncherEnabled")) {
      gradle = gradle.replace(
        /(buildTypes\s*\{)/,
        `aaptOptions {\n        cruncherEnabled = true\n    }\n\n    $1`
      );
    }

    // ── 3. Density splits for AAB / APK ───────────────────────────────────
    // Adds a splits {} block so each device download only includes its density.
    if (!gradle.includes("splits {")) {
      gradle = gradle.replace(
        /(buildTypes\s*\{)/,
        `splits {\n` +
        `        density {\n` +
        `            enable true\n` +
        `            reset()\n` +
        `            include "mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi"\n` +
        `            compatibleScreens "small", "normal", "large", "xlarge"\n` +
        `        }\n` +
        `    }\n\n    $1`
      );
    }

    // ── 4. Gradle daemon heap size ─────────────────────────────────────────
    // Only add if not already set.
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
