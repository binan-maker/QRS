/**
 * ios-size-optimize.js
 *
 * Reduces the iOS app's download and install size via Xcode build settings
 * applied to the Release configuration. Equivalent in intent to the Android
 * size optimizations in android-size-optimize.js.
 *
 * Settings applied to Release builds only:
 *
 * 1. SWIFT_OPTIMIZATION_LEVEL = -Osize
 *    Instructs the Swift compiler to optimize for binary size instead of speed.
 *    Typical savings: 5–15% on Swift-heavy modules (Firebase, Google Sign-In).
 *
 * 2. SWIFT_COMPILATION_MODE = wholemodule
 *    Compiles the entire Swift module in one pass, enabling cross-file dead code
 *    elimination. Required for -Osize to have maximum effect.
 *
 * 3. GCC_OPTIMIZATION_LEVEL = s
 *    Optimize ObjC / C code for size (equivalent to clang's -Os).
 *
 * 4. LLVM_LTO = YES_THIN
 *    Thin Link-Time Optimization: lets the linker eliminate dead code across
 *    translation unit boundaries without the full-LTO compile-time cost.
 *    Typical savings: 5–20% on the linked binary.
 *
 * 5. DEAD_CODE_STRIPPING = YES
 *    Instructs the linker to remove unreachable code sections (Mach-O sections
 *    with the "dead strip" flag). Complements LTO.
 *
 * 6. STRIP_INSTALLED_PRODUCT = YES + STRIP_STYLE = all
 *    Strips all debug symbols from the final .app before archiving/uploading.
 *    Symbols are preserved in the dSYM bundle for crash symbolication.
 *    Typical savings: 10–30 MB from the download size.
 *
 * 7. COMPRESS_PNG_FILES = YES
 *    Re-compresses PNG assets with Apple's pngcrush at build time (lossless).
 *    Typical savings: 5–10% of asset size.
 *
 * 8. VALIDATE_PRODUCT = YES
 *    Catches signing / entitlement mismatches during the build, not at
 *    TestFlight upload time. No size impact; prevents wasted EAS build minutes.
 *
 * Applied to ALL configurations (Debug + Release):
 *
 * 9. ENABLE_BITCODE = NO
 *    Bitcode was deprecated by Apple in Xcode 14 and removed in Xcode 16.
 *    Enabling it forces the compiler to emit extra LLVM IR sections, bloating
 *    the archive by ~10 MB with no benefit on modern Xcode/EAS builds.
 */

const { withXcodeProject } = require("expo/config-plugins");

// Applied to Release configuration only
const RELEASE_SETTINGS = {
  SWIFT_OPTIMIZATION_LEVEL: '"-Osize"',
  SWIFT_COMPILATION_MODE: '"wholemodule"',
  GCC_OPTIMIZATION_LEVEL: '"s"',
  LLVM_LTO: '"YES_THIN"',
  DEAD_CODE_STRIPPING: "YES",
  STRIP_INSTALLED_PRODUCT: "YES",
  STRIP_STYLE: '"all"',
  COMPRESS_PNG_FILES: "YES",
  VALIDATE_PRODUCT: "YES",
};

// Applied to every configuration (bitcode is harmful even in Debug)
const ALL_CONFIG_SETTINGS = {
  ENABLE_BITCODE: "NO",
};

function withIosSizeOptimize(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const configurations = project.pbxXCBuildConfigurationSection();

    for (const key of Object.keys(configurations)) {
      const buildConfig = configurations[key];

      // Skip the section metadata entries (plain strings / comments)
      if (
        !buildConfig ||
        typeof buildConfig !== "object" ||
        !buildConfig.buildSettings
      ) {
        continue;
      }

      const bs = buildConfig.buildSettings;

      // Apply to every configuration
      for (const [k, v] of Object.entries(ALL_CONFIG_SETTINGS)) {
        bs[k] = v;
      }

      // Apply size settings only to Release
      if (buildConfig.name === "Release") {
        for (const [k, v] of Object.entries(RELEASE_SETTINGS)) {
          // Only set if not already explicitly configured by the project
          if (bs[k] === undefined) {
            bs[k] = v;
          }
        }
      }
    }

    return cfg;
  });
}

module.exports = withIosSizeOptimize;
