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