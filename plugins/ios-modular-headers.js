/**
 * ios-modular-headers.js
 *
 * Fixes the CocoaPods build error:
 *   "The Swift pod `AppCheckCore` depends upon `GoogleUtilities` and
 *    `RecaptchaInterop`, which do not define modules."
 *
 * Root cause:
 *   Firebase's `AppCheckCore` is a Swift static library. It imports
 *   `GoogleUtilities` and `RecaptchaInterop`, which are pure Objective-C pods
 *   that don't generate module maps by default. Swift cannot import them
 *   without a module map, so `pod install` fails.
 *
 * Fix:
 *   Adding `use_modular_headers!` to the Podfile tells CocoaPods to generate
 *   module maps for ALL pods, making every Objective-C pod importable from
 *   Swift. This is the approach recommended by the CocoaPods error message
 *   itself and is the standard fix for Firebase + Swift static library setups.
 *
 * This plugin runs during `expo prebuild` (after the ios/ folder is generated)
 * and patches the Podfile before `pod install` runs.
 */

const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

function withIosModularHeaders(config) {
  return withDangerousMod(config, [
    "ios",
    async (config) => {
      const podfilePath = path.join(
        config.modRequest.platformProjectRoot,
        "Podfile"
      );

      if (!fs.existsSync(podfilePath)) {
        console.warn("[ios-modular-headers] Podfile not found — skipping.");
        return config;
      }

      let podfile = fs.readFileSync(podfilePath, "utf8");

      if (podfile.includes("use_modular_headers!")) {
        // Already patched — nothing to do.
        console.log("[ios-modular-headers] `use_modular_headers!` already present — skipping.");
        return config;
      }

      // Match the `platform :ios, <anything>` line robustly.
      // Expo-generated Podfiles may use:
      //   platform :ios, '15.1'
      //   platform :ios, "15.1"
      //   platform :ios, podfile_properties['ios.deploymentTarget'] || '15.1'
      // The regex captures the whole line regardless of what follows the comma.
      const platformLineRegex = /^(platform\s+:ios\b.*)$/m;

      if (!platformLineRegex.test(podfile)) {
        // Could not locate the platform line — insert at the very top as a
        // safe fallback so use_modular_headers! is always declared.
        console.warn(
          "[ios-modular-headers] Could not find `platform :ios` line. " +
            "Prepending `use_modular_headers!` to Podfile as fallback."
        );
        podfile = "use_modular_headers!\n" + podfile;
      } else {
        podfile = podfile.replace(
          platformLineRegex,
          "$1\nuse_modular_headers!"
        );
      }

      fs.writeFileSync(podfilePath, podfile);
      console.log(
        "[ios-modular-headers] Successfully added `use_modular_headers!` to Podfile."
      );

      return config;
    },
  ]);
}

module.exports = withIosModularHeaders;
