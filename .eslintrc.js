module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    sourceType: "module",
  },
  plugins: ["@typescript-eslint", "astro"],
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:astro/recommended",
  ],
  env: {
    es2020: true, // これを追加
    node: true,
  },
  rules: {
    "@typescript-eslint/ban-ts-comment": "allow",
  },
};

// module.exports = {
//   rules: {
//     "no-console": ["error", { allow: ["error"] }],
//     "react/display-name": "off",
//     "react-hooks/rules-of-hooks": "off",
//     "@typescript-eslint/no-use-before-define": "off",
//   },
//   overrides: [
//     {
//       files: ["*.astro"],
//       parser: "astro-eslint-parser",
//       parserOptions: {
//         parser: "@typescript-eslint/parser",
//         extraFileExtensions: [".astro"],
//       },
//       rules: {
//         "no-mixed-spaces-and-tabs": ["error", "smart-tabs"],
//       },
//     },
//     {
//       // Define the configuration for `<script>` tag.
//       // Script in `<script>` is assigned a virtual file name with the `.js` extension.
//       files: ["**/*.astro/*.js", "*.astro/*.js"],
//       parser: "@typescript-eslint/parser",
//     },
//   ],
//   parserOptions: {
//     sourceType: "module",
//     ecmaVersion: 2015,
//   },
// };
