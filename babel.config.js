module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    plugins: [
      // Downcompile ES2022 private class fields/methods (#field, #method) to
      // ES5-compatible output. Both react-native-reanimated and
      // react-native-keyboard-controller ship their "react-native" entry
      // pointing at TypeScript source (src/index), which contains # private
      // syntax. Older Hermes builds throw "private properties are not
      // supported" without these transforms. loose:true must match across
      // both plugins to avoid the "inconsistent loose mode" Babel error.
      ["@babel/plugin-transform-class-properties", { loose: true }],
      ["@babel/plugin-transform-private-methods", { loose: true }],
      // Reanimated plugin must always be last
      "react-native-reanimated/plugin",
    ],
  };
};
