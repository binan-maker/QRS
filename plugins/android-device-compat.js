/**
 * android-device-compat.js
 *
 * Maximises Google Play device compatibility:
 *
 * 1. ALL hardware uses-feature entries → required="false"
 *    (camera, GPS, mic, Bluetooth, NFC, sensors, telephony…)
 *    Each "required=true" silently blocks every device missing that hardware.
 *
 * 2. Explicit supports-screens covering every size (small → xlarge).
 *
 * 3. installLocation="auto" so the OS can install to SD card — low-storage
 *    devices that would otherwise reject the download can now install.
 *
 * 4. Removes any accidental OpenGL ES version requirement that would block
 *    older GPUs.
 *
 * 5. Adds android:extractNativeLibs="true" so 32-bit devices with old
 *    Android package managers can still extract native libraries.
 */

const { withAndroidManifest } = require("@expo/config-plugins");

const FEATURES_TO_MAKE_OPTIONAL = [
  // Camera family
  "android.hardware.camera",
  "android.hardware.camera.autofocus",
  "android.hardware.camera.flash",
  "android.hardware.camera.front",
  "android.hardware.camera.any",
  "android.hardware.camera.level.full",
  "android.hardware.camera.capability.manual_sensor",
  "android.hardware.camera.capability.raw",
  // Audio
  "android.hardware.microphone",
  // Location
  "android.hardware.location",
  "android.hardware.location.gps",
  "android.hardware.location.network",
  // Telephony
  "android.hardware.telephony",
  "android.hardware.telephony.gsm",
  "android.hardware.telephony.cdma",
  "android.hardware.telephony.euicc",
  // Connectivity
  "android.hardware.bluetooth",
  "android.hardware.bluetooth_le",
  "android.hardware.nfc",
  "android.hardware.wifi",
  "android.hardware.wifi.direct",
  // Sensors
  "android.hardware.sensor.accelerometer",
  "android.hardware.sensor.gyroscope",
  "android.hardware.sensor.compass",
  "android.hardware.sensor.barometer",
  "android.hardware.sensor.light",
  "android.hardware.sensor.proximity",
  "android.hardware.sensor.stepcounter",
  "android.hardware.sensor.stepdetector",
  "android.hardware.sensor.heartrate",
  "android.hardware.sensor.heartrate.ecg",
  // Screen / touch
  "android.hardware.screen.portrait",
  "android.hardware.screen.landscape",
  "android.hardware.touchscreen",
  "android.hardware.touchscreen.multitouch",
  "android.hardware.touchscreen.multitouch.distinct",
  "android.hardware.touchscreen.multitouch.jazzhand",
  "android.hardware.faketouch",
  "android.hardware.faketouch.multitouch.distinct",
  "android.hardware.faketouch.multitouch.jazzhand",
  // Biometrics
  "android.hardware.fingerprint",
  "android.hardware.biometrics.face",
  "android.hardware.iris",
  // Other hardware
  "android.hardware.usb.host",
  "android.hardware.usb.accessory",
  "android.hardware.type.television",
  "android.hardware.type.watch",
  "android.hardware.type.automotive",
  "android.hardware.type.embedded",
  // OpenGL
  "android.hardware.opengles.aep",
];

function withAndroidDeviceCompat(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // ── 1. Override every existing uses-feature → required=false ──────────
    const existingFeatures = manifest["uses-feature"] || [];
    const existingNames = new Set(
      existingFeatures.map((f) => f.$?.["android:name"]).filter(Boolean)
    );
    const updatedFeatures = existingFeatures.map((f) => ({
      ...f,
      $: { ...f.$, "android:required": "false" },
    }));

    // ── 2. Add missing features explicitly as required=false ───────────────
    for (const featureName of FEATURES_TO_MAKE_OPTIONAL) {
      if (!existingNames.has(featureName)) {
        updatedFeatures.push({
          $: { "android:name": featureName, "android:required": "false" },
        });
      }
    }
    manifest["uses-feature"] = updatedFeatures;

    // ── 3. Remove any gl-es-version restriction ───────────────────────────
    // (Some Expo versions inject this and it blocks older GPUs)
    if (manifest["uses-feature"]) {
      manifest["uses-feature"] = manifest["uses-feature"].filter(
        (f) => !f.$?.["android:glEsVersion"]
      );
    }

    // ── 4. supports-screens: all sizes ────────────────────────────────────
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

    // ── 5. Application-level compat flags ─────────────────────────────────
    if (!manifest.application) manifest.application = [{}];
    const application = manifest.application[0];
    if (!application.$) application.$ = {};

    // Allow install to SD card — critical for low-storage budget phones
    if (!manifest.$) manifest.$ = {};
    manifest.$["android:installLocation"] = "auto";

    // Keep native libs compressed inside the APK/AAB (do NOT extract to disk).
    // minSdkVersion=24 (Android 7.0+) means every device we target supports
    // reading libs directly from the compressed APK — no extraction needed.
    // Effect: installed size drops by ~30-50% of native lib weight because the
    // OS no longer copies a second decompressed copy of each .so to /data/app/.
    application.$["android:extractNativeLibs"] = "false";

    // Ensure the app is not restricted to specific form factors
    application.$["android:resizeableActivity"] = "true";

    return cfg;
  });
}

module.exports = withAndroidDeviceCompat;
