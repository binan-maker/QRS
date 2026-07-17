/** @type {import("eslint").Linter.Config[]} */
module.exports = [
  {
    rules: {
      // ── Import hygiene ─────────────────────────────────────────────────────
      "no-restricted-imports": [
        "error",
        {
          // Prevent deep imports from packages that have a barrel index
          patterns: [],
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
