const globals = require('globals');
const reactPlugin = require('eslint-plugin-react');
const js = require('@eslint/js');

module.exports = [
  js.configs.recommended,
  reactPlugin.configs.flat.recommended,
  {
    settings: {
      react: {
        version: 'detect',
      },
    },
  },
  {
    files: ['**/*.js', '**/*.jsx', '**/*.mjs', '**/*.cjs'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.node,
        ...globals.es2021,
        vi: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        describe: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
    rules: {
      'react/prop-types': 'off',
    },
  },
  {
    ignores: ['**/node_modules/**', '**/build/**', '**/dist/**', 'public/**', 'coverage/**', '**/*.min.js', '**/*.css', '**/*.svg']
  }
];
