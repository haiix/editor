import { defineConfig } from 'eslint/config';
import eslintConfigPrettier from 'eslint-config-prettier';
import globals from 'globals';
import js from '@eslint/js';

export default defineConfig([
  { ignores: ['dist/**', 'eslint.config.js'] },
  {
    files: ['**/*.{js,mjs,cjs}'],
    plugins: { js },
    extends: ['js/all'],
  },
  {
    files: ['**/*.{js,mjs,cjs}'],
    languageOptions: { globals: globals.browser },
  },
  {
    // See: https://eslint.org/docs/latest/rules/
    rules: {
      'capitalized-comments': 'off',
      'class-methods-use-this': 'off',
      eqeqeq: ['error', 'smart'],
      'func-style': [
        'error',
        'declaration',
        {
          allowArrowFunctions: true,
        },
      ],
      //"id-length": ["warn", { properties: "never" }],
      'id-length': 'off',
      'init-declarations': 'off', // Conflicts with no-useless-assignment
      'max-classes-per-file': 'off',
      'max-lines': 'off',
      'max-params': ['error', 5],
      //'max-statements': ['error', 30],

      'max-lines-per-function': 'off', // Temporarily disabled
      'max-statements': 'off', // Temporarily disabled

      'no-await-in-loop': 'warn',
      'no-bitwise': 'warn',
      'no-console': ['error', { allow: ['warn', 'error'] }],
      'no-continue': 'off',
      'no-eq-null': 'off', // Conflicts with eqeqeq:smart
      'no-inline-comments': 'off',
      //"no-magic-numbers": ["warn", { ignore: [0, 1] }],
      'no-magic-numbers': 'off',
      'no-plusplus': [
        'warn',
        {
          allowForLoopAfterthoughts: true,
        },
      ],
      'no-shadow': [
        'error',
        {
          ignoreOnInitialization: true,
        },
      ],
      'no-ternary': 'off', // no-nested-ternary is still enabled
      'no-use-before-define': 'off', // Should use @typescript-eslint/no-use-before-define
      'no-warning-comments': 'warn',
      'one-var': ['error', 'never'],
      'prefer-destructuring': 'off',
      'prefer-named-capture-group': 'off',
      radix: ['error', 'as-needed'],
      'sort-keys': 'off',
      'sort-vars': 'off',

      //"@typescript-eslint/no-use-before-define": "warn",
      '@typescript-eslint/no-non-null-assertion': 'off', // Conflicts with @typescript-eslint/non-nullable-type-assertion-style
      '@typescript-eslint/prefer-promise-reject-errors': 'off', // Duplicate @typescript-eslint/only-throw-error
      '@typescript-eslint/restrict-template-expressions': [
        'error',
        {
          allowAny: false,
          allowBoolean: false,
          allowNever: false,
          allowNullish: false,
          allowNumber: true,
          allowRegExp: false,
        },
      ],
    },
  },
  eslintConfigPrettier,
]);
