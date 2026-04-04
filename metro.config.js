const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const config = getDefaultConfig(__dirname);

config.watchFolders = [__dirname];

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
