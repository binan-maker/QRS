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

config.transformer = {
  ...config.transformer,
  transformIgnorePatterns: [
    `node_modules/(?!(${TRANSFORM_PACKAGES.join("|")})/)`
  ],
  // ── inlineRequires ───────────────────────────────────────────────────────
  // Defers all require() calls to the moment each module is first accessed.
  // Modules imported but never reached on a given screen are never evaluated,
  // reducing startup cost and effective bundle weight.
  getTransformOptions: async () => ({
    transform: {
      inlineRequires: true,
    },
  }),
};

// ── Server-only package stubs ────────────────────────────────────────────────
// These packages are only used by server/. If they are ever accidentally
// reachable from mobile code, Metro would try to bundle them — pulling in
// Node.js built-ins (fs, net, child_process, …) that crash at runtime.
// We stub them all to empty objects so any accidental import is a no-op.
//
// We use resolveRequest (not extraNodeModules) because these packages ARE
// installed in node_modules, so extraNodeModules is never consulted.
const SERVER_ONLY_STUB = path.resolve(__dirname, "lib/db/providers/firebase-admin-stub.js");
const PG_STUB         = path.resolve(__dirname, "lib/db/providers/pg-stub.js");

const SERVER_ONLY_PACKAGES = {
  // Database / server infrastructure
  "firebase-admin":        SERVER_ONLY_STUB,
  pg:                      PG_STUB,
  "drizzle-orm":           SERVER_ONLY_STUB,
  "drizzle-zod":           SERVER_ONLY_STUB,
  // HTTP server
  express:                 SERVER_ONLY_STUB,
  // Proxy
  "http-proxy":            SERVER_ONLY_STUB,
  "http-proxy-middleware": SERVER_ONLY_STUB,
  // Payment / external APIs (server-side only)
  razorpay:                SERVER_ONLY_STUB,
  // Build tools
  esbuild:                 SERVER_ONLY_STUB,
  // Image processing (server-side only)
  jimp:                    SERVER_ONLY_STUB,
  // QR decoding (server-side only — mobile uses expo-camera native)
  jsqr:                    SERVER_ONLY_STUB,
  // WebSocket server
  ws:                      SERVER_ONLY_STUB,
  // Source maps (build tool)
  "source-map":            SERVER_ONLY_STUB,
  // BCrypt (server-side hashing — mobile uses expo-crypto)
  bcryptjs:                SERVER_ONLY_STUB,
  // OpenAI (called server-side only via Express route)
  openai:                  SERVER_ONLY_STUB,
};

config.resolver = {
  ...config.resolver,
  blockList: [
    /\.local\/.*/,
  ],
  resolveRequest(context, moduleName, platform) {
    if (SERVER_ONLY_PACKAGES[moduleName]) {
      return { type: "sourceFile", filePath: SERVER_ONLY_PACKAGES[moduleName] };
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
