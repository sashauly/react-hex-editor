import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import tseslint from "typescript-eslint";
import hooks from "eslint-plugin-react-hooks";
import globals from "globals";

export default defineConfig(
  {
    ignores: [
      "dist/**",
      "themes/**",
      "site-dist/**",
      "artifacts/**",
      "playwright-report/**",
      "test-results/**",
      ".agents/**",
      ".codebase-index/**",
      ".compat/**",
      ".integration/**",
    ],
  },
  {
    files: ["**/*.{js,mjs,jsx,ts,tsx}"],
    extends: [js.configs.recommended, tseslint.configs.recommended],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
      parserOptions: { ecmaFeatures: { jsx: true } },
    },
  },
  { files: ["**/*.{jsx,tsx}"], extends: [hooks.configs.flat.recommended] },
);
