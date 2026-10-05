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
 * Fix strategy — ordered by preference:
 *
 *   1. If `use_frameworks! :linkage => :static` is already in the Podfile
 *      (added by expo-build-properties `ios.useFrameworks: "static"`), it
 *      implicitly enables module maps for all pods. In that case this plugin
 *      does nothing — adding `use_modular_headers!` alongside `use_frameworks!`
 *      causes CocoaPods to emit a conflicting-directives warning.
 *
 *   2. Otherwise, insert `use_modular_headers!` immediately after the
 *      `platform :ios, …` declaration. This tells CocoaPods to generate
 *      module maps for every pod so ObjC pods are importable from Swift.
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

      // If use_frameworks! is already present (added by expo-build-properties
      // useFrameworks: "static"), module maps are already handled. Adding
      // use_modular_headers! on top would trigger a CocoaPods warning.
      if (podfile.includes("use_frameworks!")) {
        console.log(
          "[ios-modular-headers] `use_frameworks!` already present — " +
            "module maps are handled; skipping `use_modular_headers!`."
        );
        return config;
      }

      if (podfile.includes("use_modular_headers!")) {
        console.log(
          "[ios-modular-headers] `use_modular_headers!` already present — skipping."
        );
        return config;
      }

      // Match the `platform :ios, <anything>` line robustly.
      // Expo-generated Podfiles may use:
      //   platform :ios, '15.1'
      //   platform :ios, "15.1"
      //   platform :ios, podfile_properties['ios.deploymentTarget'] || '15.1'
      const platformLineRegex = /^(platform\s+:ios\b.*)$/m;
      let patched = false;

      if (platformLineRegex.test(podfile)) {
        podfile = podfile.replace(platformLineRegex, "$1\nuse_modular_headers!");
        patched = true;
      } else {
        // Fallback: prepend to the file so the directive is always declared.
        console.warn(
          "[ios-modular-headers] Could not find `platform :ios` line. " +
            "Prepending `use_modular_headers!` as fallback."
        );
        podfile = "use_modular_headers!\n" + podfile;
        patched = true;
      }

      if (patched) {
        fs.writeFileSync(podfilePath, podfile);
        console.log(
          "[ios-modular-headers] Successfully added `use_modular_headers!` to Podfile."
        );
      }

      return config;
    },
  ]);
}

module.exports = withIosModularHeaders;
