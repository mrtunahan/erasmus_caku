// ESLint 9 flat config. Gevşek: amaç çalışmayı bozacak hataları yakalamak,
// stil Prettier'a bırakılmıştır. Mevcut JSX modülleri window globals
// kullandığı için browser env + bilinen global'ler eklenmiştir.

import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'build/**',
      'coverage/**',
      'server/node_modules/**',
      'server/uploads/**',
      'public/**',
      '**/*.min.js',
    ],
  },

  js.configs.recommended,

  // Frontend (browser + React, classic runtime → React global)
  {
    files: ['*.jsx', '**/*.jsx', 'main.jsx'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
      globals: {
        ...globals.browser,
        React: 'readonly',
        ReactDOM: 'readonly',
        Quill: 'readonly',
        DOMPurify: 'readonly',
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-constant-condition': ['warn', { checkLoops: false }],
      'no-prototype-builtins': 'off',
      'no-undef': 'warn',
      'no-useless-escape': 'warn',
      'no-irregular-whitespace': 'warn',
      'no-misleading-character-class': 'warn',
    },
  },

  // Server (Node + CommonJS)
  {
    files: ['server/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': [
        'warn',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      'no-empty': ['warn', { allowEmptyCatch: true }],
    },
  },

  // CJS root configs
  {
    files: ['*.cjs', '*.config.js', 'postcss.config.cjs', 'design-tokens.cjs', 'tailwind.config.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'commonjs',
      globals: { ...globals.node },
    },
  },

  // Test dosyaları
  {
    files: ['tests/**/*.{js,jsx}', '**/*.test.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
  },
];
