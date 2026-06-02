module.exports = function (api) {
  api.cache(true);
  return {
    presets: [["babel-preset-expo", { unstable_transformImportMeta: true }]],
    plugins: [
      // ─── DO NOT add @babel/plugin-transform-class-properties or
      //     @babel/plugin-transform-private-methods here ────────────────────
      //
      // Expo SDK 54 / React Native 0.74 / Hermes supports private class
      // fields (#field, #method) natively — no downcompile needed.
      //
      // Adding those plugins (especially with loose:true) converts
      //   export class Foo { #field }
      // into a class EXPRESSION whose name binding is scoped only inside
      // the class body.  Any code after the class — `export default Foo`,
      // `setPlatformObject(Foo)` — then falls through to a GLOBAL LOOKUP
      // in Hermes and throws:
      //   [runtime not ready]: ReferenceError: Property 'Foo' doesn't exist
      // This cascades into dozens of errors across all RN 0.74+ webapi
      // modules (DOMException, PerformanceEntry, MessageQueue, …).
      //
      // babel-preset-expo already includes the correct class transform
      // pipeline via metro-react-native-babel-preset.  Do not duplicate it.
      //
      // Reanimated plugin must always be last.
      "react-native-reanimated/plugin",
    ],
  };
};
