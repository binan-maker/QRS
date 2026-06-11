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
 * IMPORTANT — android.hardware.type.* features:
 *   Google Play REJECTS any AAB that declares a android.hardware.type.* feature
 *   with required="false".  These features are form-factor identifiers (watch,
 *   TV, Auto, PC) — you must either set required="true" (claiming the app IS
 *   for that form factor) or omit the entry entirely.  BinRo is a phone/tablet
 *   app, so ALL android.hardware.type.* entries are stripped from the manifest.
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
 *   ⑩ Strips ALL android.hardware.type.* entries (Play Store policy)
 */

const { withAndroidManifest } = require("@expo/config-plugins");

// ── Hardware features ─────────────────────────────────────────────────────────
// NOTE: android.hardware.type.* entries are intentionally NOT listed here.
// Google Play rejects any AAB that sets required="false" on a type feature.
// They are stripped in the manifest transform step below.
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
  // OpenGL
  "android.hardware.opengles.aep",
  // RAM (low-RAM devices)
  "android.hardware.ram.low",
  "android.hardware.ram.normal",
  // VR hardware
  "android.hardware.vr.high_performance",
  "android.hardware.vr.headtracking",
  // Vulkan
  "android.hardware.vulkan.level",
  "android.hardware.vulkan.version",
  "android.hardware.vulkan.compute",
];

// ── Software features ─────────────────────────────────────────────────────────
// These are the most commonly MISSING from other compatibility fixes.
// Each one covers a distinct device category in the Play Store catalog.
const SOFTWARE_FEATURES = [
  // Android TV / Fire TV / Shield TV / Chromecast with Google TV
  "android.software.leanback",
  "android.software.live_tv",
  "android.software.live_wallpaper",
  // Android Auto / Automotive OS
  "android.software.car.templates_host",
  // Chrome OS / Desktop
  "android.software.chromeos_desktop",
  // Home screen / launcher
  "android.software.home_screen",
  // VR
  "android.software.vr.mode",
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
];

// ── Amazon Fire OS features ───────────────────────────────────────────────────
// Amazon devices (Fire tablets, Fire TV) use their own feature namespace.
const AMAZON_FEATURES = [
  "amazon.hardware.fire_tv",
  "amazon.software.drm",
];

const ALL_FEATURES = [...HARDWARE_FEATURES, ...SOFTWARE_FEATURES, ...AMAZON_FEATURES];

// ── Features that must NEVER appear in the manifest (Play Store policy) ───────
// Google Play rejects any AAB where an android.hardware.type.* OR
// android.software.leanback_only entry has required="false".
// These must be stripped entirely — not set to required="false".
const TYPE_FEATURE_PREFIXES = [
  "android.hardware.type.",   // watch, television, automotive, embedded, pc
];
const BANNED_FEATURES = [
  "android.software.leanback_only",  // implies TV-only; cannot be optional
];

function isStrippedFeature(name) {
  if (!name) return false;
  if (BANNED_FEATURES.includes(name)) return true;
  return TYPE_FEATURE_PREFIXES.some((prefix) => name.startsWith(prefix));
}

function withAndroidDeviceCompat(config) {
  return withAndroidManifest(config, (cfg) => {
    const manifest = cfg.modResults.manifest;

    // ── ① Strip all android.hardware.type.* and banned software features ────
    // Must happen BEFORE we process the list so we never re-add them.
    const existingFeatures = (manifest["uses-feature"] || []).filter(
      (f) => !isStrippedFeature(f.$?.["android:name"])
    );

    const existingNames = new Set(
      existingFeatures.map((f) => f.$?.["android:name"]).filter(Boolean)
    );

    // ── ② Force every remaining existing entry to required=false ────────────
    const updatedFeatures = existingFeatures.map((f) => ({
      ...f,
      $: { ...f.$, "android:required": "false" },
    }));

    // ── ③ Add every feature in our allow-list that isn't already declared ────
    for (const featureName of ALL_FEATURES) {
      if (!existingNames.has(featureName)) {
        updatedFeatures.push({
          $: { "android:name": featureName, "android:required": "false" },
        });
      }
    }

    manifest["uses-feature"] = updatedFeatures;

    // ── ④ Strip gl-es-version restriction (blocks older GPUs) ───────────────
    manifest["uses-feature"] = manifest["uses-feature"].filter(
      (f) => !f.$?.["android:glEsVersion"]
    );

    // ── ⑤ Strip <compatible-screens> (acts as an install whitelist) ─────────
    delete manifest["compatible-screens"];

    // ── ⑥ supports-screens: every size ─────────────────────────────────────
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

    // ── ⑦ Manifest-level flags ───────────────────────────────────────────────
    if (!manifest.$) manifest.$ = {};

    manifest.$["android:installLocation"] = "auto";
    delete manifest.$["android:maxSdkVersion"];

    // ── ⑧ Application-level flags ────────────────────────────────────────────
    if (!manifest.application) manifest.application = [{}];
    const application = manifest.application[0];
    if (!application.$) application.$ = {};

    application.$["android:extractNativeLibs"]  = "false";
    application.$["android:resizeableActivity"] = "true";
    delete application.$["android:banner"];

    return cfg;
  });
}

module.exports = withAndroidDeviceCompat;
