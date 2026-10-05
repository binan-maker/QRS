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
            "@validators": "./validators",
            "@binro/core": "./packages/core/src",
            "@binro/db": "./packages/db/src",
            "@binro/config": "./packages/config/src",
          },
          extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
        },
      ],
      [
        "@babel/plugin-transform-class-properties",
        {
          loose: false,
        },
      ],

      [
        "@babel/plugin-transform-private-methods",
        {
          loose: false,
        },
      ],

      [
        "@babel/plugin-transform-private-property-in-object",
        {
          loose: false,
        },
      ],

      // MUST stay last
      "react-native-reanimated/plugin",
    ],
  };
};