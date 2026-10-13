module.exports = function (api) {
  api.cache(true);

  return {
    presets: [
      [
        "babel-preset-expo",
        {
          unstable_transformImportMeta: true,
        },
      ],
    ],

    plugins: [
      [
        "module-resolver",
        {
          root: ["./"],
          alias: {
            "@": "./",
            "@config": "./config",
            "@shared": "./shared",
            "@services": "./services",
            "@features": "./features",
            "@lib": "./lib",
            "@store": "./store",
            "@binro/core": "./packages/core/src",
            "@binro/db": "./packages/db/src",
            "@binro/config": "./packages/config/src",
          },
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
        },
      ],

      // MUST stay last
      "react-native-reanimated/plugin",
    ],
  };
};