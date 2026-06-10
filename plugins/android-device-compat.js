/**
 * android-device-compat.js
 *
 * Maximises Google Play device compatibility by:
 *
 * 1. Overriding all hardware `uses-feature` entries to required="false"
 *    so devices without a camera, GPS, microphone, etc. can still install
 *    the app.  The app handles missing hardware gracefully at runtime.
 *
 * 2. Adding explicit `supports-screens` to cover every screen size from
 *    small phones to large tablets.
 *
 * 3. Removing the telephony implicit requirement that some permissions
 *    add automatically.
 *
 * Why this matters: Android's build toolchain silently adds
 *   <uses-feature android:name="..." android:required="true" />
 * for many permissions (CAMERA, RECORD_AUDIO, ACCESS_FINE_LOCATION, …).
 * Each "required=true" feature blocks ALL devices that lack that hardware
 * from even seeing the app in the Play Store.
 */

const { withAndroidManifest } = require("@expo/config-plugins");

const FEATURES_TO_MAKE_OPTIONAL = [
  "android.hardware.camera",
  "android.hardware.camera.autofocus",
  "android.hardware.camera.flash",
  "android.hardware.camera.front",
  "android.hardware.camera.any",
  "android.hardware.camera.level.full",
  "android.hardware.microphone",
  "android.hardware.location",
  "android.hardware.location.gps",
  "android.hardware.location.network",
  "android.hardware.telephony",
  "android.hardware.telephony.gsm",
  "android.hardware.telephony.cdma",
  "android.hardware.bluetooth",
  "android.hardware.bluetooth_le",
  "android.hardware.nfc",
  "android.hardware.sensor.accelerometer",
  "android.hardware.sensor.gyroscope",
  "android.hardware.sensor.compass",
  "android.hardware.sensor.barometer",
  "android.hardware.sensor.light",
  "android.hardware.sensor.proximity",
  "android.hardware.sensor.stepcounter",
  "android.hardware.sensor.stepdetector",
  "android.hardware.wifi",
  "android.hardware.screen.portrait",
  "android.hardware.screen.landscape",
  "android.hardware.touchscreen",
  "android.hardware.touchscreen.multitouch",
  "android.hardware.touchscreen.multitouch.distinct",
  "android.hardware.touchscreen.multitouch.jazzhand",
  "android.hardware.fingerprint",
  "android.hardware.biometrics.face",
];

function withAndroidDeviceCompat(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // ── 1. Collect all existing uses-feature entries ──────────────────────
    const existingFeatures = manifest["uses-feature"] || [];
    const existingNames = new Set(
      existingFeatures.map((f) => f.$?.["android:name"]).filter(Boolean)
    );

    // ── 2. Override every existing feature to required=false ──────────────
    const updatedFeatures = existingFeatures.map((f) => ({
      ...f,
      $: { ...f.$, "android:required": "false" },
    }));

    // ── 3. Add any missing features explicitly as required=false ──────────
    for (const featureName of FEATURES_TO_MAKE_OPTIONAL) {
      if (!existingNames.has(featureName)) {
        updatedFeatures.push({
          $: { "android:name": featureName, "android:required": "false" },
        });
      }
    }

    manifest["uses-feature"] = updatedFeatures;

    // ── 4. Ensure supports-screens covers all sizes ───────────────────────
    manifest["supports-screens"] = [
      {
        $: {
          "android:smallScreens": "true",
          "android:normalScreens": "true",
          "android:largeScreens": "true",
          "android:xlargeScreens": "true",
          "android:anyDensity": "true",
          "android:resizeable": "true",
        },
      },
    ];

    return cfg;
  });
}

module.exports = withAndroidDeviceCompat;
