import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import vue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";

export default [
  {
    ignores: [
      "dist/**",
      "out/**",
      "node_modules/**",
      ".tmp-sdk/**",
      ".tmp-vsix/**",
      ".tmp-package/**",
      ".vscode-test/**",
      ".vscode-test-ui/**",
      "test-resources/**",
      "vendor/**",
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  ...vue.configs["flat/recommended"],
  {
    files: ["**/*.{ts,mjs,js}"],
    languageOptions: {
      globals: { ...globals.node },
    },
    rules: {
      "@typescript-eslint/no-unused-vars": [
        "error",
        { argsIgnorePattern: "^_", varsIgnorePattern: "^_" },
      ],
      "@typescript-eslint/no-explicit-any": "error",
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["webview/**/*.{ts,vue}"],
    languageOptions: {
      parser: vueParser,
      parserOptions: {
        parser: tseslint.parser,
        extraFileExtensions: [".vue"],
        sourceType: "module",
      },
      globals: { ...globals.browser },
    },
    rules: {
      "vue/multi-word-component-names": "off",
      "vue/max-attributes-per-line": "off",
      "vue/singleline-html-element-content-newline": "off",
      "vue/html-self-closing": "off",
      "no-console": ["error", { allow: ["warn", "error"] }],
    },
  },
  {
    files: ["test/**/*.ts", "test/**/*.mjs", "scripts/**/*.mjs", ".github/scripts/**/*.mjs"],
    rules: {
      "no-console": "off",
    },
  },
];
