/**
 * android-device-compat.js
 *
 * Maximises Google Play "Install" button visibility across every device form
 * factor in the world.
 *
 * ROOT CAUSE of missing Install button:
 *   Android's build tools silently inject <uses-feature android:required="true">
 *   for every permission that implies hardware.  The Play Store then hides the
 *   Install button on any device that lacks EVEN ONE required feature.
 *   The fix is to declare every possible feature as required="false" — the app
 *   handles missing hardware gracefully at runtime.
 *
 * Coverage:
 *   ① All hardware features (camera, sensors, radios, telephony, I/O…)
 *   ② All software features (TV/leanback, Wear OS, Auto, ChromeOS…)
 *   ③ Amazon Fire OS / Fire TV specific features
 *   ④ supports-screens for every size from small phones to 12-inch tablets
 *   ⑤ installLocation="auto" so low-storage devices can use SD card
 *   ⑥ extractNativeLibs="false" — libs stay compressed, ~15 MB less installed
 *   ⑦ Strips any <compatible-screens> element (acts as an install whitelist)
 *   ⑧ Strips any gl-es-version restriction (blocks older GPUs)
 *   ⑨ Strips any maxSdkVersion cap
 */

const { withAndroidManifest } = require("@expo/config-plugins");

// ── Hardware features ─────────────────────────────────────────────────────────
const HARDWARE_FEATURES = [
  // Camera
  "android.hardware.camera",
  "android.hardware.camera.autofocus",
  "android.hardware.camera.flash",
  "android.hardware.camera.front",
  "android.hardware.camera.any",
  "android.hardware.camera.level.full",
  "android.hardware.camera.capability.manual_sensor",
  "android.hardware.camera.capability.manual_post_processing",
  "android.hardware.camera.capability.raw",
  "android.hardware.camera2.full",
  "android.hardware.camera2.level3",
  // Audio / mic
  "android.hardware.microphone",
  "android.hardware.audio.output",
  "android.hardware.audio.pro",
  "android.hardware.audio.low_latency",
  // Location
  "android.hardware.location",
  "android.hardware.location.gps",
  "android.hardware.location.network",
  // Telephony
  "android.hardware.telephony",
  "android.hardware.telephony.gsm",
  "android.hardware.telephony.cdma",
  "android.hardware.telephony.euicc",
  "android.hardware.telephony.carrierlock",
  "android.hardware.telephony.mbms",
  // Connectivity
  "android.hardware.bluetooth",
  "android.hardware.bluetooth_le",
  "android.hardware.nfc",
  "android.hardware.nfc.hce",
  "android.hardware.nfc.hcef",
  "android.hardware.nfc.ese",
  "android.hardware.nfc.uicc",
  "android.hardware.nfc.any",
  "android.hardware.wifi",
  "android.hardware.wifi.direct",
  "android.hardware.wifi.aware",
  "android.hardware.wifi.passpoint",
  "android.hardware.wifi.rtt",
  "android.hardware.uwb",
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
  "android.hardware.sensor.hinge_angle",
  "android.hardware.sensor.ambient_temperature",
  "android.hardware.sensor.relative_humidity",
  // Screen / touch / input
  "android.hardware.screen.portrait",
  "android.hardware.screen.landscape",
  "android.hardware.touchscreen",
  "android.hardware.touchscreen.multitouch",
  "android.hardware.touchscreen.multitouch.distinct",
  "android.hardware.touchscreen.multitouch.jazzhand",
  "android.hardware.faketouch",
  "android.hardware.faketouch.multitouch.distinct",
  "android.hardware.faketouch.multitouch.jazzhand",
  "android.hardware.gamepad",
  "android.hardware.consumerir",
  // Biometrics
  "android.hardware.fingerprint",
  "android.hardware.biometrics.face",
  "android.hardware.iris",
  // Storage / USB
  "android.hardware.usb.host",
  "android.hardware.usb.accessory",
  // Form factor type hardware
  "android.hardware.type.television",
  "android.hardware.type.watch",
  "android.hardware.type.automotive",
  "android.hardware.type.embedded",
  "android.hardware.type.pc",
  // OpenGL
  "android.hardware.opengles.aep",
  // RAM (low-RAM devices)
  "android.hardware.ram.low",
  "android.hardware.ram.normal",
];

// ── Software features ─────────────────────────────────────────────────────────
// These are the most commonly MISSING from other compatibility fixes.
// Each one covers a distinct device category in the Play Store catalog.
const SOFTWARE_FEATURES = [
  // Android TV / Fire TV / Shield TV / Chromecast with Google TV
  "android.software.leanback",
  "android.software.leanback_only",
  "android.software.live_tv",
  "android.software.live_wallpaper",
  // Wear OS (smartwatches)
  "android.hardware.type.watch",        // also in hardware but explicit here
  // Android Auto / Automotive OS
  "android.software.car.templates_host",
  // Chrome OS / Desktop
  "android.software.chromeos_desktop",
  // Home screen / launcher
  "android.software.home_screen",
  // VR
  "android.software.vr.mode",
  "android.hardware.vr.high_performance",
  "android.hardware.vr.headtracking",
  // App widgets
  "android.software.app_widgets",
  // Input methods
  "android.software.input_methods",
  // Managed users (enterprise / MDM)
  "android.software.managed_users",
  // Companion device
  "android.software.companion_device_setup",
  // Print
  "android.software.print",
  // MIDI
  "android.software.midi",
  // Connection service (VOIP)
  "android.software.connectionservice",
  // SIP
  "android.software.sip",
  "android.software.sip.voip",
  // Freeform windows (large-screen / desktop mode)
  "android.software.freeform_window_management",
  // Picture-in-picture
  "android.software.picture_in_picture",
  // Activities on secondary displays
  "android.software.activities_on_secondary_displays",
  // Vulkan
  "android.hardware.vulkan.level",
  "android.hardware.vulkan.version",
  "android.hardware.vulkan.compute",
];

// ── Amazon Fire OS features ───────────────────────────────────────────────────
// Amazon devices (Fire tablets, Fire TV) use their own feature namespace.
// Without these as optional, Amazon's version of Play Store (App Store)
// and sideloaded APKs on Fire devices may not surface the app correctly.
const AMAZON_FEATURES = [
  "amazon.hardware.fire_tv",
  "amazon.software.drm",
];

const ALL_FEATURES = [...HARDWARE_FEATURES, ...SOFTWARE_FEATURES, ...AMAZON_FEATURES];

function withAndroidDeviceCompat(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // ── ① Collect and override existing uses-feature entries ───────────────
    const existingFeatures = manifest["uses-feature"] || [];
    const existingNames = new Set(
      existingFeatures.map((f) => f.$?.["android:name"]).filter(Boolean)
    );

    // Force every existing entry to required=false
    const updatedFeatures = existingFeatures.map((f) => ({
      ...f,
      $: { ...f.$, "android:required": "false" },
    }));

    // Add every feature in our list that isn't already declared
    for (const featureName of ALL_FEATURES) {
      if (!existingNames.has(featureName)) {
        updatedFeatures.push({
          $: { "android:name": featureName, "android:required": "false" },
        });
      }
    }

    manifest["uses-feature"] = updatedFeatures;

    // ── ② Strip gl-es-version restriction (blocks older GPUs) ─────────────
    manifest["uses-feature"] = manifest["uses-feature"].filter(
      (f) => !f.$?.["android:glEsVersion"]
    );

    // ── ③ Strip <compatible-screens> (acts as an install whitelist) ─────────
    // This element tells Play Store to ONLY show the app on listed screen
    // configs.  Removing it means ALL screen configs are compatible.
    delete manifest["compatible-screens"];

    // ── ④ supports-screens: every size ────────────────────────────────────
    manifest["supports-screens"] = [
      {
        $: {
          "android:smallScreens":  "true",
          "android:normalScreens": "true",
          "android:largeScreens":  "true",
          "android:xlargeScreens": "true",
          "android:anyDensity":    "true",
          "android:resizeable":    "true",
        },
      },
    ];

    // ── ⑤ Manifest-level flags ────────────────────────────────────────────
    if (!manifest.$) manifest.$ = {};

    // Allow install to SD card — critical for low-storage budget phones
    manifest.$["android:installLocation"] = "auto";

    // Strip maxSdkVersion if somehow injected — it caps the upper Android
    // version and prevents upgrades from seeing the app
    delete manifest.$["android:maxSdkVersion"];

    // ── ⑥ Application-level flags ─────────────────────────────────────────
    if (!manifest.application) manifest.application = [{}];
    const application = manifest.application[0];
    if (!application.$) application.$ = {};

    // Libs stay compressed in APK — no second extracted copy on disk (~15 MB)
    application.$["android:extractNativeLibs"]  = "false";

    // Every screen size and window mode is supported
    application.$["android:resizeableActivity"] = "true";

    // Ensure app is NOT restricted to specific form factors
    // (some Expo versions inject this incorrectly)
    delete application.$["android:banner"];

    return cfg;
  });
}

module.exports = withAndroidDeviceCompat;
