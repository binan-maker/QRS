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

// ── Package stubs ────────────────────────────────────────────────────────────
// Two categories of packages are stubbed to zero here:
//
// A) SERVER-ONLY: packages that live in server/ and must never be bundled
//    into the mobile app (they pull in Node.js built-ins that crash Hermes).
//
// B) DEAD WEIGHT: packages installed but never imported in mobile code.
//    Confirmed via full-codebase grep — zero mobile imports found.
//    They sit in node_modules and Metro would include them if any transitive
//    import ever reached them.  Stubbing them to {} is a safety net.
//
// All stubs resolve to the same empty-module file.
// We use resolveRequest (not extraNodeModules) because these packages ARE
// installed in node_modules, so extraNodeModules is never consulted.

const EMPTY_STUB = path.resolve(__dirname, "lib/db/providers/firebase-admin-stub.js");
const PG_STUB    = path.resolve(__dirname, "lib/db/providers/pg-stub.js");

const STUBBED_PACKAGES = {
  // ── Server-only (Node.js internals / server infrastructure) ───────────────
  "firebase-admin":         EMPTY_STUB,
  pg:                       PG_STUB,
  "drizzle-orm":            EMPTY_STUB,
  "drizzle-zod":            EMPTY_STUB,
  "drizzle-kit":            EMPTY_STUB,
  express:                  EMPTY_STUB,
  "http-proxy":             EMPTY_STUB,
  "http-proxy-middleware":  EMPTY_STUB,
  razorpay:                 EMPTY_STUB,
  jimp:                     EMPTY_STUB,   // server-side image processing
  jsqr:                     EMPTY_STUB,   // server-side QR decoding
  ws:                       EMPTY_STUB,   // WebSocket server
  "source-map":             EMPTY_STUB,   // build tool
  bcryptjs:                 EMPTY_STUB,   // server-side hashing
  openai:                   EMPTY_STUB,   // called server-side via Express
  esbuild:                  EMPTY_STUB,   // build tool
  "firebase-tools":         EMPTY_STUB,   // CLI tool, never in mobile
  // ── Server utility packages (only imported in server/ batch utils) ─────────
  semver:                   EMPTY_STUB,
  "p-limit":                EMPTY_STUB,
  "p-retry":                EMPTY_STUB,
  "zod-validation-error":   EMPTY_STUB,
  "@ungap/structured-clone":          EMPTY_STUB,
  "@stardazed/streams-text-encoding": EMPTY_STUB,
  "@urql/core":             EMPTY_STUB,
  // ── Unused Firebase JS sub-modules (safety net against accidental inclusion)
  // The app uses: firebase/app, auth, firestore, database, storage, app-check.
  // Analytics, Performance, Messaging, Remote Config are NOT used.
  "firebase/analytics":        EMPTY_STUB,
  "firebase/performance":      EMPTY_STUB,
  "firebase/messaging":        EMPTY_STUB,
  "firebase/remote-config":    EMPTY_STUB,
  "firebase/installations":    EMPTY_STUB,
  "firebase/in-app-messaging": EMPTY_STUB,
  "@firebase/analytics":        EMPTY_STUB,
  "@firebase/performance":      EMPTY_STUB,
  "@firebase/remote-config":    EMPTY_STUB,
  "@firebase/installations":    EMPTY_STUB,
  "@firebase/in-app-messaging": EMPTY_STUB,
  // ── Dead-weight JS packages (zero imports in mobile codebase) ─────────────
  // lucide-react-native: 11 MB installed, not imported anywhere in app code.
  "lucide-react-native":    EMPTY_STUB,
  // react-dom: 6.4 MB, web-only renderer, never used in React Native.
  "react-dom":              EMPTY_STUB,
};

config.resolver = {
  ...config.resolver,
  blockList: [
    /\.local\/.*/,
  ],
  resolveRequest(context, moduleName, platform) {
    if (STUBBED_PACKAGES[moduleName]) {
      return { type: "sourceFile", filePath: STUBBED_PACKAGES[moduleName] };
    }
    return context.resolveRequest(context, moduleName, platform);
  },
};

module.exports = config;
