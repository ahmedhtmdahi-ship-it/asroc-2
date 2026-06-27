import js from "@eslint/js";
import tseslint from "typescript-eslint";
import reactHooks from "eslint-plugin-react-hooks";

export default tseslint.config(
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    plugins: {
      "react-hooks": reactHooks,
    },
    rules: {
      // Catch stale closure bugs in hooks
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",

      // No silent any — use unknown + type guards instead
      "@typescript-eslint/no-explicit-any": "error",

      // Allow empty catch blocks (used intentionally in stores)
      "@typescript-eslint/no-empty-function": "off",

      // Allow unused vars prefixed with _ (e.g. _event)
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],

      // No console in production code — use src/app/lib/logger.ts
      "no-console": "error",
    },
  },
  {
    ignores: ["dist/", "node_modules/", "scripts/"],
  },
);
