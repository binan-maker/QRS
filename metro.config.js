const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.watchFolders = [__dirname];

// ── Transform ignore patterns ────────────────────────────────────────────────
// Metro skips Babel for node_modules by default. We must explicitly list every
// package that ships TypeScript/ESNext source (react-native field → src/) so
// Babel runs on them and downcompiles ES2022 private class fields (#field,
// this.#x) before they reach Hermes. Without this, older Hermes builds throw:
//   [runtime not ready]: SyntaxError: private properties are not supported
//
// Confirmed packages with # private class fields in their src/:
//   • react-native-reanimated  (NativeEventsManager, NativeReanimated, etc.)
//   • react-native-keyboard-controller  (useSmoothKeyboardHandler, etc.)
//
// The remaining entries below are standard RN-ecosystem packages that ship
// source and are already expected by the React Native community transform list.
const TRANSFORM_PACKAGES = [
  "react-native",
  "@react-native",
  "@react-native-community",
  "@react-native-google-signin",
  "@react-native-async-storage",
  "expo",
  "@expo",
  "@expo-google-fonts",
  "@unimodules",
  "unimodules",
  "react-navigation",
  "@react-navigation",
  "react-native-reanimated",
  "react-native-keyboard-controller",
  "react-native-gesture-handler",
  "react-native-safe-area-context",
  "react-native-screens",
  "react-native-svg",
  "react-native-iap",
  "react-native-qrcode-svg",
  "react-native-worklets",
  "@shopify",
  "@gorhom",
  "sentry-expo",
  "native-base",
];

// Pattern: ignore everything in node_modules EXCEPT the listed packages.
// Files NOT matched by this pattern are transformed by Babel.
config.transformer = {
  ...config.transformer,
  transformIgnorePatterns: [
    `node_modules/(?!(${TRANSFORM_PACKAGES.join("|")})/)`
  ],
};

config.resolver = {
  ...config.resolver,
  blockList: [
    /\.local\/.*/,
  ],
  // Stub out the `pg` (node-postgres) package for React Native.
  // The real `pg` relies on Node.js built-ins (net, tls, dns, fs) that do not
  // exist in the React Native runtime. Since DB_PROVIDER is always "firebase"
  // in the mobile app, the postgres provider is never executed at runtime, but
  // Metro still tries to bundle it. The stub satisfies the import without
  // pulling in any Node.js-specific code.
  extraNodeModules: {
    ...config.resolver?.extraNodeModules,
    pg: path.resolve(__dirname, "lib/db/providers/pg-stub.js"),
  },
};

module.exports = config;
