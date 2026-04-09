import js from "@eslint/js";
import globals from "globals";

export default [
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      "unpacked/**",
      "patch-notes/**",
      "manifests/**",
      "mtb-reserve-full-directory.zip",
      "package-lock.json"
    ]
  },
  {
    files: ["app/**/*.js", "lib/**/*.js", "scripts/**/*.mjs", "test/**/*.js"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parserOptions: {
        ecmaFeatures: {
          jsx: true
        }
      },
      globals: {
        ...globals.browser,
        ...globals.node
      }
    },
    rules: {
      ...js.configs.recommended.rules,
      "no-console": "off"
    }
  }
];
