/** @type {import("eslint").Linter.Config[]} */
module.exports = [
  {
    rules: {
      // ── Import hygiene ─────────────────────────────────────────────────────
      "no-restricted-imports": [
        "error",
        {
          // Prevent deep imports from packages that expose a barrel index.
          // Consumers must import from the package root, e.g. "@binro/core",
          // not from internal paths like "@binro/core/src/types/qr".
          patterns: [
            {
              group: ["@binro/core/src/*"],
              message: "Import from \"@binro/core\" instead of deep-linking into src/.",
            },
            {
              group: ["@binro/db/src/*"],
              message: "Import from \"@binro/db\" instead of deep-linking into src/.",
            },
            {
              group: ["@binro/config/src/*"],
              message: "Import from \"@binro/config\" instead of deep-linking into src/.",
            },
            {
              group: ["@binro/ui/src/*"],
              message: "Import from \"@binro/ui\" or \"@binro/ui/tokens\" instead of deep-linking into src/.",
            },
          ],
        },
      ],

      // ── Code quality ───────────────────────────────────────────────────────
      "no-console": ["warn", { allow: ["warn", "error", "info"] }],
      "no-unused-vars": "off", // Handled by TypeScript
      "prefer-const": "error",
      "no-var": "error",
      eqeqeq: ["error", "always"],

      // ── TypeScript complementary ───────────────────────────────────────────
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/consistent-type-imports": [
        "error",
        { prefer: "type-imports" },
      ],
    },
  },
];
