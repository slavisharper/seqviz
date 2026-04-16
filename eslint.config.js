const { FlatCompat } = require("@eslint/eslintrc");
const js = require("@eslint/js");

const compat = new FlatCompat({
  baseDirectory: __dirname,
  recommendedConfig: js.configs.recommended,
});

module.exports = [
  js.configs.recommended,
  ...compat.extends("plugin:react/recommended", "plugin:@typescript-eslint/recommended"),
  {
    files: ["**/*.{ts,tsx,js,jsx}"],
    languageOptions: {
      ecmaVersion: "latest",
      sourceType: "module",
      parser: require("@typescript-eslint/parser"),
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react: require("eslint-plugin-react"),
      "@typescript-eslint": require("@typescript-eslint/eslint-plugin"),
      "sort-destructure-keys": require("eslint-plugin-sort-destructure-keys"),
      "sort-keys-fix": require("eslint-plugin-sort-keys-fix"),
      "react-hooks": require("eslint-plugin-react-hooks"),
    },
    rules: {
      "@typescript-eslint/ban-ts-comment": "warn",
      "@typescript-eslint/no-empty-function": "warn",
      "@typescript-eslint/no-explicit-any": "warn",
      "padding-line-between-statements": [
        "error",
        {
          blankLine: "always",
          prev: "*",
          next: ["class", "export", "function"],
        },
      ],
      "no-empty": "warn",
      "no-console": ["error", { allow: ["warn", "error"] }],
      "react/jsx-sort-props": "off",
      "react/prop-types": "off",
      "sort-destructure-keys/sort-destructure-keys": "off",
      "sort-keys-fix/sort-keys-fix": "off",
      "react-hooks/rules-of-hooks": "error",
      "react-hooks/exhaustive-deps": "warn",
      "react/no-unused-prop-types": "error",
    },
    settings: {
      react: {
        version: "detect",
      },
    },
  },
  {
    files: ["src/jest.js", "**/*.test.{ts,tsx,js,jsx}"],
    languageOptions: {
      globals: {
        jest: "readonly",
        require: "readonly",
      },
    },
    rules: {
      "@typescript-eslint/no-require-imports": "off",
    },
  },
];
