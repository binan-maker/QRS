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

// ── Node.js-only package stubs ───────────────────────────────────────────────
// These packages rely on Node.js built-ins (fs, net, tls, etc.) that don't
// exist in the React Native / Hermes runtime. Metro bundles every reachable
// import, so we redirect them to empty stubs at resolve-time.
//
// We use resolveRequest (not extraNodeModules) because extraNodeModules is only
// consulted when the module is NOT found in node_modules. Since these packages
// ARE installed, we must intercept resolution explicitly.
const NODE_ONLY_STUBS = {
  "firebase-admin": path.resolve(__dirname, "lib/db/providers/firebase-admin-stub.js"),
  pg: path.resolve(__dirname, "lib/db/providers/pg-stub.js"),
};

config.resolver = {
  ...config.resolver,
  blockList: [
    /\.local\/.*/,
  ],
  resolveRequest(context, moduleName, platform) {
    if (NODE_ONLY_STUBS[moduleName]) {
      return { type: "sourceFile", filePath: NODE_ONLY_STUBS[moduleName] };
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
