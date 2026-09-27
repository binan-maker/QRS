/**
 * android-font-filter.js
 *
 * After expo prebuild copies ALL @expo/vector-icons fonts (~3.9 MB) into
 * android/app/src/main/assets/fonts/, this plugin deletes every font that
 * BinRo does NOT use, leaving only the two families that are actually
 * imported in the codebase.
 *
 * Fonts KEPT  (actually imported):
 *   - Ionicons.ttf              (~384 KB) — used app-wide
 *   - MaterialCommunityIcons.ttf (~1.3 MB) — used in scanner/tabs/profile
 *
 * Fonts REMOVED (never imported, dead weight):
 *   - AntDesign, Entypo, EvilIcons, Feather, FontAwesome, FontAwesome5_*,
 *     FontAwesome6_*, Fontisto, Foundation, MaterialIcons, Octicons,
 *     SimpleLineIcons, Zocial  (~2.35 MB total)
 *
 * Savings: ~2.35 MB installed / ~0.7 MB compressed download.
 *
 * Safe to update: if a developer later imports a new icon family, add its
 * font filename(s) to FONTS_TO_KEEP below — the plugin will preserve them.
 */

const { withDangerousMod } = require("expo/config-plugins");
const fs = require("fs");
const path = require("path");

// The ONLY font files BinRo needs. Every other .ttf in the assets/fonts dir
// will be deleted. Add filenames here if you import a new icon set.
const FONTS_TO_KEEP = new Set([
  "Ionicons.ttf",
  "MaterialCommunityIcons.ttf",
]);

function withAndroidFontFilter(config) {
  return withDangerousMod(config, [
    "android",
    async (cfg) => {
      const fontsDir = path.join(
        cfg.modRequest.platformProjectRoot,
        "app",
        "src",
        "main",
        "assets",
        "fonts"
      );

      if (!fs.existsSync(fontsDir)) {
        // fonts dir not created yet — nothing to do
        return cfg;
      }

      const files = fs.readdirSync(fontsDir);
      let removed = 0;
      let removedBytes = 0;

      for (const file of files) {
        if (!file.endsWith(".ttf") && !file.endsWith(".otf")) continue;
        if (FONTS_TO_KEEP.has(file)) continue;

        const filePath = path.join(fontsDir, file);
        try {
          const stat = fs.statSync(filePath);
          removedBytes += stat.size;
          fs.unlinkSync(filePath);
          removed++;
        } catch {
          // ignore — file might already be gone
        }
      }

      if (removed > 0) {
        console.log(
          `[android-font-filter] Removed ${removed} unused font file(s) ` +
          `(${(removedBytes / 1024).toFixed(0)} KB saved).`
        );
      }

      return cfg;
    },
  ]);
}

module.exports = withAndroidFontFilter;
